import React, { useEffect, useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, Image, 
    TouchableOpacity, ActivityIndicator, RefreshControl, 
    TextInput, Alert, Modal, Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/theme';

export default function DoctorPatients() {
    const { user } = useAuth();
    const [patients, setPatients] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [notes, setNotes] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);
    const [patientPrescriptions, setPatientPrescriptions] = useState<any[]>([]);
    
    // Prescription State
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [medications, setMedications] = useState<any[]>([{ name: '', dosage: '', duration: '' }]);
    const [prescriptionNotes, setPrescriptionNotes] = useState('');
    const [submittingPrescription, setSubmittingPrescription] = useState(false);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const [apts, reqs] = await Promise.all([
                api.getAppointments({ doctor_id: user.id }),
                api.getDoctorHistoryRequests(user.id)
            ]);
            
            // Deduplicate patients from appointments
            const seen = new Set<string>();
            const uniquePatients = apts.filter((a: any) => {
                if (!a.patient_id || seen.has(a.patient_id)) return false;
                seen.add(a.patient_id);
                return true;
            }).map((a: any) => {
                const p = a.patient || {};
                return {
                    ...p,
                    id: p.id || a.patient_id,
                    name: p.name || 'مريض مجهول',
                    lastVisit: a.date,
                    appointmentId: a.id,
                    hasDirectAccess: a.record_access_granted
                };
            });

            setPatients(uniquePatients);
            setRequests(reqs);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, [user]);

    const getRequestStatus = (patientId: string) => {
        const req = requests.find(r => r.patient_id === patientId && r.status !== 'rejected');
        return req ? req.status : null;
    };

    const handleRequestAccess = async (patientId: string) => {
        try {
            await api.requestMedicalHistory(patientId, user!.id);
            Alert.alert('✅ تم', 'تم إرسال طلب الوصول إلى المريض بنجاح');
            loadData();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const loadNotes = async (patientId: string) => {
        try {
            const [nData, pData] = await Promise.all([
                api.getPatientNotes(user!.id, patientId),
                api.getPatientPrescriptions(patientId)
            ]);
            setNotes(nData);
            setPatientPrescriptions(pData);
        } catch (e) { console.warn(e); }
    };

    const handleSendPrescription = async () => {
        if (!selectedPatient || medications.every(m => !m.name)) {
            Alert.alert('تنبيه', 'يرجى إضافة دواء واحد على الأقل');
            return;
        }
        setSubmittingPrescription(true);
        try {
            await api.createPrescription({
                doctor_id: user!.id,
                patient_id: selectedPatient.id,
                medications: medications.filter(m => m.name.trim() !== ''),
                notes: prescriptionNotes
            });
            Alert.alert('✅ تم الارسال', 'تم إرسال الوصفة الطبية للمريض بنجاح');
            setShowPrescriptionModal(false);
            setMedications([{ name: '', dosage: '', duration: '' }]);
            setPrescriptionNotes('');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSubmittingPrescription(false);
        }
    };

    const addMedicationRow = () => {
        setMedications([...medications, { name: '', dosage: '', duration: '' }]);
    };

    const updateMedication = (index: number, field: string, value: string) => {
        const updated = [...medications];
        updated[index][field] = value;
        setMedications(updated);
    };

    const removeMedication = (index: number) => {
        if (medications.length > 1) {
            setMedications(medications.filter((_, i) => i !== index));
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setSubmittingNote(true);
        try {
            await api.addPatientNote(user!.id, selectedPatient.id, newNote);
            setNewNote('');
            loadNotes(selectedPatient.id);
            Alert.alert('✅ تم', 'تمت إضافة الملاحظة بنجاح');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSubmittingNote(false);
        }
    };

    const filteredPatients = patients.filter(p => 
        (p.name || '').toLowerCase().includes(search.toLowerCase())
    );

    const renderPatientCard = (p: any, idx: number) => {
        const status = getRequestStatus(p.id);
        const hasAccess = p.hasDirectAccess || status === 'approved';

        return (
            <Animated.View 
                key={p.id} 
                entering={FadeInUp.delay(idx * 100)}
                style={styles.card}
            >
                <View style={[styles.profileStrip, { backgroundColor: hasAccess ? '#F0FDF4' : '#F8FAFC' }]} />
                
                <View style={styles.cardHeader}>
                    <View style={styles.patientMain}>
                        <Text style={styles.patientName}>{p.name}</Text>
                        <Text style={styles.patientMeta}>🩸 {p.blood_type || '—'} | {p.city || 'دمشق'}</Text>
                    </View>

                    <TouchableOpacity 
                        style={styles.favBtn}
                        onPress={() => {
                            if (hasAccess) {
                                setSelectedPatient(p);
                                setShowHistory(true);
                            } else if (status === 'pending') {
                                Alert.alert('انتظار', 'طلب الوصول قيد المراجعة من قبل المريض');
                            } else {
                                handleRequestAccess(p.id);
                            }
                        }}
                    >
                        <Ionicons 
                            name={hasAccess ? "eye-outline" : status === 'pending' ? "hourglass-outline" : "lock-closed-outline"} 
                            size={20} 
                            color={hasAccess ? "#166534" : "#64748B"} 
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoVal}>{p.lastVisit}</Text>
                        <Text style={styles.infoLabel}>آخر زيارة</Text>
                    </View>
                    
                    {p.allergies?.length > 0 && (
                        <View style={styles.tagRow}>
                            {p.allergies.slice(0, 2).map((a: string) => (
                                <View key={a} style={styles.tag}>
                                    <Text style={styles.tagText}>{a}</Text>
                                </View>
                            ))}
                            <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" style={{marginLeft: 5}}/>
                        </View>
                    )}
                </View>

                <View style={styles.cardActionsRow}>
                    <TouchableOpacity 
                        style={[styles.actionBtnCompact, { backgroundColor: '#8B5CF6' }]}
                        onPress={() => {
                            setSelectedPatient(p);
                            setShowPrescriptionModal(true);
                        }}
                    >
                        <Text style={styles.actionBtnText}>وصفة طبية جديدة</Text>
                        <Ionicons name="document-text-outline" size={16} color="#FFF" style={{marginLeft: 8}}/>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.actionBtnCompact, 
                            { backgroundColor: hasAccess ? '#10B981' : status === 'pending' ? '#94A3B8' : '#0EA5E9' }
                        ]}
                        onPress={() => {
                            if (hasAccess) {
                                setSelectedPatient(p);
                                setShowHistory(true);
                            } else if (status !== 'pending') {
                                handleRequestAccess(p.id);
                            }
                        }}
                    >
                        <Text style={styles.actionBtnText}>
                            {hasAccess ? 'عرض السجل الطبي' : status === 'pending' ? 'بانتظار الموافقة' : 'طلب الوصول'}
                        </Text>
                        <Ionicons 
                            name={hasAccess ? "medical" : "shield-checkmark"} 
                            size={16} 
                            color="#FFF" 
                            style={{marginLeft: 8}}
                        />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>إدارة المرضى</Text>
                <View style={styles.searchBox}>
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="ابحث عن مريض..."
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                        textAlign="right"
                    />
                    <Ionicons name="search" size={20} color="#94A3B8" />
                </View>
            </View>

            <ScrollView 
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            >
                {loading ? (
                    <ActivityIndicator color="#0EA5E9" style={{ marginTop: 40 }} size="large" />
                ) : filteredPatients.length === 0 ? (
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="account-search-outline" size={60} color="#E2E8F0" />
                        <Text style={styles.emptyText}>لم نجد أي مرضى حالياً</Text>
                    </View>
                ) : (
                    filteredPatients.map((p, idx) => renderPatientCard(p, idx))
                )}
            </ScrollView>

            {/* Simple History Modal (Placeholder for next feature) */}
            <Modal 
                visible={showHistory} 
                animationType="slide" 
                transparent={false}
                onShow={() => { if (selectedPatient) loadNotes(selectedPatient.id); }}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowHistory(false)}>
                            <Ionicons name="close" size={28} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>السجل والملاحظات</Text>
                    </View>
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        <View style={styles.patientHero}>
                            <View style={[styles.heroAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }]}>
                                <Ionicons name="person" size={50} color="#CBD5E1" />
                            </View>
                            <Text style={styles.patientNameLarge}>{selectedPatient?.name}</Text>
                            <Text style={styles.heroMeta}>{selectedPatient?.blood_type} | {selectedPatient?.city}</Text>
                        </View>

                        <View style={styles.noteInputSection}>
                            <Text style={styles.sectionTitle}>إضافة ملاحظة طبية</Text>
                            <TextInput
                                style={styles.noteInput}
                                placeholder="اكتب ملاحظات الزيارة هنا..."
                                multiline
                                textAlignVertical="top"
                                value={newNote}
                                onChangeText={setNewNote}
                                textAlign="right"
                            />
                            <TouchableOpacity 
                                style={[styles.submitNoteBtn, { opacity: submittingNote ? 0.7 : 1 }]}
                                onPress={handleAddNote}
                                disabled={submittingNote}
                            >
                                {submittingNote ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Text style={styles.submitNoteTxt}>حفظ الملاحظة</Text>
                                        <Ionicons name="save-outline" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.notesList}>
                            <Text style={styles.sectionTitle}>ملاحظات سابقة</Text>
                            {notes.length === 0 ? (
                                <Text style={styles.noNotes}>لا توجد ملاحظات مسجلة بعد</Text>
                            ) : (
                                notes.map((n, idx) => (
                                    <View key={idx} style={styles.noteCard}>
                                        <View style={styles.noteHeader}>
                                            <Text style={styles.noteDate}>{new Date(n.created_at).toLocaleDateString('ar-SY')}</Text>
                                            <Ionicons name="calendar-outline" size={12} color="#94A3B8" />
                                        </View>
                                        <Text style={styles.noteText}>{n.note_text}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                        
                        <View style={styles.historySection}>
                            <Text style={styles.sectionTitle}>الوصفات الطبية السابقة</Text>
                            {patientPrescriptions.length === 0 ? (
                                <Text style={styles.noNotes}>لا توجد وصفات طبية سابقة</Text>
                            ) : (
                                patientPrescriptions.map((p, pIdx) => (
                                    <View key={pIdx} style={styles.realPrescCard}>
                                        <View style={styles.prescHeaderRow}>
                                            <Text style={styles.prescDateText}>{new Date(p.created_at).toLocaleDateString('ar-SY')}</Text>
                                            <Text style={styles.prescDocLabel}>بواسطة: د. {p.doctor?.name || 'مجهول'}</Text>
                                        </View>
                                        <View style={styles.prescMedList}>
                                            {p.medications.map((m: any, mIdx: number) => (
                                                <View key={mIdx} style={styles.medItem}>
                                                    <Ionicons name="medical-outline" size={14} color="#5D5FEF" />
                                                    <Text style={styles.medNameText}>{m.name} ({m.dosage}) - {m.duration}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        {p.notes ? <Text style={styles.prescNoteText}>{p.notes}</Text> : null}
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Prescription Modal */}
            <Modal 
                visible={showPrescriptionModal} 
                animationType="fade" 
                transparent={true}
            >
                <View style={styles.overlay}>
                    <View style={styles.prescModalContent}>
                        <View style={styles.prescHeader}>
                            <TouchableOpacity onPress={() => setShowPrescriptionModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                            <Text style={styles.prescTitle}>إصدار وصفة طبية</Text>
                        </View>

                        <ScrollView style={styles.prescBody} showsVerticalScrollIndicator={false}>
                            <View style={styles.prescPatientInfo}>
                                <Text style={styles.prescPatientLabel}>إلى المريض:</Text>
                                <Text style={styles.prescPatientName}>{selectedPatient?.name}</Text>
                            </View>

                            <Text style={styles.prescSectionTitle}>الأدوية والجرعات</Text>
                            {medications.map((m, idx) => (
                                <View key={idx} style={styles.medicationRow}>
                                    <View style={styles.medRowTop}>
                                        <Text style={styles.medIdx}>دواء {idx + 1}</Text>
                                        <TouchableOpacity onPress={() => removeMedication(idx)}>
                                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    </View>
                                    <TextInput
                                        style={styles.medInput}
                                        placeholder="اسم الدواء..."
                                        value={m.name}
                                        onChangeText={(v) => updateMedication(idx, 'name', v)}
                                        textAlign="right"
                                    />
                                    <View style={styles.medSubInputs}>
                                        <TextInput
                                            style={[styles.medInput, { flex: 1 }]}
                                            placeholder="المدة (مثلاً: أسبوع)"
                                            value={m.duration}
                                            onChangeText={(v) => updateMedication(idx, 'duration', v)}
                                            textAlign="right"
                                        />
                                        <TextInput
                                            style={[styles.medInput, { flex: 1, marginRight: 10 }]}
                                            placeholder="الجرعة (مثلاً: مرة يومياً)"
                                            value={m.dosage}
                                            onChangeText={(v) => updateMedication(idx, 'dosage', v)}
                                            textAlign="right"
                                        />
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity style={styles.addMedBtn} onPress={addMedicationRow}>
                                <Text style={styles.addMedText}>إضافة دواء آخـر</Text>
                                <Ionicons name="add-circle-outline" size={20} color="#5D5FEF" />
                            </TouchableOpacity>

                            <Text style={[styles.prescSectionTitle, { marginTop: 20 }]}>ملاحظات إضافية</Text>
                            <TextInput
                                style={styles.prescNotesInput}
                                placeholder="اكتب تعليمات إضافية للمريض..."
                                multiline
                                value={prescriptionNotes}
                                onChangeText={setPrescriptionNotes}
                                textAlign="right"
                            />
                        </ScrollView>

                        <View style={styles.prescFooter}>
                            <TouchableOpacity 
                                style={[styles.sendPrescBtn, { opacity: submittingPrescription ? 0.7 : 1 }]}
                                onPress={handleSendPrescription}
                                disabled={submittingPrescription}
                            >
                                {submittingPrescription ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <Text style={styles.sendPrescTxt}>إرسال الوصفة للـمريض</Text>
                                        <Ionicons name="send" size={18} color="#FFF" style={{ marginLeft: 10 }} />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'center', marginBottom: 15 },
    searchBox: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 18, height: 48, alignItems: 'center', paddingHorizontal: 15 },
    searchInput: { flex: 1, height: '100%', fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#1E293B' },
    
    list: { flex: 1, paddingHorizontal: 20, marginTop: 15 },
    card: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 15, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    profileStrip: { height: 4, width: '100%' },
    cardHeader: { flexDirection: 'row-reverse', padding: 20, alignItems: 'center', justifyContent: 'space-between' },
    patientMain: { flex: 1, alignItems: 'flex-end' },
    patientName: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    patientMeta: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', marginTop: 4 },
    favBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
    
    cardBody: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 15, alignItems: 'center' },
    infoRow: { alignItems: 'flex-end' },
    infoLabel: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#94A3B8' },
    infoVal: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#1E293B' },
    tagRow: { flexDirection: 'row-reverse', alignItems: 'center' },
    tag: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 5 },
    tagText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#EF4444' },

    actionBtn: { flexDirection: 'row', height: 44, justifyContent: 'center', alignItems: 'center', marginHorizontal: 15, marginBottom: 15, borderRadius: 15 },
    actionBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#FFF' },

    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 15 },

    modalContainer: { flex: 1, backgroundColor: '#FFF' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    modalBody: { flex: 1 },
    historyPlaceholder: { padding: 30, alignItems: 'center' },
    patientNameLarge: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#1E293B', marginTop: 15 },
    placeholderDesc: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'center', marginTop: 10 },
    dummyRecord: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginTop: 30, borderLeftWidth: 4, borderLeftColor: '#0EA5E9' },
    recordTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right' },
    recordDate: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'right', marginTop: 4 },
    recordContent: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#475569', textAlign: 'right', marginTop: 10 },

    patientHero: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#F8FAFC', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    heroAvatar: { width: 100, height: 100, borderRadius: 35, borderWidth: 4, borderColor: '#FFF', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    heroMeta: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#64748B', marginTop: 5 },
    sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right', marginBottom: 15, paddingHorizontal: 20 },
    noteInputSection: { padding: 20 },
    noteInput: { backgroundColor: '#F8FAFC', borderRadius: 20, height: 120, padding: 15, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
    submitNoteBtn: { backgroundColor: '#1E88E5', height: 48, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 15 },
    submitNoteTxt: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    notesList: { padding: 20 },
    noNotes: { textAlign: 'center', color: '#94A3B8', fontFamily: 'Cairo_400Regular', marginTop: 10 },
    noteCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
    noteHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 },
    noteDate: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginRight: 5 },
    noteText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#334155', textAlign: 'right', lineHeight: 22 },
    historySection: { padding: 20, paddingTop: 0 },

    /* Prescription Specific Styles */
    cardActionsRow: { 
        flexDirection: 'row-reverse', 
        gap: 10, 
        paddingHorizontal: 15, 
        paddingBottom: 15 
    },
    actionBtnCompact: { 
        flex: 1, 
        height: 42, 
        borderRadius: 12, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    overlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    prescModalContent: { 
        backgroundColor: '#FFF', 
        borderTopLeftRadius: 35, 
        borderTopRightRadius: 35, 
        height: '85%', 
        padding: 24 
    },
    prescHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 25 
    },
    prescTitle: { 
        fontSize: 18, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B' 
    },
    prescBody: { flex: 1 },
    prescPatientInfo: { 
        backgroundColor: '#F8FAFC', 
        borderRadius: 20, 
        padding: 15, 
        alignItems: 'flex-end', 
        marginBottom: 25 
    },
    prescPatientLabel: { 
        fontSize: 12, 
        fontFamily: 'Cairo_400Regular', 
        color: '#94A3B8' 
    },
    prescPatientName: { 
        fontSize: 18, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B', 
        marginTop: 2 
    },
    prescSectionTitle: { 
        fontSize: 15, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B', 
        textAlign: 'right', 
        marginBottom: 15 
    },
    medicationRow: { 
        backgroundColor: '#FFF', 
        borderRadius: 18, 
        padding: 15, 
        marginBottom: 15, 
        borderWidth: 1, 
        borderColor: '#F1F5F9' 
    },
    medRowTop: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 10 
    },
    medIdx: { 
        fontSize: 11, 
        fontFamily: 'Cairo_700Bold', 
        color: '#6366F1' 
    },
    medInput: { 
        backgroundColor: '#F8FAFC', 
        borderRadius: 10, 
        padding: 10, 
        fontSize: 13, 
        fontFamily: 'Cairo_600SemiBold', 
        color: '#1E293B', 
        marginBottom: 10 
    },
    medSubInputs: { flexDirection: 'row-reverse' },
    addMedBtn: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingVertical: 10 
    },
    addMedText: { 
        fontSize: 13, 
        fontFamily: 'Cairo_700Bold', 
        color: '#5D5FEF', 
        marginRight: 8 
    },
    prescNotesInput: { 
        backgroundColor: '#F8FAFC', 
        borderRadius: 18, 
        height: 100, 
        padding: 15, 
        fontSize: 13, 
        fontFamily: 'Cairo_400Regular', 
        color: '#1E293B', 
        textAlignVertical: 'top' 
    },
    prescFooter: { 
        paddingTop: 20, 
        borderTopWidth: 1, 
        borderTopColor: '#F1F5F9' 
    },
    sendPrescBtn: { 
        backgroundColor: '#5D5FEF', 
        height: 54, 
        borderRadius: 18, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    sendPrescTxt: { 
        fontSize: 15, 
        fontFamily: 'Cairo_700Bold', 
        color: '#FFF' 
    },

    /* Real Prescription History Styles */
    realPrescCard: {
        backgroundColor: '#F8F9FF',
        borderRadius: 20,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E0E7FF'
    },
    prescHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2FF'
    },
    prescDateText: {
        fontSize: 11,
        fontFamily: 'Cairo_600SemiBold',
        color: '#94A3B8'
    },
    prescDocLabel: {
        fontSize: 12,
        fontFamily: 'Cairo_700Bold',
        color: '#1E293B'
    },
    prescMedList: {
        gap: 6
    },
    medItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8
    },
    medNameText: {
        fontSize: 13,
        fontFamily: 'Cairo_600SemiBold',
        color: '#334155',
        textAlign: 'right'
    },
    prescNoteText: {
        marginTop: 10,
        fontSize: 12,
        fontFamily: 'Cairo_400Regular',
        color: '#64748B',
        textAlign: 'right',
        fontStyle: 'italic'
    }
});
