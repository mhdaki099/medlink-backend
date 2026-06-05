import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { 
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, RefreshControl, 
    TextInput, Alert, Modal, Platform, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/theme';
import { TAB_BAR_CLEARANCE } from '../../src/constants/layout';

const APT_STATUS_LABELS: Record<string, string> = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    completed: 'منتهي',
    cancelled: 'ملغى',
    rejected: 'مرفوض',
    cancellation_requested: 'طلب إلغاء',
    reschedule_requested: 'طلب إعادة جدولة',
    schedule_change_pending: 'بانتظار المريض',
    patient_confirmation_pending: 'بانتظار المريض',
};

const buildPatientFromAppointments = (apts: any[]) => {
    const map = new Map<string, any>();
    for (const a of apts) {
        const pid = a.patient_id;
        if (!pid) continue;
        const p = a.patient || {};
        const aptSummary = {
            id: a.id,
            date: a.date,
            time: a.time,
            status: a.status,
            reason: a.reason || a.notes || '',
            price: a.price,
        };
        const existing = map.get(pid);
        if (!existing) {
            map.set(pid, {
                id: pid,
                name: p.name || 'مريض مجهول',
                phone: p.phone,
                email: p.email,
                address: p.address,
                city: p.city,
                dob: p.dob,
                gender: p.gender,
                blood_type: p.blood_type,
                allergies: p.allergies,
                drug_allergies: p.drug_allergies,
                chronic_conditions: p.chronic_conditions,
                patient_unique_id: p.patient_unique_id,
                is_provisional: p.is_provisional,
                lastVisit: a.date,
                lastVisitTime: a.time,
                lastStatus: a.status,
                hasRecordAccess: !!a.record_access_granted,
                appointments: [aptSummary],
            });
            continue;
        }
        existing.hasRecordAccess = existing.hasRecordAccess || !!a.record_access_granted;
        existing.appointments.push(aptSummary);
        const isNewer = `${a.date} ${a.time}` > `${existing.lastVisit} ${existing.lastVisitTime || ''}`;
        if (isNewer) {
            existing.lastVisit = a.date;
            existing.lastVisitTime = a.time;
            existing.lastStatus = a.status;
        }
        existing.phone = existing.phone || p.phone;
        existing.email = existing.email || p.email;
        existing.address = existing.address || p.address;
        existing.city = existing.city || p.city;
        existing.blood_type = existing.blood_type || p.blood_type;
        existing.allergies = existing.allergies || p.allergies;
        existing.patient_unique_id = existing.patient_unique_id || p.patient_unique_id;
    }
    return Array.from(map.values()).map(entry => ({
        ...entry,
        appointmentCount: entry.appointments.length,
        appointments: entry.appointments.sort((x: any, y: any) =>
            `${y.date} ${y.time}`.localeCompare(`${x.date} ${x.time}`)
        ),
    }));
};

const hasRecordAccess = (p: any) =>
    !!p.hasRecordAccess || p.accessRequestStatus === 'approved';

export default function DoctorPatients() {
    const { user } = useAuth();
    const [patients, setPatients] = useState<any[]>([]);
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
                api.getDoctorHistoryRequests(user.id),
            ]);
            const built = buildPatientFromAppointments(apts);
            const reqByPatient = new Map<string, string>();
            for (const r of reqs) {
                if (!r.patient_id) continue;
                const prev = reqByPatient.get(r.patient_id);
                if (r.status === 'approved' || !prev) {
                    reqByPatient.set(r.patient_id, r.status);
                }
            }
            setPatients(built.map(p => ({
                ...p,
                accessRequestStatus: reqByPatient.get(p.id) || null,
                hasRecordAccess: p.hasRecordAccess || reqByPatient.get(p.id) === 'approved',
            })));
        } catch (e: any) {
            console.warn(e);
            Alert.alert('خطأ', e.message || 'تعذر تحميل المرضى');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const [patientVisits, setPatientVisits] = useState<any>(null);
    const [patientProfile, setPatientProfile] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    const mergeServiceRequests = (visitsData: any, extraReqs: any[]) => {
        if (!visitsData?.visits || !extraReqs?.length) return visitsData;
        const byApt: Record<string, any[]> = {};
        extraReqs.forEach(sr => {
            if (!sr.appointment_id) return;
            if (!byApt[sr.appointment_id]) byApt[sr.appointment_id] = [];
            byApt[sr.appointment_id].push(sr);
        });
        const visits = visitsData.visits.map((v: any) => {
            if (v.type !== 'appointment' || !byApt[v.id]) return v;
            const existingIds = new Set((v.service_requests || []).map((s: any) => s.id));
            const merged = [...(v.service_requests || [])];
            byApt[v.id].forEach(sr => { if (!existingIds.has(sr.id)) merged.push(sr); });
            return { ...v, service_requests: merged };
        });
        return { ...visitsData, visits };
    };

    const handleRequestAccess = async (patientId: string) => {
        try {
            await api.requestMedicalHistory(patientId, user!.id);
            Alert.alert('✅ تم', 'تم إرسال طلب الوصول للمريض — بانتظار موافقته مرة واحدة');
            loadData();
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل إرسال الطلب');
        }
    };

    const handlePatientPress = (p: any) => {
        if (hasRecordAccess(p)) {
            openPatientHistory(p);
            return;
        }
        if (p.accessRequestStatus === 'pending') {
            Alert.alert('بانتظار الموافقة', 'طلبك قيد المراجعة من المريض. بعد الموافقة ستظهر كل التفاصيل تلقائياً.');
            return;
        }
        Alert.alert(
            'طلب وصول للسجل',
            'يجب طلب إذن المريض مرة واحدة لعرض بيانات التواصل والسجل الطبي الكامل.',
            [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'إرسال الطلب', onPress: () => handleRequestAccess(p.id) },
            ],
        );
    };

    const openPatientHistory = async (p: any) => {
        if (!hasRecordAccess(p)) {
            handlePatientPress(p);
            return;
        }
        setSelectedPatient(p);
        setShowHistory(true);
        setLoadingProfile(true);
        setPatientProfile(null);
        setPatientVisits(null);
        try {
            const [profile, nData, pData, vData, serviceReqs] = await Promise.all([
                api.getPatientProfile(p.id),
                api.getPatientNotes(user!.id, p.id),
                api.getPatientPrescriptions(p.id),
                api.getPatientVisits(p.id),
                api.getPatientServiceRequests(p.id).catch(() => []),
            ]);
            setPatientProfile(profile);
            setNotes(nData);
            setPatientPrescriptions(pData);
            setPatientVisits(mergeServiceRequests(vData, serviceReqs));
        } catch (e) {
            console.warn(e);
            Alert.alert('خطأ', 'تعذر تحميل بيانات المريض');
        } finally {
            setLoadingProfile(false);
        }
    };

    const callPatient = (phone?: string) => {
        if (!phone?.trim()) {
            Alert.alert('تنبيه', 'لا يوجد رقم هاتف');
            return;
        }
        Linking.openURL(`tel:${phone.trim()}`);
    };

    const emailPatient = (email?: string) => {
        if (!email?.trim() || email.includes('provisional_')) {
            Alert.alert('تنبيه', 'لا يوجد بريد إلكتروني');
            return;
        }
        Linking.openURL(`mailto:${email.trim()}`);
    };

    const whatsappPatient = (phone?: string) => {
        if (!phone?.trim()) {
            Alert.alert('تنبيه', 'لا يوجد رقم هاتف');
            return;
        }
        const digits = phone.replace(/\D/g, '');
        Linking.openURL(`https://wa.me/${digits}`);
    };

    const formatGender = (g?: string) => {
        if (g === 'male') return 'ذكر';
        if (g === 'female') return 'أنثى';
        return g || '—';
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

    const reloadPatientNotes = async (patientId: string) => {
        try {
            const [nData, vData, serviceReqs] = await Promise.all([
                api.getPatientNotes(user!.id, patientId),
                api.getPatientVisits(patientId),
                api.getPatientServiceRequests(patientId).catch(() => []),
            ]);
            setNotes(nData);
            setPatientVisits(mergeServiceRequests(vData, serviceReqs));
        } catch (e) { console.warn(e); }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setSubmittingNote(true);
        try {
            await api.addPatientNote(user!.id, selectedPatient.id, newNote);
            setNewNote('');
            await reloadPatientNotes(selectedPatient.id);
            Alert.alert('✅ تم', 'تمت إضافة الملاحظة بنجاح');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSubmittingNote(false);
        }
    };

    const filteredPatients = patients.filter(p => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            (p.name || '').toLowerCase().includes(q) ||
            (p.phone || '').includes(q) ||
            (p.patient_unique_id || '').toLowerCase().includes(q) ||
            (p.email || '').toLowerCase().includes(q)
        );
    });

    const renderPatientCard = (p: any, idx: number) => {
        const unlocked = hasRecordAccess(p);
        const pending = p.accessRequestStatus === 'pending';

        return (
            <Animated.View key={p.id} entering={FadeInUp.delay(idx * 100)}>
                <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => handlePatientPress(p)}>
                    <View style={[styles.profileStrip, { backgroundColor: unlocked ? '#DCFCE7' : pending ? '#FEF3C7' : '#FEE2E2' }]} />

                    <View style={styles.cardHeader}>
                        <View style={styles.patientMain}>
                            <Text style={styles.patientName}>{p.name}</Text>
                            <Text style={styles.patientMeta}>
                                {p.appointmentCount} موعد
                                {unlocked ? ` | 🩸 ${p.blood_type || '—'}` : ''}
                            </Text>
                            {!unlocked ? (
                                <Text style={styles.lockedHint}>
                                    {pending ? '⏳ بانتظار موافقة المريض' : '🔒 التفاصيل مقفلة — اطلب الوصول'}
                                </Text>
                            ) : p.patient_unique_id ? (
                                <Text style={styles.patientIdText}>#{p.patient_unique_id}</Text>
                            ) : null}
                        </View>
                        <View style={styles.favBtn}>
                            <Ionicons
                                name={unlocked ? 'eye-outline' : pending ? 'hourglass-outline' : 'lock-closed-outline'}
                                size={20}
                                color={unlocked ? '#166534' : '#64748B'}
                            />
                        </View>
                    </View>

                    {unlocked ? (
                        <View style={styles.cardContactGrid}>
                            {p.phone ? (
                                <TouchableOpacity
                                    style={styles.contactChip}
                                    onPress={() => callPatient(p.phone)}
                                >
                                    <Ionicons name="call-outline" size={14} color="#0EA5E9" />
                                    <Text style={styles.contactChipText}>{p.phone}</Text>
                                </TouchableOpacity>
                            ) : null}
                            {p.email && !p.email.includes('provisional_') ? (
                                <View style={styles.contactChip}>
                                    <Ionicons name="mail-outline" size={14} color="#64748B" />
                                    <Text style={styles.contactChipText} numberOfLines={1}>{p.email}</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : null}

                    <View style={styles.cardBody}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoVal}>{p.lastVisit} {p.lastVisitTime || ''}</Text>
                            <Text style={styles.infoLabel}>آخر زيارة</Text>
                        </View>
                        <View style={[styles.statusMini, { backgroundColor: '#E0F2FE' }]}>
                            <Text style={styles.statusMiniText}>
                                {APT_STATUS_LABELS[p.lastStatus] || p.lastStatus}
                            </Text>
                        </View>
                        {unlocked && p.allergies?.length > 0 ? (
                            <View style={styles.tagRow}>
                                {p.allergies.slice(0, 2).map((a: string) => (
                                    <View key={a} style={styles.tag}>
                                        <Text style={styles.tagText}>{a}</Text>
                                    </View>
                                ))}
                                <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
                            </View>
                        ) : null}
                    </View>

                    <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                            style={[styles.actionBtnCompact, { backgroundColor: unlocked ? '#10B981' : pending ? '#94A3B8' : '#0EA5E9' }]}
                            onPress={() => handlePatientPress(p)}
                        >
                            <Text style={styles.actionBtnText}>
                                {unlocked ? 'التفاصيل الكاملة' : pending ? 'بانتظار الموافقة' : 'طلب الوصول'}
                            </Text>
                            <Ionicons
                                name={unlocked ? 'person-outline' : 'shield-checkmark'}
                                size={16}
                                color="#FFF"
                                style={{ marginLeft: 8 }}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtnCompact, { backgroundColor: '#8B5CF6' }]}
                            onPress={() => {
                                setSelectedPatient(p);
                                setShowPrescriptionModal(true);
                            }}
                        >
                            <Text style={styles.actionBtnText}>وصفة</Text>
                            <Ionicons name="document-text-outline" size={16} color="#FFF" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>مرضاي</Text>
                <Text style={styles.headerSub}>اطلب وصول المريض مرة واحدة — بعد الموافقة تبقى التفاصيل مفتوحة</Text>
                <View style={styles.searchBox}>
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="ابحث بالاسم أو الهاتف أو الرقم..."
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
                contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
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
                onRequestClose={() => setShowHistory(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowHistory(false)}>
                            <Ionicons name="close" size={28} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>ملف المريض</Text>
                    </View>
                    <ScrollView
                        style={styles.modalBody}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
                    >
                        <View style={styles.patientHero}>
                            <View style={[styles.heroAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }]}>
                                <Ionicons name="person" size={50} color="#CBD5E1" />
                            </View>
                            <Text style={styles.patientNameLarge}>{patientProfile?.name || selectedPatient?.name}</Text>
                            <Text style={styles.heroMeta}>
                                🩸 {patientProfile?.blood_type || selectedPatient?.blood_type || '—'}
                                {' | '}
                                {patientProfile?.city || selectedPatient?.city || '—'}
                            </Text>
                        </View>

                        {loadingProfile ? (
                            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
                        ) : patientProfile ? (
                            <View style={styles.contactSection}>
                                <View style={styles.quickActionsRow}>
                                    {patientProfile.phone ? (
                                        <>
                                            <TouchableOpacity style={styles.quickActionBtn} onPress={() => callPatient(patientProfile.phone)}>
                                                <Ionicons name="call" size={20} color="#FFF" />
                                                <Text style={styles.quickActionText}>اتصال</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#25D366' }]} onPress={() => whatsappPatient(patientProfile.phone)}>
                                                <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
                                                <Text style={styles.quickActionText}>واتساب</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : null}
                                    {patientProfile.email && !patientProfile.email.includes('provisional_') ? (
                                        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: '#6366F1' }]} onPress={() => emailPatient(patientProfile.email)}>
                                            <Ionicons name="mail" size={20} color="#FFF" />
                                            <Text style={styles.quickActionText}>بريد</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>

                                <Text style={styles.sectionTitle}>البيانات الشخصية والتواصل</Text>
                                <View style={styles.contactCard}>
                                    {[
                                        { label: 'رقم المريض', value: patientProfile.patient_unique_id },
                                        { label: 'الهاتف', value: patientProfile.phone, action: () => callPatient(patientProfile.phone), highlight: true },
                                        { label: 'البريد الإلكتروني', value: patientProfile.email?.includes('provisional_') ? null : patientProfile.email },
                                        { label: 'المدينة', value: patientProfile.city },
                                        { label: 'العنوان', value: patientProfile.address },
                                        { label: 'تاريخ الميلاد', value: patientProfile.dob },
                                        { label: 'الجنس', value: formatGender(patientProfile.gender) },
                                        { label: 'فصيلة الدم', value: patientProfile.blood_type },
                                    ].filter(row => row.value).map((row, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={styles.contactRowItem}
                                            onPress={row.action}
                                            disabled={!row.action}
                                        >
                                            <Text style={[styles.contactValue, row.highlight && { color: '#0EA5E9' }]}>{row.value}</Text>
                                            <Text style={styles.contactLabel}>{row.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {(patientProfile.allergies?.length || patientProfile.drug_allergies?.length || patientProfile.chronic_conditions?.length) ? (
                                    <View style={styles.medicalInfoCard}>
                                        {patientProfile.allergies?.length > 0 ? (
                                            <View style={styles.medicalInfoBlock}>
                                                <Text style={styles.medicalInfoLabel}>حساسية عامة</Text>
                                                <Text style={styles.medicalInfoText}>{patientProfile.allergies.join('، ')}</Text>
                                            </View>
                                        ) : null}
                                        {patientProfile.drug_allergies?.length > 0 ? (
                                            <View style={styles.medicalInfoBlock}>
                                                <Text style={styles.medicalInfoLabel}>حساسية أدوية</Text>
                                                <Text style={styles.medicalInfoText}>{patientProfile.drug_allergies.join('، ')}</Text>
                                            </View>
                                        ) : null}
                                        {patientProfile.chronic_conditions?.length > 0 ? (
                                            <View style={styles.medicalInfoBlock}>
                                                <Text style={styles.medicalInfoLabel}>أمراض مزمنة</Text>
                                                <Text style={styles.medicalInfoText}>{patientProfile.chronic_conditions.join('، ')}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                ) : null}

                                {selectedPatient?.appointments?.length > 0 ? (
                                    <View style={styles.patientAptsSection}>
                                        <Text style={styles.sectionTitle}>مواعيدي مع هذا المريض ({selectedPatient.appointmentCount})</Text>
                                        {selectedPatient.appointments.map((apt: any) => (
                                            <View key={apt.id} style={styles.patientAptCard}>
                                                <View style={styles.patientAptHeader}>
                                                    <Text style={styles.patientAptDate}>{apt.date} — {apt.time}</Text>
                                                    <Text style={styles.patientAptStatus}>
                                                        {APT_STATUS_LABELS[apt.status] || apt.status}
                                                    </Text>
                                                </View>
                                                {apt.reason ? (
                                                    <Text style={styles.patientAptReason}>الشكوى: {apt.reason}</Text>
                                                ) : null}
                                                {apt.price ? (
                                                    <Text style={styles.patientAptPrice}>{apt.price.toLocaleString()} ل.س</Text>
                                                ) : null}
                                            </View>
                                        ))}
                                    </View>
                                ) : null}
                            </View>
                        ) : null}

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
                        
                        {patientPrescriptions.length > 0 ? (
                            <View style={styles.historySection}>
                                <Text style={styles.sectionTitle}>الوصفات الصادرة</Text>
                                {patientPrescriptions.slice(0, 5).map((rx: any, idx: number) => (
                                    <View key={rx.id || idx} style={styles.rxCard}>
                                        {rx.prescription_code ? (
                                            <Text style={styles.rxCode}>{rx.prescription_code}</Text>
                                        ) : null}
                                        <Text style={styles.rxMeds}>
                                            {(rx.medications || []).slice(0, 3).map((m: any) =>
                                                typeof m === 'string' ? m : m.name
                                            ).join('، ')}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        <View style={styles.historySection}>
                            <Text style={styles.sectionTitle}>سجل الزيارات والتقارير</Text>
                            {!patientVisits ? (
                                <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
                            ) : patientVisits.visits?.length === 0 ? (
                                <Text style={styles.noNotes}>لا توجد زيارات مسجلة</Text>
                            ) : (
                                patientVisits.visits.map((visit: any, vIdx: number) => (
                                    <View key={vIdx} style={styles.visitTimelineCard}>
                                        <View style={styles.visitTimelineHeader}>
                                            <Text style={styles.visitTimelineDate}>
                                                {visit.visit_date}{visit.visit_time ? ` - ${visit.visit_time}` : ''}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                                        </View>

                                        {visit.type === 'medical_record' ? (
                                            <>
                                                <Text style={styles.visitReportLabel}>{visit.title}</Text>
                                                <Text style={styles.visitReportText}>{visit.content}</Text>
                                            </>
                                        ) : (
                                            <>
                                                {visit.complaint ? (
                                                    <View style={styles.visitComplaintBox}>
                                                        <Text style={styles.visitComplaintLabel}>الشكوى:</Text>
                                                        <Text style={styles.visitComplaintText}>{visit.complaint}</Text>
                                                    </View>
                                                ) : null}

                                                {visit.consultation_report ? (
                                                    <View style={styles.visitReportBox}>
                                                        <Text style={styles.visitReportLabel}>📋 تقرير الاستشارة</Text>
                                                        {visit.consultation_report.is_healthy ? (
                                                            <Text style={styles.visitReportText}>✅ المريض بصحة جيدة</Text>
                                                        ) : (
                                                            <Text style={styles.visitReportText}>
                                                                {visit.consultation_report.condition_summary}
                                                            </Text>
                                                        )}
                                                        {visit.consultation_report.notes ? (
                                                            <Text style={[styles.visitReportText, { marginTop: 6 }]}>
                                                                ملاحظات: {visit.consultation_report.notes}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                ) : null}

                                                {visit.prescription?.prescription_code || visit.prescription?.medications?.length > 0 ? (
                                                    <View style={styles.visitPrescBox}>
                                                        <Text style={styles.visitPrescLabel}>💊 الوصفة</Text>
                                                        {visit.prescription.prescription_code ? (
                                                            <Text style={styles.visitCodeText}>RX: {visit.prescription.prescription_code}</Text>
                                                        ) : null}
                                                        {(visit.prescription.medications || []).map((med: any, mIdx: number) => (
                                                            <Text key={mIdx} style={styles.visitMedText}>
                                                                • {typeof med === 'string' ? med : `${med.name}${med.dosage ? ` (${med.dosage})` : ''}`}
                                                            </Text>
                                                        ))}
                                                        {visit.prescription.notes ? (
                                                            <Text style={styles.visitMedText}>ملاحظات: {visit.prescription.notes}</Text>
                                                        ) : null}
                                                    </View>
                                                ) : null}

                                                {visit.service_requests?.length > 0 ? (
                                                    <View style={styles.visitServicesBox}>
                                                        <Text style={styles.visitServicesLabel}>🧪 التحاليل والأشعة</Text>
                                                        {visit.service_requests.map((req: any, rIdx: number) => (
                                                            <View key={rIdx} style={styles.visitServiceRow}>
                                                                <Text style={styles.visitCodeText}>
                                                                    {req.request_type === 'lab' ? 'LAB' : 'RAD'}: {req.reference_code}
                                                                </Text>
                                                                <Text style={styles.visitServiceText}>{req.service_name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : null}

                                                {visit.follow_up ? (
                                                    <View style={styles.visitFollowUpBox}>
                                                        <Text style={styles.visitFollowUpLabel}>📅 المتابعة:</Text>
                                                        <Text style={styles.visitFollowUpText}>{visit.follow_up}</Text>
                                                    </View>
                                                ) : null}
                                            </>
                                        )}
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
    headerTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'center', marginBottom: 4 },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'center', marginBottom: 15 },
    patientIdText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 2 },
    lockedHint: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#B45309', marginTop: 4, textAlign: 'right' },
    cardContactGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, paddingHorizontal: 15, paddingBottom: 10 },
    contactChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, maxWidth: '48%' },
    contactChipText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#475569' },
    statusMini: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    statusMiniText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#0369A1' },
    quickActionsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 16, paddingHorizontal: 20 },
    quickActionBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0EA5E9', paddingVertical: 12, borderRadius: 14 },
    quickActionText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    patientAptsSection: { marginTop: 16 },
    patientAptCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    patientAptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    patientAptDate: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    patientAptStatus: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#0EA5E9' },
    patientAptReason: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#475569', textAlign: 'right' },
    patientAptPrice: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#64748B', textAlign: 'right', marginTop: 4 },
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
    
    cardBody: { flexDirection: 'row-reverse', justifyContent: 'space-between', flexWrap: 'wrap', paddingHorizontal: 15, paddingBottom: 15, alignItems: 'center', gap: 8 },
    phonePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    phonePillText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#0369A1' },
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
    contactSection: { paddingHorizontal: 20, paddingBottom: 8 },
    contactCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, gap: 10 },
    contactRowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    contactLabel: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#94A3B8' },
    contactValue: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B', flex: 1, textAlign: 'right', marginLeft: 12 },
    medicalInfoCard: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginTop: 12 },
    medicalInfoBlock: { marginBottom: 8 },
    medicalInfoLabel: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#B91C1C', textAlign: 'right', marginBottom: 4 },
    medicalInfoText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#7F1D1D', textAlign: 'right' },
    rxCard: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12, marginBottom: 8 },
    rxCode: { fontSize: 14, fontFamily: 'Cairo_800ExtraBold', color: '#7C3AED', textAlign: 'right', marginBottom: 4 },
    rxMeds: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#4C1D95', textAlign: 'right' },
    visitCodeText: { fontSize: 12, fontFamily: 'Cairo_800ExtraBold', color: '#0EA5E9', textAlign: 'right' },
    visitServiceRow: { marginBottom: 6 },

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
    },

    // Visit Timeline Styles
    visitTimelineCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#0EA5E9' },
    visitTimelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    visitTimelineDate: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#1E293B' },
    visitComplaintBox: { backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10, marginBottom: 8 },
    visitComplaintLabel: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#92400E', marginBottom: 4 },
    visitComplaintText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#78350F', textAlign: 'right' },
    visitReportBox: { backgroundColor: '#DBEAFE', padding: 10, borderRadius: 10, marginBottom: 8 },
    visitReportLabel: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#1E40AF', marginBottom: 4 },
    visitReportText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#1E3A8A', textAlign: 'right' },
    visitPrescBox: { backgroundColor: '#F3E8FF', padding: 10, borderRadius: 10, marginBottom: 8 },
    visitPrescLabel: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#6B21A8', marginBottom: 4 },
    visitMedText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#581C87', textAlign: 'right', marginTop: 2 },
    visitMedMore: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#7C3AED', marginTop: 4, textAlign: 'right' },
    visitServicesBox: { backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10, marginBottom: 8 },
    visitServicesLabel: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#92400E', marginBottom: 4 },
    visitServiceText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#78350F', textAlign: 'right', marginTop: 2 },
    visitFollowUpBox: { backgroundColor: '#D1FAE5', padding: 10, borderRadius: 10 },
    visitFollowUpLabel: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#065F46', marginBottom: 4 },
    visitFollowUpText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#047857', textAlign: 'right' },
});
