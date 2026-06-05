import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Colors } from '../../src/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '../../src/services/api';
import { TAB_BAR_CLEARANCE } from '../../src/constants/layout';
import { useAuth } from '../../src/contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
    pending: Colors.warning, confirmed: Colors.primary, completed: Colors.confirmed, rejected: '#EF4444',
};
const STATUS_LABELS: Record<string, string> = {
    pending: 'بانتظار الموافقة', confirmed: 'مؤكد', completed: 'مكتمل', rejected: 'مرفوض',
};

function servicesLabel(bk: any): string {
    if (bk.service_items?.length) return bk.service_items.map((i: any) => i.name).join('، ');
    return bk.service_name || 'خدمة';
}

export default function LabDashboard() {
    const { user, logout } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try {
            const bks = await api.getServiceBookings({ provider_id: user.id });
            setBookings(bks);
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const updateStatus = async (id: string, status: string, extra: Record<string, string> = {}) => {
        try {
            await api.updateServiceBookingStatus(id, { status, ...extra });
            load();
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const pending = bookings.filter((b: any) => b.status === 'pending').length;
    const isRadiology = user?.role === 'radiology';

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#7C3AED', '#2563EB']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <MaterialCommunityIcons name="logout" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>{user?.name || (isRadiology ? 'مركز الأشعة' : 'المختبر')}</Text>
                        <Text style={styles.statsBar}>📅 {bookings.length} حجز | ⏳ {pending} بانتظار</Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name={isRadiology ? 'radiology-box' : 'flask'} size={28} color="#FFF" />
                    </View>
                </View>
                <TouchableOpacity style={styles.quickBtnSingle} onPress={() => router.replace('/(lab)/bookings' as any)}>
                    <MaterialCommunityIcons name="calendar-check" size={18} color="#FFF" />
                    <Text style={styles.quickBtnText}>عرض كل الحجوزات</Text>
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
                {loading ? <ActivityIndicator color={Colors.lab} style={{ marginTop: 40 }} size="large" /> :
                    bookings.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>{isRadiology ? '🩻' : '🧪'}</Text>
                            <Text style={styles.emptyText}>لا توجد حجوزات بعد</Text>
                            <Text style={styles.emptyHint}>أضف خدماتك من «إدارة الخدمات» ليتمكن المرضى من الحجز</Text>
                        </View>
                    ) : bookings.slice(0, 10).map((bk: any) => (
                        <View key={bk.id} style={styles.bkCard}>
                            <View style={styles.bkTop}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[bk.status] || Colors.primary) + '18' }]}>
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[bk.status] || Colors.primary }]}>{STATUS_LABELS[bk.status] || bk.status}</Text>
                                </View>
                                <Text style={styles.patientName}>{bk.patient?.name || 'مريض'}</Text>
                            </View>
                            <Text style={styles.testName}>{isRadiology ? '🩻' : '🧪'} {servicesLabel(bk)}</Text>
                            <Text style={styles.bkDate}>📅 {bk.date} — ⏰ {bk.time}</Text>
                            {bk.status === 'pending' && (
                                <View style={styles.bkActions}>
                                    <TouchableOpacity style={styles.confirmBtn} onPress={() => updateStatus(bk.id, 'confirmed')}>
                                        <Text style={styles.confirmBtnText}>تأكيد ✓</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={() => updateStatus(bk.id, 'rejected', { rejection_reason_type: 'service_unavailable', rejection_note: 'غير متوفر' })}>
                                        <Text style={styles.rejectBtnText}>رفض</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {bk.status === 'confirmed' && (
                                <TouchableOpacity style={styles.completeBtn} onPress={() => updateStatus(bk.id, 'completed')}>
                                    <Text style={styles.completeBtnText}>إتمام ✓</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                <View style={{ height: TAB_BAR_CLEARANCE }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 16, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    logoutBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    statsBar: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    quickBtnSingle: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 10, marginTop: 16 },
    quickBtnText: { color: '#FFF', fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 8, paddingHorizontal: 24 },
    emptyIcon: { fontSize: 48, marginBottom: 4 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#9CA3AF' },
    emptyHint: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#9CA3AF', textAlign: 'center' },
    bkCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    bkTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    patientName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827' },
    statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
    testName: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#7C3AED', textAlign: 'right', marginBottom: 4 },
    bkDate: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right', marginBottom: 4 },
    bkActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
    confirmBtn: { flex: 1, backgroundColor: '#DCFCE7', borderRadius: 14, padding: 12, alignItems: 'center' },
    confirmBtnText: { color: '#16A34A', fontFamily: 'Cairo_700Bold', fontSize: 13 },
    rejectBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 14, padding: 12, alignItems: 'center' },
    rejectBtnText: { color: '#EF4444', fontFamily: 'Cairo_700Bold', fontSize: 13 },
    completeBtn: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 8 },
    completeBtnText: { color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 13 },
});
