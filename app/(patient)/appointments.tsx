import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, Dimensions, Alert, Modal, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import ArabicCalendar from '../../src/components/ArabicCalendar';

const { width } = Dimensions.get('window');

const STATUS_MAP: Record<string, { label: string, color: string, icon: string }> = {
    'pending': { label: 'في انتظار الموافقة', color: '#F59E0B', icon: 'clock-outline' },
    'confirmed': { label: 'موعد مؤكد', color: '#10B981', icon: 'check-circle-outline' },
    'completed': { label: 'موعد مكتمل', color: '#3B82F6', icon: 'checkbox-marked-circle-outline' },
    'cancelled': { label: 'ملغي', color: '#EF4444', icon: 'close-circle-outline' },
    'rejected': { label: 'مرفوض', color: '#EF4444', icon: 'close-circle-outline' },
    'reschedule_requested': { label: 'طلب إعادة جدولة', color: '#D97706', icon: 'calendar-edit' },
    'cancellation_requested': { label: 'طلب إلغاء', color: '#EF4444', icon: 'close-circle-outline' },
    'patient_confirmation_pending': { label: 'بانتظار موافقتك', color: '#7C3AED', icon: 'account-clock-outline' },
};

export default function AppointmentsScreen() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rescheduleModal, setRescheduleModal] = useState<{ visible: boolean; aptId: string; doctorId: string }>({ visible: false, aptId: '', doctorId: '' });
    const now = new Date();
    const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState('');
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());
    const [currentYear, setCurrentYear] = useState(now.getFullYear());
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [bookedSlots, setBookedSlots] = useState<any[]>([]);

    const load = async () => {
        try {
            if (user?.id) {
                const data = await api.getAppointments({ patient_id: user.id });
                // Sort by date descending
                const sorted = data.sort((a,b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
                setAppointments(sorted);
            }
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            load();
        }, [user?.id])
    );

    const loadRescheduleSlots = async (doctorId: string, date: string) => {
        try {
            const av = await api.getDoctorAvailability(doctorId, date);
            setTimeSlots(av.time_slots || []);
            setBookedSlots(av.booked_slots || []);
            if (av.day_off) {
                setSelectedTime('');
                Alert.alert('تنبيه', 'الطبيب غير متاح في هذا اليوم');
            }
        } catch (e: any) {
            console.warn(e);
            Alert.alert('خطأ', e.message || 'تعذر تحميل الأوقات المتاحة');
        }
    };

    const handleRequestReschedule = async (aptId: string, doctorId: string) => {
        setRescheduleModal({ visible: true, aptId, doctorId });
        setSelectedTime('');
        await loadRescheduleSlots(doctorId, selectedDate);
    };

    useEffect(() => {
        if (!rescheduleModal.visible || !rescheduleModal.doctorId) return;
        loadRescheduleSlots(rescheduleModal.doctorId, selectedDate);
    }, [selectedDate, rescheduleModal.visible, rescheduleModal.doctorId]);

    const submitReschedule = async () => {
        if (!selectedDate || !selectedTime) {
            Alert.alert('تنبيه', 'يرجى اختيار التاريخ والوقت الجديد');
            return;
        }
        try {
            await api.requestReschedule(rescheduleModal.aptId, selectedDate, selectedTime);
            Alert.alert('تم', 'تم إرسال طلب إعادة الجدولة للطبيب');
            setRescheduleModal({ visible: false, aptId: '', doctorId: '' });
            load();
        } catch (e: any) {
            const msg = e?.message || 'فشل إرسال الطلب';
            Alert.alert('خطأ', msg);
            if (msg.includes('غير موجود')) {
                setRescheduleModal({ visible: false, aptId: '', doctorId: '' });
                load();
            }
        }
    };

    const handlePatientStatusUpdate = async (
        aptId: string,
        status: string,
        rejectionNote?: string,
    ) => {
        try {
            await api.updateAppointmentStatus(aptId, status, undefined, undefined, rejectionNote);
            await load();
        } catch (e: any) {
            const msg = e?.message || 'فشل تحديث الموعد';
            Alert.alert('خطأ', msg);
            if (msg.includes('غير موجود')) {
                await load();
            }
        }
    };

    const handleRequestCancel = (aptId: string) => {
        Alert.alert('طلب إلغاء', 'هل تريد طلب إلغاء هذا الموعد؟', [
            { text: 'لا', style: 'cancel' },
            { text: 'نعم', style: 'destructive', onPress: async () => {
                try {
                    await api.requestCancelAppointment(aptId);
                    Alert.alert('تم', 'تم إرسال طلب الإلغاء للطبيب');
                    load();
                } catch (e: any) { Alert.alert('خطأ', e.message); }
            }},
        ]);
    };

    const renderAppointment = ({ item }: { item: any }) => {
        const status = STATUS_MAP[item.status] || { label: item.status, color: '#6B7280', icon: 'help-circle-outline' };
        
        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.9}>
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                        <MaterialCommunityIcons name={status.icon as any} size={14} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Text style={styles.dateText}>{item.date}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.docIconBox}>
                        <LinearGradient
                            colors={['#1E88E5', '#43A047']}
                            style={styles.docIconGradient}
                            start={{x:0,y:0}} end={{x:1,y:1}}
                        >
                            <MaterialCommunityIcons name="doctor" size={24} color="#FFF" />
                        </LinearGradient>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.docName}>د. {item.doctor_name || item.doctor_id}</Text>
                        <View style={styles.timeRow}>
                            <Ionicons name="time-outline" size={14} color="#6B7280" />
                            <Text style={styles.timeText}>{item.time}</Text>
                        </View>
                    </View>
                </View>

                {item.notes && (
                    <View style={styles.notesBox}>
                        <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
                    </View>
                )}

                {item.rejection_note && (
                    <View style={[styles.notesBox, { backgroundColor: '#FEF2F2' }]}>
                        <Text style={[styles.notesText, { color: '#EF4444' }]}>
                            {item.status === 'cancelled' ? 'سبب الإلغاء' : 'سبب الرفض'}: {item.rejection_note}
                        </Text>
                    </View>
                )}

                {item.reschedule_requested && (
                    <View style={[styles.notesBox, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.notesText, { color: '#D97706' }]}>إعادة جدولة معلقة ✈️</Text>
                    </View>
                )}

                {item.cancel_requested && (
                    <View style={[styles.notesBox, { backgroundColor: '#FEF2F2' }]}>
                        <Text style={[styles.notesText, { color: '#DC2626' }]}>إلغاء معلق ❌</Text>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.priceTag}>
                        <Text style={styles.priceVal}>{item.price?.toLocaleString()} ل.س</Text>
                    </View>
                    {item.status === 'patient_confirmation_pending' && (
                        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                            <TouchableOpacity style={[styles.detailsBtn, { backgroundColor: '#DCFCE7' }]} onPress={() => handlePatientStatusUpdate(item.id, 'confirmed')}>
                                <MaterialCommunityIcons name="check" size={14} color="#16A34A" />
                                <Text style={[styles.detailsBtnText, { color: '#16A34A' }]}>قبول</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.detailsBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handlePatientStatusUpdate(item.id, 'rejected', 'رفض المريض الموعد المقترح')}>
                                <MaterialCommunityIcons name="close" size={14} color="#EF4444" />
                                <Text style={[styles.detailsBtnText, { color: '#EF4444' }]}>رفض</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {(item.status === 'pending' || item.status === 'confirmed') && (
                        <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                            <TouchableOpacity style={[styles.detailsBtn, { backgroundColor: '#FEF3C7' }]} onPress={() => handleRequestReschedule(item.id, item.doctor_id)}>
                                <MaterialCommunityIcons name="calendar-edit" size={14} color="#D97706" />
                                <Text style={[styles.detailsBtnText, { color: '#D97706' }]}>إعادة جدولة</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.detailsBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleRequestCancel(item.id)}>
                                <MaterialCommunityIcons name="close-circle-outline" size={14} color="#EF4444" />
                                <Text style={[styles.detailsBtnText, { color: '#EF4444' }]}>إلغاء</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1E88E5', '#43A047']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Text style={styles.headerTitle}>مواعيدي</Text>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#1E88E5" size="large" />
                </View>
            ) : appointments.length === 0 ? (
                <View style={styles.empty}>
                    <View style={styles.emptyCircle}>
                        <MaterialCommunityIcons name="calendar-blank" size={80} color="#E5E7EB" />
                    </View>
                    <Text style={styles.emptyTitle}>لا توجد مواعيد</Text>
                    <Text style={styles.emptySub}>لم تقم بحجز أي مواعيد طبية بعد</Text>
                </View>
            ) : (
                <FlatList
                    data={appointments}
                    renderItem={renderAppointment}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onRefresh={load}
                    refreshing={loading}
                />
            )}
            <Modal visible={rescheduleModal.visible} animationType="slide" transparent>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                    >
                    <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20, maxHeight: '85%' }}>
                        <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>اختر موعداً جديداً</Text>
                        <ArabicCalendar
                            month={currentMonth}
                            year={currentYear}
                            selectedDate={selectedDate}
                            onSelect={setSelectedDate}
                            onPrevMonth={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); }}
                            onNextMonth={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); }}
                        />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 4, flexDirection: 'row-reverse' }}>
                            {timeSlots.map((time) => {
                                const booked = bookedSlots.some((s) => s.date === selectedDate && s.time === time);
                                return (
                                    <TouchableOpacity
                                        key={time}
                                        style={[{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: booked ? '#111827' : selectedTime === time ? '#1E88E5' : '#F1F5F9' }]}
                                        onPress={() => booked ? Alert.alert('محجوز', 'هذا الموعد محجوز بالفعل') : setSelectedTime(time)}
                                    >
                                        <Text style={{ fontFamily: 'Cairo_600SemiBold', color: booked || selectedTime === time ? '#FFF' : '#475569', fontSize: 12 }}>{time}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 20 }}>
                            <TouchableOpacity style={{ flex: 1, backgroundColor: '#1E88E5', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }} onPress={submitReschedule}>
                                <Text style={{ fontFamily: 'Cairo_700Bold', color: '#FFF' }}>إرسال الطلب</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }} onPress={() => setRescheduleModal({ visible: false, aptId: '', doctorId: '' })}>
                                <Text style={{ fontFamily: 'Cairo_700Bold', color: '#64748B' }}>إلغاء</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    </ScrollView>
                </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 25,
        alignItems: 'center',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#111827', marginBottom: 8 },
    emptySub: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'center' },
    
    listContent: { padding: 20, paddingBottom: 120 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 15,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
    statusText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    dateText: { fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo_600SemiBold' },
    
    cardBody: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
    docIconBox: { width: 56, height: 56, borderRadius: 18, overflow: 'hidden' },
    docIconGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    infoCol: { flex: 1, alignItems: 'flex-end', paddingRight: 15 },
    docName: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827' },
    timeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    timeText: { fontSize: 13, color: '#6B7280', fontFamily: 'Cairo_600SemiBold' },
    
    notesBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14, marginBottom: 15 },
    notesText: { fontSize: 12, color: '#64748B', fontFamily: 'Cairo_400Regular', textAlign: 'right' },
    
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    priceTag: { backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    priceVal: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    detailsBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    detailsBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#1E88E5' }
});
