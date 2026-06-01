import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform, Switch, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function ConsultationReportScreen() {
    const { appointmentId, patientId, patientName } = useLocalSearchParams<{
        appointmentId: string;
        patientId: string;
        patientName: string;
    }>();
    const router = useRouter();
    const { user } = useAuth();

    const [isHealthy, setIsHealthy] = useState(false);
    const [conditionSummary, setConditionSummary] = useState('');
    const [notes, setNotes] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [saving, setSaving] = useState(false);

    // Prescription state
    const [showPrescModal, setShowPrescModal] = useState(false);
    const [medications, setMedications] = useState([{ name: '', dosage: '', duration: '' }]);
    const [prescNotes, setPrescNotes] = useState('');
    const [savingPresc, setSavingPresc] = useState(false);

    // Service request state
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [serviceType, setServiceType] = useState<'lab' | 'radiology'>('lab');
    const [serviceName, setServiceName] = useState('');
    const [serviceNotes, setServiceNotes] = useState('');
    const [savingService, setSavingService] = useState(false);
    const [savedReportId, setSavedReportId] = useState<string | null>(null);
    const [serviceRequests, setServiceRequests] = useState<any[]>([]);

    const handleSaveReport = async () => {
        if (!conditionSummary && !isHealthy) {
            Alert.alert('تنبيه', 'يرجى إدخال ملخص الحالة أو تحديد أن المريض بصحة جيدة');
            return;
        }
        setSaving(true);
        try {
            const report = await api.createConsultationReport({
                appointment_id: appointmentId,
                doctor_id: user?.id,
                patient_id: patientId,
                condition_summary: conditionSummary,
                is_healthy: isHealthy,
                notes,
                follow_up: followUp,
            });
            setSavedReportId(report.id);
            Alert.alert('✅ تم حفظ التقرير', 'تم إنهاء الجلسة وحفظ التقرير بنجاح');
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل حفظ التقرير');
        } finally {
            setSaving(false);
        }
    };

    const handleSavePrescription = async () => {
        const validMeds = medications.filter(m => m.name.trim());
        if (!validMeds.length) {
            Alert.alert('تنبيه', 'يرجى إضافة دواء واحد على الأقل');
            return;
        }
        setSavingPresc(true);
        try {
            await api.createPrescription({
                doctor_id: user?.id,
                patient_id: patientId,
                medications: validMeds,
                notes: prescNotes,
            });
            setShowPrescModal(false);
            setMedications([{ name: '', dosage: '', duration: '' }]);
            setPrescNotes('');
            Alert.alert('✅ تم', 'تم إرسال الوصفة الطبية للمريض');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSavingPresc(false);
        }
    };

    const handleAddServiceRequest = async () => {
        if (!serviceName.trim()) {
            Alert.alert('تنبيه', 'يرجى إدخال اسم الخدمة المطلوبة');
            return;
        }
        if (!savedReportId) {
            Alert.alert('تنبيه', 'يرجى حفظ التقرير أولاً قبل إضافة طلبات الفحوصات');
            return;
        }
        setSavingService(true);
        try {
            const sr = await api.addServiceRequest(savedReportId, {
                request_type: serviceType,
                service_name: serviceName,
                notes: serviceNotes,
            });
            setServiceRequests(prev => [...prev, sr]);
            setShowServiceModal(false);
            setServiceName('');
            setServiceNotes('');
            Alert.alert('✅ تم', `تم إصدار طلب ${serviceType === 'lab' ? 'تحليل' : 'أشعة'}. رمز الطلب: ${sr.reference_code}`);
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSavingService(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>تقرير الاستشارة</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Patient Info */}
                <View style={styles.patientCard}>
                    <MaterialCommunityIcons name="account-circle" size={40} color="#1E88E5" />
                    <View style={styles.patientInfo}>
                        <Text style={styles.patientName}>{patientName || 'المريض'}</Text>
                        <Text style={styles.patientSub}>تقرير الزيارة</Text>
                    </View>
                </View>

                {/* Healthy Toggle */}
                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <Switch
                            value={isHealthy}
                            onValueChange={setIsHealthy}
                            trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                            thumbColor={isHealthy ? '#22C55E' : '#9CA3AF'}
                        />
                        <Text style={styles.cardLabel}>المريض بصحة جيدة</Text>
                    </View>
                </View>

                {/* Condition Summary */}
                {!isHealthy && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>ملخص الحالة *</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="اكتب ملخص الحالة الطبية للمريض..."
                            value={conditionSummary}
                            onChangeText={setConditionSummary}
                            multiline
                            textAlign="right"
                            textAlignVertical="top"
                        />
                    </View>
                )}

                {/* Notes */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>ملاحظات وتعليمات</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="تعليمات للمريض، نصائح، تحذيرات..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlign="right"
                        textAlignVertical="top"
                    />
                </View>

                {/* Follow-up */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>موعد المتابعة</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="مثال: بعد أسبوعين، أو تاريخ محدد"
                        value={followUp}
                        onChangeText={setFollowUp}
                        textAlign="right"
                    />
                </View>

                {/* Service Requests */}
                {serviceRequests.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>الفحوصات المطلوبة</Text>
                        {serviceRequests.map((sr, i) => (
                            <View key={i} style={styles.srItem}>
                                <MaterialCommunityIcons
                                    name={sr.request_type === 'lab' ? 'flask' : 'radiology-box-outline'}
                                    size={20}
                                    color="#1E88E5"
                                />
                                <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 8 }}>
                                    <Text style={styles.srName}>{sr.service_name}</Text>
                                    <Text style={styles.srCode}>رمز: {sr.reference_code}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => setShowPrescModal(true)}>
                        <MaterialCommunityIcons name="prescription" size={28} color="#8B5CF6" />
                        <Text style={styles.actionCardText}>وصفة طبية</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => { setServiceType('lab'); setShowServiceModal(true); }}>
                        <MaterialCommunityIcons name="flask" size={28} color="#0EA5E9" />
                        <Text style={styles.actionCardText}>طلب تحليل</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={() => { setServiceType('radiology'); setShowServiceModal(true); }}>
                        <MaterialCommunityIcons name="radiology-box-outline" size={28} color="#8E24AA" />
                        <Text style={styles.actionCardText}>طلب أشعة</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Save Report Button */}
            <View style={styles.bottomBar}>
                {savedReportId ? (
                    <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(doctor)/appointments' as any)}>
                        <Text style={styles.doneBtnText}>✅ تم الحفظ — العودة للمواعيد</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveReport} disabled={saving}>
                        <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.saveBtnGrad}>
                            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>حفظ التقرير وإنهاء الجلسة</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {/* Prescription Modal */}
            <Modal visible={showPrescModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowPrescModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>وصفة طبية</Text>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {medications.map((m, idx) => (
                                <View key={idx} style={styles.medRow}>
                                    <Text style={styles.medLabel}>دواء {idx + 1}</Text>
                                    <TextInput style={styles.input} placeholder="اسم الدواء" value={m.name} onChangeText={v => { const u = [...medications]; u[idx].name = v; setMedications(u); }} textAlign="right" />
                                    <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="الجرعة" value={m.dosage} onChangeText={v => { const u = [...medications]; u[idx].dosage = v; setMedications(u); }} textAlign="right" />
                                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="المدة" value={m.duration} onChangeText={v => { const u = [...medications]; u[idx].duration = v; setMedications(u); }} textAlign="right" />
                                    </View>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addMedBtn} onPress={() => setMedications([...medications, { name: '', dosage: '', duration: '' }])}>
                                <Text style={styles.addMedText}>+ إضافة دواء</Text>
                            </TouchableOpacity>
                            <TextInput style={[styles.textArea, { marginTop: 12 }]} placeholder="ملاحظات إضافية..." value={prescNotes} onChangeText={setPrescNotes} multiline textAlign="right" textAlignVertical="top" />
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrescription} disabled={savingPresc}>
                                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.saveBtnGrad}>
                                    {savingPresc ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>إرسال الوصفة</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Service Request Modal */}
            <Modal visible={showServiceModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>طلب {serviceType === 'lab' ? 'تحليل' : 'أشعة'}</Text>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder={serviceType === 'lab' ? 'مثال: تحليل دم كامل، صورة دم...' : 'مثال: أشعة صدر، رنين مغناطيسي...'}
                            value={serviceName}
                            onChangeText={setServiceName}
                            textAlign="right"
                        />
                        <TextInput
                            style={[styles.textArea, { marginTop: 10 }]}
                            placeholder="ملاحظات إضافية..."
                            value={serviceNotes}
                            onChangeText={setServiceNotes}
                            multiline
                            textAlign="right"
                            textAlignVertical="top"
                        />
                        <TouchableOpacity style={[styles.saveBtn, { marginTop: 16 }]} onPress={handleAddServiceRequest} disabled={savingService}>
                            <LinearGradient colors={serviceType === 'lab' ? ['#0EA5E9', '#0284C7'] : ['#8E24AA', '#6A1B9A']} style={styles.saveBtnGrad}>
                                {savingService ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>إصدار الطلب</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 20 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    content: { flex: 1, padding: 16 },
    patientCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    patientInfo: { flex: 1, alignItems: 'flex-end' },
    patientName: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    patientSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
    cardRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    cardLabel: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    sectionTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right', marginBottom: 10 },
    textArea: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', minHeight: 100, padding: 12, fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#1E293B' },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#1E293B', marginBottom: 8 },
    actionsGrid: { flexDirection: 'row-reverse', gap: 12, marginBottom: 16 },
    actionCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
    actionCardText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'center' },
    srItem: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F0F9FF', borderRadius: 10, padding: 10, marginBottom: 8 },
    srName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    srCode: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'transparent' },
    saveBtn: { height: 54, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#1E88E5', shadowOpacity: 0.3, shadowRadius: 8 },
    saveBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    doneBtn: { height: 54, borderRadius: 16, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
    doneBtnText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    medRow: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 12 },
    medLabel: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#6366F1', textAlign: 'right', marginBottom: 6 },
    addMedBtn: { alignItems: 'center', paddingVertical: 10 },
    addMedText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
});
