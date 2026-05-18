import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Platform, TextInput, Alert, Modal, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function RadiologyScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [centers, setCenters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [bookingModal, setBookingModal] = useState<{ visible: boolean; center: any | null }>({ visible: false, center: null });
    const [bookingForm, setBookingForm] = useState({ date: '', time: '', visit_type: 'visit_center', service_name: '' });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        api.getRadiologyCenters()
            .then(setCenters)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = centers.filter(c =>
        !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.includes(search)
    );

    const openBooking = (center: any) => {
        setBookingForm({ date: '', time: '', visit_type: 'visit_center', service_name: '' });
        setBookingModal({ visible: true, center });
    };

    const handleBook = async () => {
        if (!user?.id) { Alert.alert('تنبيه', 'يجب تسجيل الدخول'); return; }
        if (!bookingForm.date || !bookingForm.time) { Alert.alert('تنبيه', 'يرجى تحديد التاريخ والوقت'); return; }
        setSubmitting(true);
        try {
            await api.createServiceBooking({
                patient_id: user.id,
                provider_id: bookingModal.center.id,
                provider_role: 'radiology',
                service_name: bookingForm.service_name || 'أشعة',
                date: bookingForm.date,
                time: bookingForm.time,
                visit_type: bookingForm.visit_type,
                home_service_fee: bookingForm.visit_type === 'home_service' ? (bookingModal.center.home_service_fee || 0) : 0,
            });
            setBookingModal({ visible: false, center: null });
            Alert.alert('✅ تم الحجز', 'تم إرسال طلب الحجز بنجاح');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const renderCenter = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.card} activeOpacity={0.9}>
            <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="radiology-box-outline" size={28} color="#8E24AA" />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <View style={styles.metaRow}>
                        <Ionicons name="location-outline" size={13} color="#64748B" />
                        <Text style={styles.metaText}>{item.city || 'غير محدد'}</Text>
                    </View>
                    {item.open_hours && (
                        <View style={styles.metaRow}>
                            <Ionicons name="time-outline" size={13} color="#64748B" />
                            <Text style={styles.metaText}>{item.open_hours}</Text>
                        </View>
                    )}
                    {item.has_home_service && (
                        <View style={styles.homeServiceBadge}>
                            <MaterialCommunityIcons name="home-outline" size={12} color="#43A047" />
                            <Text style={styles.homeServiceText}>خدمة منزلية متاحة</Text>
                        </View>
                    )}
                </View>
            </View>
            <TouchableOpacity style={styles.bookBtn} onPress={() => openBooking(item)}>
                <LinearGradient colors={['#8E24AA', '#6A1B9A']} style={styles.bookBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <MaterialCommunityIcons name="calendar-plus" size={18} color="#FFF" />
                    <Text style={styles.bookBtnText}>احجز موعد</Text>
                </LinearGradient>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#8E24AA', '#6A1B9A']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>مراكز الأشعة</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ابحث عن مركز أشعة..."
                        value={search}
                        onChangeText={setSearch}
                        textAlign="right"
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#8E24AA" /></View>
            ) : (
                <FlatList
                    data={filtered}
                    renderItem={renderCenter}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="radiology-box-outline" size={60} color="#D1D5DB" />
                            <Text style={styles.emptyText}>لا توجد مراكز أشعة مسجلة</Text>
                        </View>
                    }
                />
            )}

            {/* Booking Modal */}
            <Modal visible={bookingModal.visible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>حجز موعد أشعة</Text>
                        {bookingModal.center && (
                            <Text style={styles.modalSubtitle}>{bookingModal.center.name}</Text>
                        )}

                        <Text style={styles.fieldLabel}>نوع الخدمة</Text>
                        <TextInput
                            style={styles.fieldInput}
                            placeholder="مثال: أشعة صدر، رنين مغناطيسي..."
                            value={bookingForm.service_name}
                            onChangeText={v => setBookingForm(f => ({ ...f, service_name: v }))}
                            textAlign="right"
                        />

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

                        {bookingModal.center?.has_home_service && (
                            <>
                                <Text style={styles.fieldLabel}>نوع الزيارة</Text>
                                <View style={styles.visitTypeRow}>
                                    {[
                                        { key: 'visit_center', label: 'زيارة المركز' },
                                        { key: 'home_service', label: `خدمة منزلية (+${bookingModal.center.home_service_fee || 0} ل.س)` },
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
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookingModal({ visible: false, center: null })}>
                                <Text style={styles.cancelBtnText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={handleBook} disabled={submitting}>
                                <LinearGradient colors={['#8E24AA', '#6A1B9A']} style={styles.confirmBtnGrad}>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    searchBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, height: 44, gap: 8 },
    searchInput: { flex: 1, fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#111827' },
    card: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row-reverse', gap: 14, marginBottom: 14 },
    iconCircle: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#F3E5F5', justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1, alignItems: 'flex-end' },
    cardName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B', marginBottom: 4 },
    metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginBottom: 2 },
    metaText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    homeServiceBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
    homeServiceText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#43A047' },
    bookBtn: { height: 44, borderRadius: 14, overflow: 'hidden' },
    bookBtnGrad: { flex: 1, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
    bookBtnText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    empty: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#94A3B8' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'center', marginBottom: 4 },
    modalSubtitle: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'center', marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'right', marginBottom: 6, marginTop: 12 },
    fieldInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14 },
    visitTypeRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 4 },
    visitTypeBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 10, alignItems: 'center' },
    visitTypeBtnActive: { backgroundColor: '#8E24AA', borderColor: '#8E24AA' },
    visitTypeTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#64748B' },
    modalActions: { flexDirection: 'row-reverse', gap: 12, marginTop: 20 },
    cancelBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { fontFamily: 'Cairo_700Bold', color: '#64748B' },
    confirmBtn: { flex: 1.5, borderRadius: 14, overflow: 'hidden' },
    confirmBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    confirmBtnText: { fontFamily: 'Cairo_700Bold', color: '#FFF', fontSize: 15 },
});
