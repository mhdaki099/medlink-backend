import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function PharmacyDashboard() {
    const { user, logout } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try {
            const [ords, meds] = await Promise.all([
                api.getOrders({ pharmacy_id: user.id }),
                api.getPharmacyMedicines(user.id),
            ]);
            setOrders(ords);
            setMedicines(meds);
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const updateOrderStatus = async (id: string, status: string) => {
        try {
            await api.updateOrderStatus(id, status);
            load();
            Alert.alert('✅ تم', `تم تحديث حالة الطلب`);
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const counts = {
        pending: orders.filter((o: any) => o.status === 'pending').length,
        processing: orders.filter((o: any) => o.status === 'processing').length,
        delivered: orders.filter((o: any) => o.status === 'delivered').length,
    };

    const inStock = medicines.filter((m: any) => m.stock_status === 'in_stock').length;
    const outStock = medicines.filter((m: any) => m.stock_status === 'out_of_stock').length;

    const STATUS_COLORS: Record<string, string> = { pending: Colors.warning, processing: Colors.primary, delivered: Colors.confirmed, cancelled: Colors.danger };
    const STATUS_LABELS: Record<string, string> = { pending: 'جديد', processing: 'جاري', delivered: 'تم التوصيل', cancelled: 'ملغى' };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
            <View style={styles.header}>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}><Text style={styles.logoutText}>خروج 🚪</Text></TouchableOpacity>
                <Text style={styles.greeting}>{user?.name || 'الصيدلية'} 💊</Text>
                <Text style={styles.sub}>{user?.address}</Text>
            </View>

            {/* Inventory Stats */}
            <View style={styles.statsRow}>
                {[
                    { label: 'أدوية متوفرة', val: inStock, color: Colors.confirmed },
                    { label: 'غير متوفر', val: outStock, color: Colors.danger },
                    { label: 'طلبات جديدة', val: counts.pending, color: Colors.warning },
                    { label: 'قيد التوصيل', val: counts.processing, color: Colors.primary },
                ].map((s) => (
                    <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                        <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* Pending Orders */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>الطلبات الجديدة 🛒</Text>
                {loading ? <ActivityIndicator color={Colors.pharmacy} style={{ marginTop: 20 }} /> :
                    orders.filter((o: any) => o.status === 'pending').length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>✅</Text><Text style={styles.emptyText}>لا توجد طلبات جديدة</Text></View>
                    ) : orders.filter((o: any) => o.status === 'pending').map((ord: any) => (
                        <View key={ord.id} style={styles.orderCard}>
                            <View style={styles.orderHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ord.status] || Colors.primary) + '18' }]}>
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[ord.status] || Colors.primary }]}>{STATUS_LABELS[ord.status]}</Text>
                                </View>
                                <Text style={styles.patientName}>{ord.patient?.name || 'مريض'}</Text>
                            </View>
                            <Text style={styles.orderDate}>📅 {ord.created_at?.split('T')[0]}</Text>
                            <Text style={styles.orderAddress}>📍 {ord.delivery_address}</Text>
                            <Text style={styles.orderItems}>{(ord.items || []).length} أصناف</Text>
                            <Text style={styles.orderTotal}>المجموع: {(ord.total || 0).toLocaleString()} ل.س</Text>
                            <View style={styles.orderActions}>
                                <TouchableOpacity style={styles.rejectBtn} onPress={() => updateOrderStatus(ord.id, 'cancelled')}>
                                    <Text style={styles.rejectBtnText}>رفض ✗</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.acceptBtn} onPress={() => updateOrderStatus(ord.id, 'processing')}>
                                    <Text style={styles.acceptBtnText}>قبول وبدء التوصيل ✓</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
            </View>

            {/* Processing Orders */}
            {orders.filter((o: any) => o.status === 'processing').length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>قيد التوصيل 🚗</Text>
                    {orders.filter((o: any) => o.status === 'processing').map((ord: any) => (
                        <View key={ord.id} style={styles.orderCard}>
                            <View style={styles.orderHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: Colors.primary + '18' }]}>
                                    <Text style={[styles.statusText, { color: Colors.primary }]}>جاري التوصيل</Text>
                                </View>
                                <Text style={styles.patientName}>{ord.patient?.name || 'مريض'}</Text>
                            </View>
                            <Text style={styles.orderAddress}>📍 {ord.delivery_address}</Text>
                            <Text style={styles.orderTotal}>المجموع: {(ord.total || 0).toLocaleString()} ل.س</Text>
                            <TouchableOpacity style={styles.deliveredBtn} onPress={() => updateOrderStatus(ord.id, 'delivered')}>
                                <Text style={styles.deliveredBtnText}>✅ تم التوصيل</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <View style={{ height: 20 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.pharmacy, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 16 },
    logoutBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
    logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    greeting: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'right' },
    sub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 4 },
    statsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
    statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center', borderTopWidth: 3, ...Shadow.small },
    statVal: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
    section: { paddingHorizontal: 14, paddingBottom: 10 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: 10 },
    empty: { alignItems: 'center', marginTop: 20, marginBottom: 10, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 20, ...Shadow.small },
    emptyIcon: { fontSize: 32, marginBottom: 8 },
    emptyText: { fontSize: 14, color: Colors.textSecondary },
    orderCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    patientName: { fontSize: 15, fontWeight: '800', color: Colors.text },
    statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    orderDate: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 2 },
    orderAddress: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 2 },
    orderItems: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 2 },
    orderTotal: { fontSize: 14, fontWeight: '800', color: Colors.pharmacy, textAlign: 'right', marginBottom: 8 },
    orderActions: { flexDirection: 'row', gap: 8 },
    rejectBtn: { flex: 1, backgroundColor: Colors.danger + '18', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    rejectBtnText: { color: Colors.danger, fontWeight: '700', fontSize: 13 },
    acceptBtn: { flex: 2, backgroundColor: Colors.pharmacy, borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    deliveredBtn: { backgroundColor: Colors.confirmed + '18', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    deliveredBtnText: { color: Colors.confirmed, fontWeight: '700', fontSize: 13 },
});
