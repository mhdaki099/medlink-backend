import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, Modal, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getServiceAvailability, isServiceBookable } from '../../../src/constants/serviceAvailability';
import ArabicCalendar from '../../../src/components/ArabicCalendar';

const DEFAULT_TIME_SLOTS = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
];

export default function LabProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [lab, setLab] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [selectedTests, setSelectedTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingModalVisible, setBookingModalVisible] = useState(false);
    const [bookingForm, setBookingForm] = useState({ date: '', time: '', visit_type: 'visit_center' });
    const today = new Date();
    const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
    const [calendarYear, setCalendarYear] = useState(today.getFullYear());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [labData, testsData] = await Promise.all([
                    api.getLab(id as string),
                    api.getLabTests(id as string)
                ]);
                setLab(labData);
                setTests(testsData);
            } catch (e) {
                console.warn(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const getPhotoUrl = (path: string) => {
        if (!path) return 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    const selectedTotal = selectedTests.reduce((sum, test) => sum + Number(test.price || 0), 0);
    const homeServiceFee = bookingForm.visit_type === 'home_service' ? Number(lab?.home_service_fee || 0) : 0;
    const bookingGrandTotal = selectedTotal + homeServiceFee;

    const toggleTest = (test: any) => {
        if (!isServiceBookable(test.availability_status)) {
            Alert.alert('غير متاح', `هذا التحليل حالياً: ${getServiceAvailability(test.availability_status).label}`);
            return;
        }
        setSelectedTests(prev => (
            prev.some(item => item.id === test.id)
                ? prev.filter(item => item.id !== test.id)
                : [...prev, test]
        ));
    };

    const removeSelectedTest = (testId: string) => {
        setSelectedTests(prev => prev.filter(item => item.id !== testId));
    };

    const openBooking = () => {
        if (selectedTests.length === 0) {
            Alert.alert('تنبيه', 'يرجى اختيار تحليل واحد على الأقل');
            return;
        }
        const now = new Date();
        setCalendarMonth(now.getMonth());
        setCalendarYear(now.getFullYear());
        setBookingForm({ date: now.toISOString().split('T')[0], time: '', visit_type: 'visit_center' });
        setBookingModalVisible(true);
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
        if (selectedTests.length === 0) { Alert.alert('تنبيه', 'يرجى اختيار تحليل واحد على الأقل'); return; }
        if (!bookingForm.date || !bookingForm.time) { Alert.alert('تنبيه', 'يرجى تحديد التاريخ والوقت'); return; }
        setSubmitting(true);
        try {
            await api.createServiceBooking({
                patient_id: user.id,
                provider_id: id,
                provider_role: 'lab',
                service_items: selectedTests.map(test => ({
                    id: test.id,
                    name: test.name,
                    price: Number(test.price || 0),
                })),
                services_total: selectedTotal,
                date: bookingForm.date,
                time: bookingForm.time,
                visit_type: bookingForm.visit_type,
                home_service_fee: bookingForm.visit_type === 'home_service' ? (lab?.home_service_fee || 0) : 0,
            });
            setBookingModalVisible(false);
            setSelectedTests([]);
            Alert.alert('✅ تم الحجز', 'تم حفظ الحجز في حجوزاتك', [
                { text: 'عرض حجوزاتي', onPress: () => router.replace({ pathname: '/(patient)/labs', params: { tab: 'bookings' } } as any) },
            ]);
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <View style={styles.loaderArea}><ActivityIndicator size="large" color="#43A047" /></View>;
    }

    if (!lab) {
        return <View style={styles.loaderArea}><Text>المختبر غير موجود</Text></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.topImageContainer}>
                <Image 
                    source={{ 
                        uri: getPhotoUrl(lab.photo),
                        headers: { 'Bypass-Tunnel-Reminder': 'true' }
                    }} 
                    style={styles.coverImage} 
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
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
                    <Text style={styles.labTitle}>{lab.name}</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={16} color="#43A047" />
                        <Text style={styles.locationText}>{lab.address || lab.city}</Text>
                    </View>
                    {lab.has_home_service && (
                        <View style={styles.homeServiceBadge}>
                            <MaterialCommunityIcons name="home-outline" size={13} color="#43A047" />
                            <Text style={styles.homeServiceText}>خدمة منزلية متاحة</Text>
                        </View>
                    )}
                </View>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.infoRow}>
                    <View style={styles.infoCard}>
                        <Ionicons name="time-outline" size={22} color="#1E88E5" />
                        <Text style={styles.infoText}>{lab.open_hours || '08:00 - 20:00'}</Text>
                        <Text style={styles.infoLabel}>أوقات العمل</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Ionicons name="call-outline" size={22} color="#43A047" />
                        <Text style={styles.infoText}>{lab.phone}</Text>
                        <Text style={styles.infoLabel}>رقم التواصل</Text>
                    </View>
                    {lab.has_home_service && (
                        <View style={styles.infoCard}>
                            <MaterialCommunityIcons name="home-outline" size={22} color="#8E24AA" />
                            <Text style={styles.infoText}>{(lab.home_service_fee || 0).toLocaleString()} ل.س</Text>
                            <Text style={styles.infoLabel}>رسوم منزلية</Text>
                        </View>
                    )}
                </View>

                <View style={styles.testsSection}>
                    <Text style={styles.sectionTitle}>التحاليل المتوفرة</Text>
                    {selectedTests.length > 0 && (
                        <View style={styles.basketCard}>
                            <View style={styles.basketHeader}>
                                <TouchableOpacity onPress={() => setSelectedTests([])} style={styles.clearBasketBtn}>
                                    <Text style={styles.clearBasketText}>تفريغ</Text>
                                </TouchableOpacity>
                                <View style={styles.basketTitleBlock}>
                                    <Text style={styles.basketTitle}>سلة التحاليل</Text>
                                    <Text style={styles.basketMeta}>{selectedTests.length} تحليل | {selectedTotal.toLocaleString()} ل.س</Text>
                                </View>
                            </View>
                            <View style={styles.selectedList}>
                                {selectedTests.map(test => (
                                    <View key={test.id} style={styles.selectedPill}>
                                        <TouchableOpacity onPress={() => removeSelectedTest(test.id)} style={styles.selectedRemoveBtn}>
                                            <Ionicons name="close" size={14} color="#64748B" />
                                        </TouchableOpacity>
                                        <Text style={styles.selectedPillText}>{test.name}</Text>
                                    </View>
                                ))}
                            </View>
                            <TouchableOpacity style={styles.basketBookBtn} onPress={openBooking}>
                                <LinearGradient colors={['#43A047', '#1E88E5']} style={styles.basketBookGrad}>
                                    <Text style={styles.basketBookText}>حجز التحاليل المختارة</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {tests.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="flask-empty-outline" size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>لا توجد تحاليل مدرجة حالياً</Text>
                        </View>
                    ) : (
                        tests.map((test, idx) => {
                            const isSelected = selectedTests.some(item => item.id === test.id);
                            const bookable = isServiceBookable(test.availability_status);
                            const avail = getServiceAvailability(test.availability_status);
                            return (
                            <View key={test.id || idx} style={[styles.testCard, isSelected && styles.testCardSelected, !bookable && styles.testCardDisabled]}>
                                <View style={styles.testHeaderRow}>
                                    <TouchableOpacity
                                        style={[styles.checkbox, isSelected && styles.checkboxSelected, !bookable && styles.checkboxDisabled]}
                                        onPress={() => toggleTest(test)}
                                        disabled={!bookable}
                                    >
                                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                    </TouchableOpacity>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.testName, !bookable && { color: '#9CA3AF' }]}>{test.name}</Text>
                                        <View style={[styles.availPill, { backgroundColor: avail.bg }]}>
                                            <Text style={[styles.availPillText, { color: avail.color }]}>{avail.label}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.testPrice}>{test.price?.toLocaleString()} ل.س</Text>
                                </View>
                                <Text style={styles.testDesc}>{test.description}</Text>
                                <View style={styles.testMeta}>
                                    <View style={styles.metaBadge}>
                                        <Ionicons name="time-outline" size={14} color="#1E88E5" />
                                        <Text style={styles.metaBadgeText}>{test.duration_hours} ساعات</Text>
                                    </View>
                                    {test.preparation && (
                                        <View style={[styles.metaBadge, { backgroundColor: '#FFF9C4' }]}>
                                            <Ionicons name="information-circle-outline" size={14} color="#F57F17" />
                                            <Text style={[styles.metaBadgeText, { color: '#F57F17' }]}>{test.preparation}</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={[styles.bookBtn, isSelected && styles.bookBtnSelected, !bookable && styles.bookBtnDisabled]}
                                    onPress={() => toggleTest(test)}
                                    disabled={!bookable}
                                >
                                    <Text style={[styles.bookBtnText, isSelected && styles.bookBtnTextSelected, !bookable && { color: '#9CA3AF' }]}>
                                        {!bookable ? avail.label : isSelected ? 'موجود في السلة' : 'إضافة للسلة'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            );
                        })
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Booking Modal */}
            <Modal visible={bookingModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <ScrollView
                        style={styles.modalContent}
                        contentContainerStyle={styles.modalContentInner}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>حجز التحاليل</Text>
                        <Text style={styles.modalSubtitle}>{selectedTests.length} تحليل | {selectedTotal.toLocaleString()} ل.س</Text>
                        <ScrollView style={styles.modalSelectedList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                            {selectedTests.map(test => (
                                <View key={test.id} style={styles.modalSelectedRow}>
                                    <Text style={styles.modalSelectedPrice}>{Number(test.price || 0).toLocaleString()} ل.س</Text>
                                    <Text style={styles.modalSelectedName}>{test.name}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <Text style={styles.fieldLabel}>أين تريد إجراء التحاليل؟</Text>
                        <View style={styles.visitTypeRow}>
                            {[
                                { key: 'visit_center', label: 'في المركز' },
                                {
                                    key: 'home_service',
                                    label: Number(lab?.home_service_fee || 0) > 0
                                        ? `في البيت (+${Number(lab.home_service_fee || 0).toLocaleString()} ل.س)`
                                        : 'في البيت',
                                },
                            ].map(opt => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[styles.visitTypeBtn, bookingForm.visit_type === opt.key && styles.visitTypeBtnActive]}
                                    onPress={() => setBookingForm(f => ({ ...f, visit_type: opt.key }))}
                                >
                                    <Text style={[styles.visitTypeTxt, bookingForm.visit_type === opt.key && { color: '#FFF' }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>اختر التاريخ</Text>
                        <ArabicCalendar
                            month={calendarMonth}
                            year={calendarYear}
                            selectedDate={bookingForm.date}
                            onSelect={date => setBookingForm(f => ({ ...f, date }))}
                            onPrevMonth={goPrevMonth}
                            onNextMonth={goNextMonth}
                        />

                        <Text style={styles.fieldLabel}>اختر الوقت</Text>
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

                        <View style={styles.bookingTotalBox}>
                            <View style={styles.totalLine}>
                                <Text style={styles.totalValue}>{selectedTotal.toLocaleString()} ل.س</Text>
                                <Text style={styles.totalLabel}>التحاليل</Text>
                            </View>
                            {homeServiceFee > 0 && (
                                <View style={styles.totalLine}>
                                    <Text style={styles.totalValue}>{homeServiceFee.toLocaleString()} ل.س</Text>
                                    <Text style={styles.totalLabel}>الخدمة المنزلية</Text>
                                </View>
                            )}
                            <View style={[styles.totalLine, styles.totalFinalLine]}>
                                <Text style={styles.totalFinalValue}>{bookingGrandTotal.toLocaleString()} ل.س</Text>
                                <Text style={styles.totalFinalLabel}>الإجمالي</Text>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingModalVisible(false)}>
                                <Text style={styles.cancelBtnText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleBook} disabled={submitting}>
                                <LinearGradient colors={['#43A047', '#1E88E5']} style={styles.confirmBtnGrad}>
                                    <Text style={styles.confirmBtnText}>{submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}</Text>
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
    topBar: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 35, width: '100%', flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    favBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    titleArea: { position: 'absolute', bottom: 20, right: 20, left: 20, alignItems: 'flex-end' },
    labTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#FFF', marginBottom: 5 },
    locationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    locationText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#E0E0E0' },
    homeServiceBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: 'rgba(67,160,71,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
    homeServiceText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#A5D6A7' },
    contentScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 15, marginBottom: 25 },
    infoCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    infoText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#111827', marginTop: 8, textAlign: 'center' },
    infoLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    testsSection: { flex: 1 },
    sectionTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right', marginBottom: 15 },
    basketCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: '#BBF7D0', elevation: 2 },
    basketHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    basketTitleBlock: { alignItems: 'flex-end', flex: 1 },
    basketTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#166534', textAlign: 'right' },
    basketMeta: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#43A047', textAlign: 'right' },
    clearBasketBtn: { borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 6 },
    clearBasketText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#64748B' },
    selectedList: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    selectedPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 14, borderWidth: 1, borderColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 6 },
    selectedRemoveBtn: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    selectedPillText: { maxWidth: 180, fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#166534', textAlign: 'right' },
    basketBookBtn: { borderRadius: 12, overflow: 'hidden' },
    basketBookGrad: { paddingVertical: 12, alignItems: 'center' },
    basketBookText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Cairo_700Bold' },
    empty: { alignItems: 'center', marginTop: 40, gap: 10 },
    emptyText: { fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    testCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    testCardSelected: { borderColor: '#43A047', backgroundColor: '#F8FFF9' },
    testCardDisabled: { opacity: 0.75, backgroundColor: '#F9FAFB' },
    testHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    availPill: { alignSelf: 'flex-end', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
    availPillText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    checkboxSelected: { backgroundColor: '#43A047', borderColor: '#43A047' },
    checkboxDisabled: { borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
    testName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 10 },
    testPrice: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#43A047' },
    testDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right', marginBottom: 12 },
    testMeta: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    metaBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    metaBadgeText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    bookBtn: { width: '100%', height: 42, borderRadius: 10, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center' },
    bookBtnSelected: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
    bookBtnDisabled: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
    bookBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_700Bold' },
    bookBtnTextSelected: { color: '#166534' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { maxHeight: '92%', backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    modalContentInner: { padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'center', marginBottom: 4 },
    modalSubtitle: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'center', marginBottom: 16 },
    modalSelectedList: { maxHeight: 120, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 10 },
    modalSelectedRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
    modalSelectedName: { flex: 1, fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right' },
    modalSelectedPrice: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#43A047' },
    fieldLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 12 },
    fieldInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14 },
    visitTypeRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 4 },
    visitTypeBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, alignItems: 'center' },
    visitTypeBtnActive: { backgroundColor: '#43A047', borderColor: '#43A047' },
    visitTypeTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#64748B' },
    timeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    timeSlot: { width: '30.5%', minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    timeSlotActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    timeSlotText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#475569' },
    timeSlotTextActive: { color: '#FFF' },
    bookingTotalBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
    totalLine: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    totalValue: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    totalFinalLine: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 2 },
    totalFinalLabel: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#111827' },
    totalFinalValue: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#43A047' },
    modalActions: { flexDirection: 'row-reverse', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { fontFamily: 'Cairo_700Bold', color: '#64748B' },
    confirmBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
    confirmBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    confirmBtnText: { fontFamily: 'Cairo_700Bold', color: '#FFF', fontSize: 15 },
});
