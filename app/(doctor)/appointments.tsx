import React, { useEffect, useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, ActivityIndicator, 
    RefreshControl, TouchableOpacity, Alert, Platform, Image, Modal, FlatList, TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme';

export default function DoctorAppointments() {
    const { user } = useAuth();
    const router = useRouter();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rejectModal, setRejectModal] = useState<{visible: boolean, aptId: string}>({visible: false, aptId: ''});

    const REJECTION_REASONS = [
        { type: 'booked_by_phone', label: 'الموعد محجوز مسبقاً عبر الهاتف' },
        { type: 'wrong_specialty', label: 'الحالة تحتاج تخصصاً آخر' },
        { type: 'clinic_closed', label: 'العيادة مغلقة في هذا اليوم' },
        { type: 'other', label: 'سبب آخر' },
    ];

    const [rejectReasonType, setRejectReasonType] = useState('');
    const [rejectCustomNote, setRejectCustomNote] = useState('');
    const [rejectRecommendedSpec, setRejectRecommendedSpec] = useState('');
    const [rejectStep, setRejectStep] = useState<'reason' | 'detail'>('reason');

    const loadData = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        try {
            const apts = await api.getAppointments({ 
                doctor_id: user.id, 
                ...(filter !== 'all' ? { status: filter } : {}) 
            });
            setAppointments(apts);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, [filter, user]);

    const handleStatusUpdate = async (id: string, newStatus: string, rejectionNote?: string, rejectionReasonType?: string, recommendedSpecialty?: string) => {
        try {
            await api.updateAppointmentStatus(id, newStatus, undefined, undefined, rejectionNote);
            // If we have structured rejection data, send it separately
            if (rejectionReasonType) {
                // The rejection_reason_type is sent as part of the status update body
                await api.put(`/appointments/${id}/status`, {
                    status: newStatus,
                    rejection_note: rejectionNote,
                    rejection_reason_type: rejectionReasonType,
                    recommended_specialty: recommendedSpecialty,
                }).catch(() => {}); // Already updated above, this is for extra fields
            }
            Alert.alert('✅ تم', `تم ${newStatus === 'confirmed' ? 'تأكيد' : newStatus === 'completed' ? 'إكمال' : 'إلغاء'} الموعد بنجاح`);
            loadData();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const handleReject = (aptId: string) => {
        setRejectStep('reason');
        setRejectReasonType('');
        setRejectCustomNote('');
        setRejectRecommendedSpec('');
        setRejectModal({ visible: true, aptId });
    };

    const submitRejection = () => {
        if (!rejectReasonType) return;
        const note = rejectReasonType === 'other' ? rejectCustomNote : REJECTION_REASONS.find(r => r.type === rejectReasonType)?.label || '';
        setRejectModal({ visible: false, aptId: '' });
        handleStatusUpdate(rejectModal.aptId, 'rejected', note, rejectReasonType, rejectRecommendedSpec);
    };

    const handleRequestHistory = async (patientId: string) => {
        if (!user?.id) return;
        try {
            await api.requestMedicalHistory(patientId, user.id);
            Alert.alert('✅ تم الارسال', 'تم إرسال طلب الوصول للسجل الطبي للمريض بنجاح');
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل إرسال الطلب');
        }
    };

    const FILTERS = [
        { key: 'pending', label: 'القادمة' },
        { key: 'completed', label: 'المكتملة' },
        { key: 'cancelled', label: 'الملغاة' },
        { key: 'all', label: 'الكل' },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#10B981';
            case 'pending': return '#F59E0B';
            case 'completed': return '#3B82F6';
            case 'cancelled': return '#EF4444';
            default: return '#64748B';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'confirmed': return 'مؤكد';
            case 'pending': return 'قيد الانتظار';
            case 'completed': return 'مكتمل';
            case 'cancelled': return 'ملغى';
            default: return status;
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#F8FAFC', '#F8FAFC']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.headerTitle}>المواعيد</Text>
                <View style={styles.filterContainer}>
                    {FILTERS.map(f => (
                        <TouchableOpacity 
                            key={f.key} 
                            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                            onPress={() => setFilter(f.key)}
                        >
                            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </LinearGradient>

            <ScrollView 
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            >
                {loading ? (
                    <ActivityIndicator color="#0EA5E9" style={{ marginTop: 40 }} size="large" />
                ) : appointments.length === 0 ? (
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="calendar-blank" size={60} color="#E2E8F0" />
                        <Text style={styles.emptyText}>لا توجد مواعيد حالياً بهذا النوع</Text>
                    </View>
                ) : (
                    appointments.map((apt, idx) => (
                        <Animated.View 
                            key={apt.id} 
                            entering={FadeInDown.delay(idx * 100)}
                            style={styles.card}
                        >
                            <View style={styles.cardHeader}>
                                <View style={styles.patientIconCircle}>
                                    <Ionicons name="person" size={22} color="#94A3B8" />
                                </View>
                                <View style={styles.patientInfo}>
                                    <Text style={styles.patientName}>{apt.patient?.name || apt.patient?.id || 'مريض غير معروف'}</Text>
                                    <Text style={styles.patientMeta}>كشف عام</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(apt.status) + '15' }]}>
                                    <Text style={[styles.statusLabelTxt, { color: getStatusColor(apt.status) }]}>{getStatusLabel(apt.status)}</Text>
                                </View>
                            </View>

                            <View style={styles.dateTimeContainer}>
                                <View style={styles.dateTimePill}>
                                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                                    <Text style={styles.dateText}>{apt.date}</Text>
                                </View>
                                <View style={styles.dateTimePill}>
                                    <Ionicons name="time-outline" size={14} color="#64748B" />
                                    <Text style={styles.dateText}>{apt.time}</Text>
                                </View>
                            </View>
                            {/* Debug: <Text style={{fontSize: 8}}>{apt.id}</Text> */}


                            {/* Reschedule/Cancel request indicators */}
                            {apt.reschedule_requested && (
                                <View style={[styles.dateTimePill, { backgroundColor: '#FEF3C7' }]}>
                                    <MaterialCommunityIcons name="calendar-edit" size={14} color="#D97706" />
                                    <Text style={[styles.dateText, { color: '#D97706' }]}>طلب إعادة جدولة</Text>
                                </View>
                            )}
                            {apt.cancel_requested && (
                                <View style={[styles.dateTimePill, { backgroundColor: '#FEF2F2' }]}>
                                    <MaterialCommunityIcons name="close-circle-outline" size={14} color="#EF4444" />
                                    <Text style={[styles.dateText, { color: '#EF4444' }]}>طلب إلغاء</Text>
                                </View>
                            )}

                            {apt.status === 'reschedule_requested' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => api.respondReschedule(apt.id, { action: 'reject', rejection_note: 'تم رفض طلب إعادة الجدولة' }).then(loadData)}>
                                        <Text style={styles.cancelBtnText}>رفض الطلب</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={() => api.respondReschedule(apt.id, { action: 'approve' }).then(() => { Alert.alert('تم', 'تمت الموافقة'); loadData(); })}>
                                        <Text style={styles.confirmBtnText}>موافقة</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {apt.status === 'cancellation_requested' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => handleStatusUpdate(apt.id, 'confirmed')}>
                                        <Text style={styles.cancelBtnText}>رفض الإلغاء</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={() => handleStatusUpdate(apt.id, 'cancelled')}>
                                        <Text style={styles.confirmBtnText}>تأكيد الإلغاء</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {apt.status === 'pending' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, styles.cancelBtn]}
                                        onPress={() => handleReject(apt.id)}
                                    >
                                        <Text style={styles.cancelBtnText}>رفض</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, styles.confirmBtn]}
                                        onPress={() => handleStatusUpdate(apt.id, 'confirmed')}
                                    >
                                        <Text style={styles.confirmBtnText}>تأكيد</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {apt.status === 'confirmed' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, styles.cancelBtn]}
                                        onPress={() => handleStatusUpdate(apt.id, 'cancelled')}
                                    >
                                        <Text style={styles.cancelBtnText}>إلغاء</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, styles.confirmBtn]}
                                        onPress={() => router.push({ pathname: '/(doctor)/consultation-report', params: { appointmentId: apt.id, patientId: apt.patient_id, patientName: apt.patient?.name || '' } } as any)}
                                    >
                                        <Text style={styles.confirmBtnText}>إنهاء الجلسة</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    ))
                )}
            </ScrollView>

            {/* Rejection Reasons Modal (Req #15) */}
            <Modal visible={rejectModal.visible} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' }}>
                        <Text style={{ fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'center', marginBottom: 16 }}>سبب الرفض</Text>
                        
                        {/* Step 1: Choose reason type */}
                        {REJECTION_REASONS.map((reason) => (
                            <TouchableOpacity 
                                key={reason.type} 
                                style={{ 
                                    paddingVertical: 14, 
                                    borderBottomWidth: 1, 
                                    borderBottomColor: '#F3F4F6', 
                                    flexDirection: 'row-reverse', 
                                    alignItems: 'center', 
                                    gap: 8,
                                    backgroundColor: rejectReasonType === reason.type ? '#EBF5FF' : 'transparent',
                                    borderRadius: 8,
                                    paddingHorizontal: 8,
                                }}
                                onPress={() => setRejectReasonType(reason.type)}
                            >
                                <MaterialCommunityIcons 
                                    name={rejectReasonType === reason.type ? "radiobox-marked" : "radiobox-blank"} 
                                    size={20} 
                                    color={rejectReasonType === reason.type ? "#1E88E5" : "#6B7280"} 
                                />
                                <Text style={{ fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#374151', flex: 1, textAlign: 'right' }}>{reason.label}</Text>
                            </TouchableOpacity>
                        ))}

                        {/* Extra fields for wrong_specialty */}
                        {rejectReasonType === 'wrong_specialty' && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={{ fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'right', marginBottom: 6 }}>التخصص المناسب (اختياري)</Text>
                                <TextInput
                                    style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 44, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', textAlign: 'right' }}
                                    placeholder="مثال: طب الأعصاب"
                                    value={rejectRecommendedSpec}
                                    onChangeText={setRejectRecommendedSpec}
                                />
                            </View>
                        )}

                        {/* Extra field for other */}
                        {rejectReasonType === 'other' && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={{ fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'right', marginBottom: 6 }}>اكتب السبب</Text>
                                <TextInput
                                    style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', minHeight: 80, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Cairo_400Regular', textAlign: 'right', textAlignVertical: 'top' }}
                                    placeholder="اكتب سبب الرفض..."
                                    value={rejectCustomNote}
                                    onChangeText={setRejectCustomNote}
                                    multiline
                                />
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity 
                                style={{ flex: 1, paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' }}
                                onPress={() => setRejectModal({ visible: false, aptId: '' })}
                            >
                                <Text style={{ fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#6B7280' }}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={{ flex: 1, paddingVertical: 12, backgroundColor: rejectReasonType ? '#EF4444' : '#D1D5DB', borderRadius: 12, alignItems: 'center' }}
                                onPress={submitRejection}
                                disabled={!rejectReasonType}
                            >
                                <Text style={{ fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' }}>تأكيد الرفض</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Manual Appointment FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push('/(doctor)/new-appointment' as any)}
            >
                <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.fabGrad}>
                    <MaterialCommunityIcons name="calendar-plus" size={26} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'center', marginBottom: 20 },
    filterContainer: { flexDirection: 'row-reverse', backgroundColor: '#F1F5F9', borderRadius: 15, padding: 4 },
    filterChip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    filterChipActive: { backgroundColor: '#5D5FEF', elevation: 2, shadowColor: '#5D5FEF', shadowOpacity: 0.1, shadowRadius: 5 },
    filterText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8' },
    filterTextActive: { color: '#FFF' },

    list: { flex: 1, paddingHorizontal: 20, marginTop: 20 },
    card: { backgroundColor: '#FFF', borderRadius: 24, marginBottom: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5 },
    cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
    patientIconCircle: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    patientInfo: { flex: 1, marginRight: 15, alignItems: 'flex-end' },
    patientName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    patientMeta: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#94A3B8', marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusLabelTxt: { fontSize: 10, fontFamily: 'Cairo_700Bold' },

    dateTimeContainer: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 12, flexDirection: 'row-reverse', justifyContent: 'space-around', marginBottom: 15 },
    dateTimePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#475569' },

    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    confirmBtn: { backgroundColor: '#0EA5E9' },
    cancelBtn: { backgroundColor: '#F1F5F9' },
    confirmBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    cancelBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#64748B' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 15 },
    fab: { position: 'absolute', bottom: 100, left: 20, zIndex: 100 },
    fabGrad: { width: 58, height: 58, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#1E88E5', shadowOpacity: 0.4, shadowRadius: 10 },
});
