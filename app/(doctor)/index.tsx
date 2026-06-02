import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, RefreshControl, Dimensions,
    Platform, Pressable, TextInput, Modal, KeyboardAvoidingView, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { api, BASE_URL } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors } from '../../src/theme';

const { width } = Dimensions.get('window');
const LOGO_IMG = require('../../assets/Logo Design.png');

export default function DoctorDashboard() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const getFullUrl = (path?: string) => {
        if (!path) return 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80';
        if (path.startsWith('http')) return path;
        const root = BASE_URL.replace('/api', '');
        return `${root}${path}`;
    };

    const [stats, setStats] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [editModal, setEditModal] = useState<{ visible: boolean; aptId: string; status: string }>({
        visible: false, aptId: '', status: 'pending',
    });
    const [newDate, setNewDate] = useState('');
    const [newTime, setNewTime] = useState('');
    const [modificationReason, setModificationReason] = useState('');

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const [apts, analytics] = await Promise.all([
                api.getAppointments({ doctor_id: user.id }),
                api.getDoctorAnalytics(user.id)
            ]);
            setAppointments(apts);
            setStats(analytics);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user])
    );

    const activeApts = appointments.filter(a => a.status === 'confirmed').length;
    const pendingApts = appointments.filter(a => a.status === 'pending').length;
    const actionAppointments = appointments.filter(a =>
        a.status === 'cancellation_requested' || a.status === 'reschedule_requested'
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#10B981';
            case 'pending': return '#F59E0B';
            case 'completed': return '#3B82F6';
            case 'cancelled': return '#EF4444';
            case 'cancellation_requested': return '#DC2626';
            case 'reschedule_requested': return '#D97706';
            default: return '#64748B';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'confirmed': return 'مؤكد';
            case 'pending': return 'قيد الانتظار';
            case 'completed': return 'مكتمل';
            case 'cancelled': return 'ملغى';
            case 'cancellation_requested': return 'طلب إلغاء';
            case 'reschedule_requested': return 'طلب إعادة جدولة';
            default: return status;
        }
    };

    const handleStatusUpdate = async (
        appointmentId: string,
        newStatus: string,
        date?: string,
        time?: string,
        rejectionNote?: string,
        modificationNote?: string,
    ) => {
        try {
            await api.put(`/appointments/${appointmentId}/status`, {
                status: newStatus,
                date,
                time,
                rejection_note: rejectionNote,
                modification_note: modificationNote,
            });
            setEditModal({ visible: false, aptId: '', status: 'pending' });
            setModificationReason('');
            loadData();
        } catch (e: any) {
            const msg = e?.message || 'فشل تحديث الموعد';
            Alert.alert('خطأ', msg);
            if (msg.includes('غير موجود')) {
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
            if (e?.message?.includes('غير موجود')) loadData();
        }
    };


    if (loading) return (
        <View style={styles.loading}>
            <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
            {/* Luxury Header */}
            <View style={styles.headerPremium}>
                <View style={styles.topActions}>
                    <TouchableOpacity onPress={logout} style={styles.actionBtnHeader}>
                        <Ionicons name="log-out-outline" size={22} color="#1E293B" />
                    </TouchableOpacity>
                    <View style={styles.logoWrapper}>
                        <Image source={LOGO_IMG} style={styles.logoImg} resizeMode="contain" tintColor="#1E88E5" />
                    </View>
                    <TouchableOpacity style={styles.actionBtnHeader} onPress={() => router.push('/(doctor)/notifications' as any)}>
                        <View style={styles.notiBadge} />
                        <Ionicons name="notifications-outline" size={22} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                <View style={styles.heroSection}>
                    <View style={styles.heroTextContent}>
                        <Text style={styles.heroGreeting}>أهلاً بك، دكتور</Text>
                        <Text style={styles.heroName}>{user?.name}</Text>
                    </View>
                    <View style={styles.avatarBorder}>
                        <Image 
                            source={{ 
                                uri: getFullUrl(user?.photo),
                                headers: { 'Bypass-Tunnel-Reminder': 'true' }
                            }} 
                            style={styles.avatarImg} 
                        />
                    </View>
                </View>
            </View>

            {/* Consolidated Stats Card */}
            <Animated.View entering={FadeInDown.duration(800)} style={styles.unifiedStatsCard}>
                <View style={styles.statColumn}>
                    <View style={[styles.statIconCircle, { backgroundColor: '#EEF2FF' }]}>
                        <Ionicons name="people" size={20} color="#6366F1" />
                    </View>
                    <Text style={styles.statValLarge}>{activeApts}</Text>
                    <Text style={styles.statLabelSmall}>مرضى بانتظارك</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statColumn}>
                    <View style={[styles.statIconCircle, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="wallet" size={20} color="#10B981" />
                    </View>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 }}>
                        <Text style={styles.statValLarge}>{stats?.revenue_summary?.this_month?.toLocaleString() || '0'}</Text>
                        <Text style={styles.statCurrSmall}>ل.س</Text>
                    </View>
                    <Text style={styles.statLabelSmall}>دخل الشهر الحالي</Text>
                </View>
            </Animated.View>

            {/* Patient requests needing doctor action */}
            {actionAppointments.length > 0 && (
                <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
                    <View style={styles.sectionHeader}>
                        <TouchableOpacity onPress={() => router.push('/(doctor)/appointments' as any)}>
                            <Text style={styles.viewAll}>عرض الكل</Text>
                        </TouchableOpacity>
                        <Text style={styles.sectionTitle}>طلبات تحتاج إجراءاً</Text>
                    </View>
                    {actionAppointments.map((apt) => (
                        <View key={apt.id} style={styles.actionRequestCard}>
                            <View style={styles.actionRequestHeader}>
                                <View style={[styles.statusTag, { backgroundColor: getStatusColor(apt.status) + '22' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(apt.status) }]}>
                                        {getStatusLabel(apt.status)}
                                    </Text>
                                </View>
                                <Text style={styles.actionPatientName}>{apt.patient?.name || 'مريض'}</Text>
                            </View>
                            <Text style={styles.actionMeta}>{apt.date} — {apt.time}</Text>
                            {apt.status === 'cancellation_requested' && apt.rejection_note ? (
                                <Text style={styles.actionReason}>سبب المريض: {apt.rejection_note}</Text>
                            ) : null}
                            {apt.status === 'reschedule_requested' && apt.requested_date ? (
                                <Text style={styles.actionReason}>
                                    موعد مقترح: {apt.requested_date} — {apt.requested_time}
                                </Text>
                            ) : null}
                            <View style={styles.aptActionsRow}>
                                {apt.status === 'cancellation_requested' && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.aptActionBtn, styles.rejectBtn]}
                                            onPress={() => handleStatusUpdate(apt.id, apt.status_before_change || 'confirmed')}
                                        >
                                            <Text style={styles.aptActionText}>رفض الإلغاء</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.aptActionBtn, styles.approveBtn]}
                                            onPress={() => handleStatusUpdate(apt.id, 'cancelled', undefined, undefined, apt.rejection_note)}
                                        >
                                            <Text style={styles.aptActionText}>تأكيد الإلغاء</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                                {apt.status === 'reschedule_requested' && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.aptActionBtn, styles.rejectBtn]}
                                            onPress={() => api.respondReschedule(apt.id, { action: 'reject', rejection_note: 'تم رفض طلب إعادة الجدولة' }).then(loadData)}
                                        >
                                            <Text style={styles.aptActionText}>رفض</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.aptActionBtn, styles.approveBtn]}
                                            onPress={() => api.respondReschedule(apt.id, { action: 'approve' }).then(() => { Alert.alert('تم', 'تمت الموافقة'); loadData(); })}
                                        >
                                            <Text style={styles.aptActionText}>موافقة</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Today's Schedule */}
            <View style={{ marginTop: 25 }}>
                <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
                    <TouchableOpacity onPress={() => router.push('/(doctor)/appointments')}>
                        <Text style={styles.viewAll}>عرض الكل</Text>
                    </TouchableOpacity>
                    <Text style={styles.sectionTitle}>مواعيد اليوم</Text>
                </View>

                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.aptScrollContent}
                    style={styles.aptScroll}
                    decelerationRate="fast"
                    snapToInterval={width - 22}
                    snapToAlignment="start"
                >
                    {appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length === 0 ? (
                        <View style={styles.emptyApts}>
                            <MaterialCommunityIcons name="calendar-blank" size={40} color="#CBD5E1" />
                            <Text style={styles.emptyText}>لا يوجد مواعيد مقررة حالياً</Text>
                        </View>
                    ) : (
                        appointments
                            .filter(a => a.status !== 'completed' && a.status !== 'cancelled')
                            .slice(0, 5)
                            .map((apt, idx) => (
                                <Animated.View
                                    key={apt.id}
                                    entering={FadeInRight.delay(idx * 150)}
                                    style={styles.aptCard}
                                >
                                    <View style={styles.aptCardTop}>
                                        <View style={styles.aptCardText}>
                                            <Text style={styles.patientName}>{apt.patient?.name || apt.patient?.id || 'مريض غير معروف'}</Text>
                                            <Text style={styles.patientSpecialization}>كشف عام</Text>
                                        </View>
                                        <View style={styles.patientIconCircle}>
                                            <Ionicons name="person" size={24} color="#5D5FEF" />
                                        </View>
                                    </View>

                                    <View style={styles.aptCardBottom}>
                                        <View style={styles.aptDetailPill}>
                                            <Ionicons name="time-outline" size={14} color="#FFF" />
                                            <Text style={styles.aptDetailText}>{apt.time}</Text>
                                        </View>
                                        <View style={styles.aptDetailPill}>
                                            <Ionicons name="calendar-outline" size={14} color="#FFF" />
                                            <Text style={styles.aptDetailText}>{apt.date}</Text>
                                        </View>
                                    </View>

                                    {apt.status === 'pending' && (
                                        <View style={styles.aptActionsRow}>
                                            <TouchableOpacity 
                                                style={[styles.aptActionBtn, styles.approveBtn]}
                                                onPress={() => handleStatusUpdate(apt.id, 'confirmed')}
                                            >
                                                <Ionicons name="checkmark" size={18} color="#FFF" />
                                                <Text style={styles.aptActionText}>قبول</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.aptActionBtn, styles.rescheduleBtn]}
                                                onPress={() => openEditModal(apt)}
                                            >
                                                <Ionicons name="time-outline" size={18} color="#FFF" />
                                                <Text style={styles.aptActionText}>تعديل</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.aptActionBtn, styles.rejectBtn]}
                                                onPress={() => router.push('/(doctor)/appointments' as any)}
                                            >
                                                <Ionicons name="close" size={18} color="#FFF" />
                                                <Text style={styles.aptActionText}>رفض</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                </Animated.View>
                            ))
                    )}
                </ScrollView>
            </View>

            <View style={{ height: 60 }} />

            <View style={{ height: 100 }} />

            <Modal visible={editModal.visible} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                        >
                            <View style={styles.editModalSheet}>
                                <Text style={styles.editModalTitle}>تعديل الموعد</Text>
                                <Text style={styles.editModalLabel}>التاريخ (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.editModalInput}
                                    value={newDate}
                                    onChangeText={setNewDate}
                                    placeholder="2026-06-15"
                                    textAlign="right"
                                />
                                <Text style={styles.editModalLabel}>الوقت</Text>
                                <TextInput
                                    style={styles.editModalInput}
                                    value={newTime}
                                    onChangeText={setNewTime}
                                    placeholder="10:00"
                                    textAlign="right"
                                />
                                <Text style={styles.editModalLabel}>سبب التعديل *</Text>
                                <TextInput
                                    style={[styles.editModalInput, { minHeight: 80, textAlignVertical: 'top' }]}
                                    value={modificationReason}
                                    onChangeText={setModificationReason}
                                    placeholder="مثال: ظرف طارئ، تأجيل بسبب عملية..."
                                    multiline
                                    textAlign="right"
                                />
                                <View style={styles.editModalActions}>
                                    <TouchableOpacity
                                        style={styles.editModalCancel}
                                        onPress={() => setEditModal({ visible: false, aptId: '', status: 'pending' })}
                                    >
                                        <Text style={styles.editModalCancelText}>إلغاء</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.editModalConfirm} onPress={submitReschedule}>
                                        <Text style={styles.editModalConfirmText}>إرسال للمريض</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerPremium: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, backgroundColor: '#FFF' },
    topActions: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    logoWrapper: { width: 120, height: 35 },
    logoImg: { width: '100%', height: '100%' },
    actionBtnHeader: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    notiBadge: { position: 'absolute', top: 12, left: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', zIndex: 1, borderWidth: 2, borderColor: '#FFF' },
    
    heroSection: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    heroTextContent: { alignItems: 'flex-end' },
    heroGreeting: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8' },
    heroName: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#1E293B', marginTop: 2 },
    avatarBorder: { width: 64, height: 64, borderRadius: 24, borderWidth: 3, borderColor: '#F1F5F9', padding: 2 },
    avatarImg: { width: '100%', height: '100%', borderRadius: 20 },

    unifiedStatsCard: { 
        flexDirection: 'row-reverse', 
        backgroundColor: '#FFF', 
        marginHorizontal: 20, 
        marginTop: -35, 
        borderRadius: 30, 
        padding: 24, 
        elevation: 15, 
        shadowColor: '#1E293B', 
        shadowOpacity: 0.08, 
        shadowRadius: 20,
        alignItems: 'center'
    },
    statColumn: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, height: 50, backgroundColor: '#F1F5F9' },
    statIconCircle: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValLarge: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    statLabelSmall: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 2 },
    statCurrSmall: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#64748B' },

    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    sectionTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    viewAll: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#0EA5E9' },

    aptScroll: { marginTop: 5 },
    aptScrollContent: { paddingHorizontal: 20, gap: 18 },
    aptCard: { backgroundColor: '#5D5FEF', borderRadius: 28, padding: 24, width: width - 40, elevation: 8, shadowColor: '#5D5FEF', shadowOpacity: 0.25, shadowRadius: 15 },
    patientIconCircle: { width: 55, height: 55, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    
    emptyApts: { alignItems: 'center', padding: 40, backgroundColor: '#F8FAFC', borderRadius: 30, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#E2E8F0', width: width - 40 },
    emptyText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#94A3B8', marginTop: 10 },

    aptCardTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    aptCardText: { flex: 1, marginRight: 15, alignItems: 'flex-end' },
    patientName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    patientSpecialization: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    aptCardBottom: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 15, padding: 12, flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center' },
    aptDetailPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    aptDetailText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#FFF' },
    statusTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    statusText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },

    shortcuts: { flexDirection: 'row-reverse', paddingHorizontal: 20, gap: 15, marginTop: 20 },
    shortcutCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 20, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    scIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    scText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    tooltip: {
        position: 'absolute',
        backgroundColor: '#1E293B',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
        zIndex: 100,
    },
    tooltipText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Cairo_700Bold',
    },
    aptActionsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        marginTop: 15,
        gap: 10
    },
    aptActionBtn: {
        flex: 1,
        height: 40,
        borderRadius: 12,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6
    },
    approveBtn: {
        backgroundColor: '#10B981',
    },
    rejectBtn: {
        backgroundColor: '#EF4444',
    },
    rescheduleBtn: {
        backgroundColor: '#6366F1',
    },
    aptActionText: {
        color: '#FFF',
        fontFamily: 'Cairo_700Bold',
        fontSize: 13
    },
    editModalSheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    },
    editModalTitle: {
        fontSize: 18,
        fontFamily: 'Cairo_700Bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
    },
    editModalLabel: {
        fontSize: 13,
        fontFamily: 'Cairo_700Bold',
        color: '#374151',
        textAlign: 'right',
        marginBottom: 6,
        marginTop: 10,
    },
    editModalInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontFamily: 'Cairo_400Regular',
        fontSize: 14,
        color: '#111827',
    },
    editModalActions: {
        flexDirection: 'row-reverse',
        gap: 10,
        marginTop: 20,
    },
    editModalCancel: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    editModalCancelText: { fontFamily: 'Cairo_700Bold', color: '#64748B' },
    editModalConfirm: {
        flex: 1.5,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#6366F1',
        alignItems: 'center',
    },
    editModalConfirmText: { fontFamily: 'Cairo_700Bold', color: '#FFF' },

    actionRequestCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
        elevation: 4,
        shadowColor: '#DC2626',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    actionRequestHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionPatientName: {
        fontSize: 16,
        fontFamily: 'Cairo_700Bold',
        color: '#1E293B',
        flex: 1,
        textAlign: 'right',
    },
    actionMeta: {
        fontSize: 13,
        fontFamily: 'Cairo_600SemiBold',
        color: '#64748B',
        textAlign: 'right',
        marginBottom: 6,
    },
    actionReason: {
        fontSize: 12,
        fontFamily: 'Cairo_400Regular',
        color: '#991B1B',
        textAlign: 'right',
        marginBottom: 10,
        backgroundColor: '#FEF2F2',
        padding: 10,
        borderRadius: 10,
    },
});
