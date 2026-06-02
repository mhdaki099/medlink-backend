import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, Modal, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function LabProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [lab, setLab] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingModal, setBookingModal] = useState<{ visible: boolean; test: any | null }>({ visible: false, test: null });
    const [bookingForm, setBookingForm] = useState({ date: '', time: '', visit_type: 'visit_center' });
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

    const openBooking = (test: any) => {
        setBookingForm({ date: '', time: '', visit_type: 'visit_center' });
        setBookingModal({ visible: true, test });
    };

    const handleBook = async () => {
        if (!user?.id) { Alert.alert('تنبيه', 'يجب تسجيل الدخول'); return; }
        if (!bookingForm.date || !bookingForm.time) { Alert.alert('تنبيه', 'يرجى تحديد التاريخ والوقت'); return; }
        setSubmitting(true);
        try {
            await api.createServiceBooking({
                patient_id: user.id,
                provider_id: id,
                provider_role: 'lab',
                service_id: bookingModal.test?.id,
                service_name: bookingModal.test?.name,
                date: bookingForm.date,
                time: bookingForm.time,
                visit_type: bookingForm.visit_type,
                home_service_fee: bookingForm.visit_type === 'home_service' ? (lab?.home_service_fee || 0) : 0,
            });
            setBookingModal({ visible: false, test: null });
            Alert.alert('✅ تم الحجز', 'تم إرسال طلب الحجز بنجاح', [
                { text: 'حسناً', onPress: () => router.back() },
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

                    {tests.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="flask-empty-outline" size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>لا توجد تحاليل مدرجة حالياً</Text>
                        </View>
                    ) : (
                        tests.map((test, idx) => (
                            <View key={test.id || idx} style={styles.testCard}>
                                <View style={styles.testHeaderRow}>
                                    <Text style={styles.testName}>{test.name}</Text>
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
                                <TouchableOpacity style={styles.bookBtn} onPress={() => openBooking(test)}>
                                    <Text style={styles.bookBtnText}>احجز هذا التحليل</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Booking Modal */}
            <Modal visible={bookingModal.visible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>حجز تحليل</Text>
                        {bookingModal.test && (
                            <Text style={styles.modalSubtitle}>{bookingModal.test.name} — {bookingModal.test.price?.toLocaleString()} ل.س</Text>
                        )}

                        <Text style={styles.fieldLabel}>التاريخ (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="2025-01-15"
                            value={bookingForm.date}
                            onChangeText={v => setBookingForm(f => ({ ...f, date: v }))}
                            textAlign="right"
                        />

                        <Text style={styles.fieldLabel}>الوقت</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="09:00 AM"
                            value={bookingForm.time}
                            onChangeText={v => setBookingForm(f => ({ ...f, time: v }))}
                            textAlign="right"
                        />

                        {lab?.has_home_service && (
                            <>
                                <Text style={styles.fieldLabel}>نوع الزيارة</Text>
                                <View style={styles.visitTypeRow}>
                                    {[
                                        { key: 'visit_center', label: 'زيارة المختبر' },
                                        { key: 'home_service', label: `خدمة منزلية (+${lab.home_service_fee || 0} ل.س)` },
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
                            </>
                        )}

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingModal({ visible: false, test: null })}>
                                <Text style={styles.cancelBtnText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleBook} disabled={submitting}>
                                <LinearGradient colors={['#43A047', '#1E88E5']} style={styles.confirmBtnGrad}>
                                    <Text style={styles.confirmBtnText}>{submitting ? 'جاري الحجز...' : 'تأكيد الحجز'}</Text>
                                </LinearGradient>
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
    empty: { alignItems: 'center', marginTop: 40, gap: 10 },
    emptyText: { fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    testCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    testHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    testName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 10 },
    testPrice: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#43A047' },
    testDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right', marginBottom: 12 },
    testMeta: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    metaBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    metaBadgeText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    bookBtn: { width: '100%', height: 42, borderRadius: 10, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center' },
    bookBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_700Bold' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'center', marginBottom: 4 },
    modalSubtitle: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'center', marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 12 },
    fieldInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14 },
    visitTypeRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 4 },
    visitTypeBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, alignItems: 'center' },
    visitTypeBtnActive: { backgroundColor: '#43A047', borderColor: '#43A047' },
    visitTypeTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#64748B' },
    modalActions: { flexDirection: 'row-reverse', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { fontFamily: 'Cairo_700Bold', color: '#64748B' },
    confirmBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
    confirmBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    confirmBtnText: { fontFamily: 'Cairo_700Bold', color: '#FFF', fontSize: 15 },
});
