import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, Modal, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import ArabicCalendar from '../../../src/components/ArabicCalendar';

const DEFAULT_TIME_SLOTS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
];

export default function RadiologyProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [center, setCenter] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [bookingModal, setBookingModal] = useState(false);
    const [bookingForm, setBookingForm] = useState({ 
        service_name: '', 
        date: '', 
        time: '', 
        reason: '' 
    });
    const today = new Date();
    const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
    const [calendarYear, setCalendarYear] = useState(today.getFullYear());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getLab(id as string);
                setCenter(data);
            } catch (e) {
                console.warn(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const getPhotoUrl = (path: string) => {
        if (!path) return 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    const openBooking = (serviceName: string) => {
        const now = new Date();
        setCalendarMonth(now.getMonth());
        setCalendarYear(now.getFullYear());
        setBookingForm({
            service_name: serviceName,
            date: now.toISOString().split('T')[0],
            time: '',
            reason: '',
        });
        setBookingModal(true);
    };

    const goPrevMonth = () => {
        setCalendarMonth(prev => {
            if (prev === 0) {
                setCalendarYear(y => y - 1);
                return 11;
            }
            return prev - 1;
        });
    };

    const goNextMonth = () => {
        setCalendarMonth(prev => {
            if (prev === 11) {
                setCalendarYear(y => y + 1);
                return 0;
            }
            return prev + 1;
        });
    };

    const handleBook = async () => {
        if (!user?.id) { Alert.alert('تنبيه', 'يجب تسجيل الدخول'); return; }
        if (!bookingForm.service_name || !bookingForm.date || !bookingForm.time) { 
            Alert.alert('تنبيه', 'يرجى ملء جميع الحقول'); 
            return; 
        }
        setSubmitting(true);
        try {
            await api.createServiceBooking({
                patient_id: user.id,
                provider_id: id,
                provider_role: 'radiology',
                service_name: bookingForm.service_name,
                date: bookingForm.date,
                time: bookingForm.time,
                reason: bookingForm.reason,
            });
            setBookingModal(false);
            setBookingForm({ service_name: '', date: '', time: '', reason: '' });
            Alert.alert('✅ تم الحجز', 'تم حفظ الحجز في حجوزاتك بانتظار موافقة المركز', [
                { text: 'عرض حجوزاتي', onPress: () => router.replace({ pathname: '/(patient)/radiology', params: { tab: 'bookings' } } as any) },
            ]);
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <View style={styles.loaderArea}><ActivityIndicator size="large" color="#8B5CF6" /></View>;
    }

    if (!center) {
        return <View style={styles.loaderArea}><Text>المركز غير موجود</Text></View>;
    }

    const services = [
        { name: 'أشعة سينية (X-Ray)', icon: 'scan-outline' },
        { name: 'أشعة مقطعية (CT Scan)', icon: 'scan' },
        { name: 'رنين مغناطيسي (MRI)', icon: 'magnet-outline' },
        { name: 'موجات فوق صوتية (Ultrasound)', icon: 'pulse-outline' },
        { name: 'ماموجرام', icon: 'medical-outline' },
        { name: 'أشعة بانوراما للأسنان', icon: 'medical-outline' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.topImageContainer}>
                <Image 
                    source={{ 
                        uri: getPhotoUrl(center.photo),
                        headers: { 'Bypass-Tunnel-Reminder': 'true' }
                    }} 
                    style={styles.coverImage} 
                />
                <LinearGradient
                    colors={['rgba(139,92,246,0.6)', 'transparent', 'rgba(139,92,246,0.8)']}
                    style={styles.coverOverlay}
                />
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.favBtn}>
                        <Ionicons name="heart-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.titleArea}>
                    <Text style={styles.centerTitle}>{center.name}</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={16} color="#C4B5FD" />
                        <Text style={styles.locationText}>{center.address || center.city}</Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.infoRow}>
                    <View style={styles.infoCard}>
                        <Ionicons name="time-outline" size={22} color="#8B5CF6" />
                        <Text style={styles.infoText}>{center.open_hours || '08:00 - 20:00'}</Text>
                        <Text style={styles.infoLabel}>أوقات العمل</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Ionicons name="call-outline" size={22} color="#8B5CF6" />
                        <Text style={styles.infoText}>{center.phone}</Text>
                        <Text style={styles.infoLabel}>رقم التواصل</Text>
                    </View>
                </View>

                <View style={styles.servicesSection}>
                    <Text style={styles.sectionTitle}>الخدمات المتوفرة</Text>
                    <Text style={styles.sectionSubtitle}>اختر نوع الأشعة المطلوبة</Text>

                    <View style={styles.servicesGrid}>
                        {services.map((service, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={styles.serviceCard}
                                onPress={() => openBooking(service.name)}
                            >
                                <View style={styles.serviceIcon}>
                                    <Ionicons name={service.icon as any} size={28} color="#8B5CF6" />
                                </View>
                                <Text style={styles.serviceName}>{service.name}</Text>
                                <View style={styles.bookServiceBtn}>
                                    <Text style={styles.bookServiceBtnText}>احجز</Text>
                                    <Ionicons name="chevron-back" size={14} color="#8B5CF6" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {center.description && (
                    <View style={styles.descSection}>
                        <Text style={styles.sectionTitle}>عن المركز</Text>
                        <Text style={styles.descText}>{center.description}</Text>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Booking Modal */}
            <Modal visible={bookingModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <ScrollView
                        style={styles.modalContent}
                        contentContainerStyle={styles.modalContentInner}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>حجز موعد أشعة</Text>
                        {bookingForm.service_name && (
                            <Text style={styles.modalSubtitle}>{bookingForm.service_name}</Text>
                        )}

                        <Text style={styles.fieldLabel}>نوع الأشعة *</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="مثال: أشعة سينية للصدر"
                            value={bookingForm.service_name}
                            onChangeText={v => setBookingForm(f => ({ ...f, service_name: v }))}
                            textAlign="right"
                        />

                        <Text style={styles.fieldLabel}>اختر التاريخ *</Text>
                        <ArabicCalendar
                            month={calendarMonth}
                            year={calendarYear}
                            selectedDate={bookingForm.date}
                            onSelect={date => setBookingForm(f => ({ ...f, date }))}
                            onPrevMonth={goPrevMonth}
                            onNextMonth={goNextMonth}
                        />

                        <Text style={styles.fieldLabel}>اختر الوقت *</Text>
                        <View style={styles.timeGrid}>
                            {DEFAULT_TIME_SLOTS.map(slot => {
                                const active = bookingForm.time === slot;
                                return (
                                    <TouchableOpacity
                                        key={slot}
                                        style={[styles.timeSlot, active && styles.timeSlotActive]}
                                        onPress={() => setBookingForm(f => ({ ...f, time: slot }))}
                                    >
                                        <Text style={[styles.timeSlotText, active && styles.timeSlotTextActive]}>{slot}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.fieldLabel}>ملاحظات (اختياري)</Text>
                        <TextInput
                            style={[styles.fieldInput, { height: 80 }]}
                            placeholder="أي ملاحظات أو تفاصيل إضافية..."
                            value={bookingForm.reason}
                            onChangeText={v => setBookingForm(f => ({ ...f, reason: v }))}
                            textAlign="right"
                            multiline
                            textAlignVertical="top"
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.cancelBtn} 
                                onPress={() => setBookingModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.confirmBtn} 
                                onPress={handleBook} 
                                disabled={submitting}
                            >
                                <LinearGradient 
                                    colors={['#8B5CF6', '#6366F1']} 
                                    style={styles.confirmBtnGrad}
                                >
                                    <Text style={styles.confirmBtnText}>
                                        {submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    loaderArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topImageContainer: { width: '100%', height: 260, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverOverlay: { position: 'absolute', width: '100%', height: '100%' },
    topBar: { 
        position: 'absolute', 
        top: Platform.OS === 'ios' ? 50 : 35, 
        width: '100%', 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20 
    },
    backBtn: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    favBtn: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    titleArea: { 
        position: 'absolute', 
        bottom: 20, 
        right: 20, 
        left: 20, 
        alignItems: 'flex-end' 
    },
    centerTitle: { 
        fontSize: 24, 
        fontWeight: '800', 
        color: '#FFF', 
        marginBottom: 5 
    },
    locationRow: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 6 
    },
    locationText: { 
        fontSize: 13, 
        color: '#E0E0E0' 
    },
    contentScroll: { 
        flex: 1, 
        paddingHorizontal: 20, 
        paddingTop: 20 
    },
    infoRow: { 
        flexDirection: 'row-reverse', 
        justifyContent: 'space-between', 
        gap: 15, 
        marginBottom: 25 
    },
    infoCard: { 
        flex: 1, 
        backgroundColor: '#FFF', 
        borderRadius: 16, 
        padding: 15, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#F3F4F6', 
        elevation: 2 
    },
    infoText: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: '#111827', 
        marginTop: 8, 
        textAlign: 'center' 
    },
    infoLabel: { 
        fontSize: 11, 
        color: '#6B7280' 
    },
    servicesSection: { flex: 1, marginBottom: 25 },
    sectionTitle: { 
        fontSize: 20, 
        fontWeight: '800', 
        color: '#111827', 
        textAlign: 'right', 
        marginBottom: 5 
    },
    sectionSubtitle: { 
        fontSize: 13, 
        color: '#6B7280', 
        textAlign: 'right', 
        marginBottom: 15 
    },
    servicesGrid: { 
        flexDirection: 'row-reverse', 
        flexWrap: 'wrap', 
        gap: 12 
    },
    serviceCard: { 
        width: '48%', 
        backgroundColor: '#FFF', 
        borderRadius: 16, 
        padding: 16, 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: '#F3F4F6', 
        elevation: 2 
    },
    serviceIcon: { 
        width: 56, 
        height: 56, 
        borderRadius: 28, 
        backgroundColor: '#F3E8FF', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    serviceName: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: '#111827', 
        textAlign: 'center', 
        marginBottom: 12,
        minHeight: 36
    },
    bookServiceBtn: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        gap: 4 
    },
    bookServiceBtnText: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: '#8B5CF6' 
    },
    descSection: { marginBottom: 25 },
    descText: { 
        fontSize: 14, 
        color: '#6B7280', 
        textAlign: 'right', 
        lineHeight: 22 
    },
    // Modal styles
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    modalContent: { 
        maxHeight: '92%',
        backgroundColor: '#FFF', 
        borderTopLeftRadius: 30, 
        borderTopRightRadius: 30,
    },
    modalContentInner: {
        padding: 24, 
        paddingBottom: 40 
    },
    modalHandle: { 
        width: 40, 
        height: 4, 
        borderRadius: 2, 
        backgroundColor: '#E5E7EB', 
        alignSelf: 'center', 
        marginBottom: 16 
    },
    modalTitle: { 
        fontSize: 20, 
        fontWeight: '800', 
        color: '#1E293B', 
        textAlign: 'center', 
        marginBottom: 4 
    },
    modalSubtitle: { 
        fontSize: 14, 
        color: '#64748B', 
        textAlign: 'center', 
        marginBottom: 16 
    },
    fieldLabel: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: '#374151', 
        textAlign: 'right', 
        marginBottom: 6, 
        marginTop: 12 
    },
    fieldInput: { 
        backgroundColor: '#F8FAFC', 
        borderRadius: 12, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        height: 48, 
        paddingHorizontal: 14, 
        fontSize: 14 
    },
    timeGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        gap: 8,
    },
    timeSlot: {
        width: '30.5%',
        minHeight: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeSlotActive: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    timeSlotText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    timeSlotTextActive: {
        color: '#FFF',
    },
    modalActions: { 
        flexDirection: 'row-reverse', 
        gap: 12, 
        marginTop: 20 
    },
    cancelBtn: { 
        flex: 1, 
        borderRadius: 14, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        paddingVertical: 14, 
        alignItems: 'center' 
    },
    cancelBtnText: { 
        fontWeight: '700', 
        color: '#64748B' 
    },
    confirmBtn: { 
        flex: 1.5, 
        borderRadius: 14, 
        overflow: 'hidden' 
    },
    confirmBtnGrad: { 
        paddingVertical: 14, 
        alignItems: 'center' 
    },
    confirmBtnText: { 
        fontWeight: '700', 
        color: '#FFF', 
        fontSize: 15 
    },
});
