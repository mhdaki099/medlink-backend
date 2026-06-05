import React, { useEffect, useState, useCallback } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, ActivityIndicator, 
    RefreshControl, TouchableOpacity, Alert, Platform, Modal, TextInput, KeyboardAvoidingView, Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInRight, FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors } from '../../src/theme';
import { TAB_BAR_CLEARANCE, TAB_BAR_FAB_BOTTOM } from '../../src/constants/layout';

export default function DoctorAppointments() {
    const { user } = useAuth();
    const router = useRouter();
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [filter, setFilter] = useState<string>('upcoming');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionModal, setActionModal] = useState<{
        visible: boolean;
        aptId: string;
        targetStatus: 'rejected' | 'cancelled';
    }>({ visible: false, aptId: '', targetStatus: 'rejected' });

    const ACTION_REASONS = [
        { type: 'booked_by_phone', label: 'الموعد محجوز مسبقاً عبر الهاتف' },
        { type: 'wrong_specialty', label: 'الحالة تحتاج تخصصاً آخر' },
        { type: 'clinic_closed', label: 'العيادة مغلقة في هذا اليوم' },
        { type: 'patient_no_show', label: 'المريض لم يحضر' },
        { type: 'emergency', label: 'ظرف طارئ في العيادة' },
        { type: 'other', label: 'سبب آخر' },
    ];

    const [actionReasonType, setActionReasonType] = useState('');
    const [actionCustomNote, setActionCustomNote] = useState('');
    const [actionRecommendedSpec, setActionRecommendedSpec] = useState('');
    const [editModal, setEditModal] = useState<{ visible: boolean; aptId: string; status: string }>({
        visible: false, aptId: '', status: 'pending',
    });
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [modificationReason, setModificationReason] = useState('');

    const loadData = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        try {
            const apts = await api.getAppointments({ doctor_id: user.id });
            const sorted = [...apts].sort((a, b) => {
                const da = `${a.date || ''} ${a.time || ''}`;
                const db = `${b.date || ''} ${b.time || ''}`;
                return db.localeCompare(da);
            });
            setAllAppointments(sorted);
        } catch (e: any) {
            console.warn(e);
            Alert.alert('خطأ', e.message || 'تعذر تحميل المواعيد');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const FILTER_FN: Record<string, (a: any) => boolean> = {
        needs_action: (a) => ['cancellation_requested', 'reschedule_requested'].includes(a.status),
        upcoming: (a) => ['pending', 'confirmed', 'patient_confirmation_pending', 'schedule_change_pending'].includes(a.status),
        done: (a) => a.status === 'completed',
        cancelled: (a) => ['cancelled', 'rejected'].includes(a.status),
        all: () => true,
    };

    const FILTERS = [
        { key: 'needs_action', label: 'طلبات' },
        { key: 'upcoming', label: 'القادمة' },
        { key: 'done', label: 'منتهية' },
        { key: 'cancelled', label: 'ملغاة' },
        { key: 'all', label: 'الكل' },
    ];

    const appointments = allAppointments.filter(FILTER_FN[filter] || FILTER_FN.all);
    const getFilterCount = (key: string) => allAppointments.filter(FILTER_FN[key] || FILTER_FN.all).length;

    const handleStatusUpdate = async (
        id: string,
        newStatus: string,
        rejectionNote?: string,
        rejectionReasonType?: string,
        recommendedSpecialty?: string,
        date?: string,
        time?: string,
        modificationNote?: string,
    ) => {
        try {
            await api.put(`/appointments/${id}/status`, {
                status: newStatus,
                date,
                time,
                rejection_note: rejectionNote,
                rejection_reason_type: rejectionReasonType,
                recommended_specialty: recommendedSpecialty,
                modification_note: modificationNote,
            });
            const msg =
                newStatus === 'confirmed' ? 'تأكيد' :
                newStatus === 'completed' ? 'إكمال' :
                newStatus === 'rejected' ? 'رفض' : modificationNote ? 'تعديل' : 'إلغاء';
            Alert.alert('✅ تم', `تم ${msg} الموعد بنجاح`);
            setEditModal({ visible: false, aptId: '', status: 'pending' });
            loadData();
        } catch (e: any) {
            const msg = e?.message || 'فشل تحديث الموعد';
            Alert.alert('خطأ', msg);
            if (msg.includes('غير موجود')) {
                setEditModal({ visible: false, aptId: '', status: 'pending' });
                loadData();
            }
        }
    };

    const openEditModal = (apt: any) => {
        setNewDate(apt.date || '');
        setNewTime(apt.time || '');
        setModificationReason('');
        setEditModal({ visible: true, aptId: apt.id, status: apt.status });
    };

    const submitReschedule = async () => {
        if (!newDate.trim() || !newTime.trim()) {
            Alert.alert('تنبيه', 'يرجى إدخال التاريخ والوقت');
            return;
        }
        if (!modificationReason.trim()) {
            Alert.alert('تنبيه', 'يرجى إدخال سبب تعديل الموعد');
            return;
        }
        try {
            await api.proposeScheduleChange(
                editModal.aptId,
                newDate.trim(),
                newTime.trim(),
                modificationReason.trim(),
            );
            Alert.alert('✅ تم', 'تم إرسال طلب التعديل للمريض — بانتظار موافقته');
            setEditModal({ visible: false, aptId: '', status: 'pending' });
            setModificationReason('');
            loadData();
        } catch (e: any) {
            Alert.alert('خطأ', e?.message || 'فشل إرسال طلب التعديل');
            if (e?.message?.includes('غير موجود')) {
                setEditModal({ visible: false, aptId: '', status: 'pending' });
                loadData();
            }
        }
    };

    const openReasonModal = (aptId: string, targetStatus: 'rejected' | 'cancelled') => {
        setActionReasonType('');
        setActionCustomNote('');
        setActionRecommendedSpec('');
        setActionModal({ visible: true, aptId, targetStatus });
    };

    const submitReasonAction = () => {
        if (!actionReasonType) {
            Alert.alert('تنبيه', 'يرجى اختيار سبب');
            return;
        }
        const preset = ACTION_REASONS.find(r => r.type === actionReasonType)?.label || '';
        const note = actionReasonType === 'other' ? actionCustomNote.trim() : preset;
        if (!note) {
            Alert.alert('تنبيه', 'يرجى كتابة السبب');
            return;
        }
        const { aptId, targetStatus } = actionModal;
        setActionModal({ visible: false, aptId: '', targetStatus: 'rejected' });
        handleStatusUpdate(
            aptId,
            targetStatus,
            note,
            actionReasonType,
            actionReasonType === 'wrong_specialty' ? actionRecommendedSpec : undefined,
        );
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#10B981';
            case 'pending': return '#F59E0B';
            case 'completed': return '#3B82F6';
            case 'cancelled': return '#EF4444';
            case 'cancellation_requested': return '#DC2626';
            case 'reschedule_requested': return '#D97706';
            case 'schedule_change_pending': return '#7C3AED';
            case 'patient_confirmation_pending': return '#8B5CF6';
            case 'rejected': return '#EF4444';
            default: return '#64748B';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'confirmed': return 'مؤكد';
            case 'pending': return 'قيد الانتظار';
            case 'completed': return 'منتهي';
            case 'cancelled': return 'ملغى';
            case 'rejected': return 'مرفوض';
            case 'cancellation_requested': return 'طلب إلغاء';
            case 'reschedule_requested': return 'طلب إعادة جدولة';
            case 'schedule_change_pending': return 'بانتظار المريض';
            case 'patient_confirmation_pending': return 'بانتظار المريض';
            default: return status;
        }
    };

    const callPatient = (phone?: string) => {
        if (!phone?.trim()) {
            Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل للمريض');
            return;
        }
        Linking.openURL(`tel:${phone.trim()}`);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#F8FAFC', '#F8FAFC']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.headerTitle}>المواعيد</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {FILTERS.map(f => {
                        const count = getFilterCount(f.key);
                        return (
                            <TouchableOpacity
                                key={f.key}
                                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                                onPress={() => setFilter(f.key)}
                            >
                                <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                                    {f.label}{count > 0 ? ` (${count})` : ''}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </LinearGradient>

            <ScrollView 
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
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
                                    <Text style={styles.patientName}>{apt.patient?.name || 'مريض غير معروف'}</Text>
                                    {apt.patient?.patient_unique_id ? (
                                        <Text style={styles.patientMeta}>ID: {apt.patient.patient_unique_id}</Text>
                                    ) : null}
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
                                {apt.price ? (
                                    <View style={styles.dateTimePill}>
                                        <Ionicons name="cash-outline" size={14} color="#64748B" />
                                        <Text style={styles.dateText}>{apt.price.toLocaleString()} ل.س</Text>
                                    </View>
                                ) : null}
                            </View>

                            {(apt.reason || apt.notes) ? (
                                <View style={styles.reasonBox}>
                                    <Text style={styles.reasonLabel}>سبب الزيارة / الشكوى</Text>
                                    <Text style={styles.reasonText}>{apt.reason || apt.notes}</Text>
                                </View>
                            ) : null}

                            <View style={styles.contactRow}>
                                {apt.patient?.phone ? (
                                    <TouchableOpacity style={styles.contactPill} onPress={() => callPatient(apt.patient.phone)}>
                                        <Ionicons name="call-outline" size={14} color="#0EA5E9" />
                                        <Text style={styles.contactText}>{apt.patient.phone}</Text>
                                    </TouchableOpacity>
                                ) : null}
                                {apt.patient?.email && !apt.patient.email.includes('provisional_') ? (
                                    <View style={styles.contactPill}>
                                        <Ionicons name="mail-outline" size={14} color="#64748B" />
                                        <Text style={styles.contactText} numberOfLines={1}>{apt.patient.email}</Text>
                                    </View>
                                ) : null}
                                {apt.patient?.city ? (
                                    <View style={styles.contactPill}>
                                        <Ionicons name="location-outline" size={14} color="#64748B" />
                                        <Text style={styles.contactText}>{apt.patient.city}</Text>
                                    </View>
                                ) : null}
                            </View>


                            {/* Reschedule/Cancel request indicators */}
                            {apt.status === 'schedule_change_pending' && (
                                <View style={[styles.dateTimePill, { backgroundColor: '#EDE9FE' }]}>
                                    <MaterialCommunityIcons name="account-clock" size={14} color="#7C3AED" />
                                    <Text style={[styles.dateText, { color: '#7C3AED' }]}>
                                        تعديل مقترح: {apt.requested_date} {apt.requested_time} — بانتظار المريض
                                    </Text>
                                </View>
                            )}
                            {apt.status === 'reschedule_requested' && (
                                <View style={[styles.dateTimePill, { backgroundColor: '#FEF3C7' }]}>
                                    <MaterialCommunityIcons name="calendar-edit" size={14} color="#D97706" />
                                    <Text style={[styles.dateText, { color: '#D97706' }]}>طلب إعادة جدولة من المريض</Text>
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
                                <>
                                    {apt.rejection_note ? (
                                        <View style={[styles.dateTimePill, { backgroundColor: '#FEF2F2', marginBottom: 8 }]}>
                                            <Text style={[styles.dateText, { color: '#991B1B', textAlign: 'right' }]}>
                                                سبب المريض: {apt.rejection_note}
                                            </Text>
                                        </View>
                                    ) : null}
                                    <View style={styles.actions}>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.cancelBtn]}
                                            onPress={() => handleStatusUpdate(apt.id, apt.status_before_change || 'confirmed')}
                                        >
                                            <Text style={styles.cancelBtnText}>رفض الإلغاء</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.confirmBtn]}
                                            onPress={() => handleStatusUpdate(apt.id, 'cancelled', apt.rejection_note)}
                                        >
                                            <Text style={styles.confirmBtnText}>تأكيد الإلغاء</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}

                            {apt.status === 'schedule_change_pending' && (
                                <View style={[styles.dateTimePill, { backgroundColor: '#F3F4F6', marginBottom: 8 }]}>
                                    <Text style={[styles.dateText, { color: '#6B7280', textAlign: 'right' }]}>
                                        الموعد الحالي: {apt.date} {apt.time}
                                    </Text>
                                </View>
                            )}

                            {apt.status === 'pending' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, styles.cancelBtn]}
                                        onPress={() => openReasonModal(apt.id, 'rejected')}
                                    >
                                        <Text style={styles.cancelBtnText}>رفض</Text>
                                    </TouchableOpacity>
                                    {apt.status !== 'schedule_change_pending' && (
                                        <TouchableOpacity 
                                            style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
                                            onPress={() => openEditModal(apt)}
                                        >
                                            <Text style={styles.confirmBtnText}>تعديل</Text>
                                        </TouchableOpacity>
                                    )}
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
                                        onPress={() => openReasonModal(apt.id, 'cancelled')}
                                    >
                                        <Text style={styles.cancelBtnText}>إلغاء</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { backgroundColor: '#6366F1' }]}
                                        onPress={() => openEditModal(apt)}
                                    >
                                        <Text style={styles.confirmBtnText}>تعديل</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, styles.confirmBtn]}
                                        onPress={() => router.push({ pathname: '/(doctor)/consultation-report', params: { appointmentId: apt.id, patientId: apt.patient_id, patientName: apt.patient?.name || '' } } as any)}
                                    >
                                        <Text style={styles.confirmBtnText}>إنهاء الجلسة</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {apt.status === 'completed' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#6366F1', flex: 1 }]}
                                        onPress={() => router.push({
                                            pathname: '/(doctor)/consultation-report',
                                            params: {
                                                appointmentId: apt.id,
                                                patientId: apt.patient_id,
                                                patientName: apt.patient?.name || '',
                                            },
                                        } as any)}
                                    >
                                        <Text style={styles.confirmBtnText}>عرض التقرير</Text>
                                    </TouchableOpacity>
                                    {apt.patient?.phone ? (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.confirmBtn, { flex: 1 }]}
                                            onPress={() => callPatient(apt.patient.phone)}
                                        >
                                            <Text style={styles.confirmBtnText}>اتصال</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            )}
                        </Animated.View>
                    ))
                )}
            </ScrollView>

            {/* Reject / cancel reason modal */}
            <Modal visible={editModal.visible} transparent animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
                            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24 }}>
                                <Text style={{ fontSize: 18, fontFamily: 'Cairo_700Bold', textAlign: 'center', marginBottom: 16 }}>تعديل الموعد</Text>
                                <Text style={{ fontSize: 13, fontFamily: 'Cairo_700Bold', textAlign: 'right', marginBottom: 6 }}>التاريخ (YYYY-MM-DD)</Text>
                                <TextInput style={styles.editInput} value={newDate} onChangeText={setNewDate} placeholder="2026-06-15" textAlign="right" />
                                <Text style={{ fontSize: 13, fontFamily: 'Cairo_700Bold', textAlign: 'right', marginTop: 12, marginBottom: 6 }}>الوقت</Text>
                                <TextInput style={styles.editInput} value={newTime} onChangeText={setNewTime} placeholder="10:00" textAlign="right" />
                                <Text style={{ fontSize: 13, fontFamily: 'Cairo_700Bold', textAlign: 'right', marginTop: 12, marginBottom: 6 }}>سبب التعديل *</Text>
                                <TextInput
                                    style={[styles.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
                                    value={modificationReason}
                                    onChangeText={setModificationReason}
                                    placeholder="اكتب سبب تعديل الموعد..."
                                    multiline
                                    textAlign="right"
                                />
                                <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 16 }}>
                                    <TouchableOpacity style={{ flex: 1, paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' }} onPress={() => setEditModal({ visible: false, aptId: '', status: 'pending' })}>
                                        <Text style={{ fontFamily: 'Cairo_700Bold', color: '#6B7280' }}>إلغاء</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={{ flex: 1.5, paddingVertical: 12, backgroundColor: '#6366F1', borderRadius: 12, alignItems: 'center' }} onPress={submitReschedule}>
                                        <Text style={{ fontFamily: 'Cairo_700Bold', color: '#FFF' }}>إرسال للمريض</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <Modal visible={actionModal.visible} transparent animationType="slide">
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 32 : 24, maxHeight: '75%' }}>
                        <Text style={{ fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'center', marginBottom: 16 }}>
                            {actionModal.targetStatus === 'cancelled' ? 'سبب الإلغاء' : 'سبب الرفض'}
                        </Text>
                        
                        {ACTION_REASONS.map((reason) => (
                            <TouchableOpacity 
                                key={reason.type} 
                                style={{ 
                                    paddingVertical: 14, 
                                    borderBottomWidth: 1, 
                                    borderBottomColor: '#F3F4F6', 
                                    flexDirection: 'row-reverse', 
                                    alignItems: 'center', 
                                    gap: 8,
                                    backgroundColor: actionReasonType === reason.type ? '#EBF5FF' : 'transparent',
                                    borderRadius: 8,
                                    paddingHorizontal: 8,
                                }}
                                onPress={() => setActionReasonType(reason.type)}
                            >
                                <MaterialCommunityIcons 
                                    name={actionReasonType === reason.type ? "radiobox-marked" : "radiobox-blank"} 
                                    size={20} 
                                    color={actionReasonType === reason.type ? "#1E88E5" : "#6B7280"} 
                                />
                                <Text style={{ fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#374151', flex: 1, textAlign: 'right' }}>{reason.label}</Text>
                            </TouchableOpacity>
                        ))}

                        {/* Extra fields for wrong_specialty */}
                        {actionReasonType === 'wrong_specialty' && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={{ fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'right', marginBottom: 6 }}>التخصص المناسب (اختياري)</Text>
                                <TextInput
                                    style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 44, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', textAlign: 'right' }}
                                    placeholder="مثال: طب الأعصاب"
                                    value={actionRecommendedSpec}
                                    onChangeText={setActionRecommendedSpec}
                                />
                            </View>
                        )}

                        {actionReasonType === 'other' && (
                            <View style={{ marginTop: 12 }}>
                                <Text style={{ fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'right', marginBottom: 6 }}>اكتب السبب *</Text>
                                <TextInput
                                    style={{ backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', minHeight: 80, paddingHorizontal: 14, paddingVertical: 10, fontFamily: 'Cairo_400Regular', textAlign: 'right', textAlignVertical: 'top' }}
                                    placeholder={actionModal.targetStatus === 'cancelled' ? 'اكتب سبب الإلغاء...' : 'اكتب سبب الرفض...'}
                                    value={actionCustomNote}
                                    onChangeText={setActionCustomNote}
                                    multiline
                                />
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity 
                                style={{ flex: 1, paddingVertical: 12, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' }}
                                onPress={() => setActionModal({ visible: false, aptId: '', targetStatus: 'rejected' })}
                            >
                                <Text style={{ fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#6B7280' }}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={{ flex: 1, paddingVertical: 12, backgroundColor: actionReasonType ? '#EF4444' : '#D1D5DB', borderRadius: 12, alignItems: 'center' }}
                                onPress={submitReasonAction}
                                disabled={!actionReasonType}
                            >
                                <Text style={{ fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' }}>
                                    {actionModal.targetStatus === 'cancelled' ? 'تأكيد الإلغاء' : 'تأكيد الرفض'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    </ScrollView>
                </View>
                </KeyboardAvoidingView>
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
    filterScroll: { flexDirection: 'row-reverse', gap: 8, paddingVertical: 4 },
    filterChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
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

    dateTimeContainer: { backgroundColor: '#F8FAFC', borderRadius: 15, padding: 12, flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-around', gap: 8, marginBottom: 12 },
    reasonBox: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 12, borderRightWidth: 3, borderRightColor: '#F59E0B' },
    reasonLabel: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#B45309', textAlign: 'right', marginBottom: 4 },
    reasonText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#78350F', textAlign: 'right', lineHeight: 20 },
    contactRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    contactPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, maxWidth: '100%' },
    contactText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#475569', maxWidth: 160 },
    dateTimePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#475569' },

    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    confirmBtn: { backgroundColor: '#0EA5E9' },
    cancelBtn: { backgroundColor: '#F1F5F9' },
    confirmBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    cancelBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#64748B' },
    editInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: 'Cairo_400Regular',
        fontSize: 14,
    },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 15 },
    fab: { position: 'absolute', bottom: TAB_BAR_FAB_BOTTOM, left: 20, zIndex: 100 },
    fabGrad: { width: 58, height: 58, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#1E88E5', shadowOpacity: 0.4, shadowRadius: 10 },
});
