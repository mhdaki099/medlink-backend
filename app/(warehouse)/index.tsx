import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function WarehouseDashboard() {
    const { user, logout } = useAuth();
    const [inventory, setInventory] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try {
            const [inv, ords] = await Promise.all([
                api.getWarehouseInventory(user.id),
                api.getWarehouseOrders(user.id),
            ]);
            setInventory(inv); setOrders(ords);
        } catch (e) { console.warn(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const updateOrderStatus = async (id: string, status: string) => {
        try {
            const deliveryTime = status === 'processing' ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined;
            await api.updateWarehouseOrderStatus(id, status, deliveryTime);
            load();
            Alert.alert('✅ تم', `تم تحديث حالة الطلب`);
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const totalStock = inventory.reduce((s, i) => s + (i.stock || 0), 0);
    const pendingOrders = orders.filter((o: any) => o.status === 'pending').length;
    const lowStock = inventory.filter((i: any) => i.stock < i.min_order * 2).length;

    const STATUS_COLORS: Record<string, string> = { pending: Colors.warning, processing: Colors.primary, delivered: Colors.confirmed, cancelled: Colors.danger };
    const STATUS_LABELS: Record<string, string> = { pending: 'جديد', processing: 'جاري التوصيل', delivered: 'تم', cancelled: 'ملغى' };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
            <View style={styles.header}>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}><Text style={styles.logoutText}>خروج 🚪</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>{user?.name || 'المستودع'} 🏭</Text>
                <Text style={styles.headerSub}>{user?.city}</Text>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                {[
                    { label: 'إجمالي المخزون', val: totalStock, color: Colors.primary },
                    { label: 'طلبات جديدة', val: pendingOrders, color: Colors.warning },
                    { label: 'توقف الإشعار', val: lowStock, color: Colors.danger },
                    { label: 'أصناف', val: inventory.length, color: Colors.warehouse },
                ].map((s) => (
                    <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                        <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* Low Stock Alert */}
            {lowStock > 0 && (
                <View style={styles.alertBox}>
                    <Text style={styles.alertText}>⚠️ {lowStock} أصناف قاربت على النفاد. يجب إعادة الطلب قريباً</Text>
                </View>
            )}

            {/* Pending Orders */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>طلبات الصيدليات 🛒</Text>
                {loading ? <ActivityIndicator color={Colors.warehouse} style={{ marginTop: 20 }} /> :
                    orders.length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>📦</Text><Text style={styles.emptyText}>لا توجد طلبات</Text></View>
                    ) : orders.map((ord: any) => (
                        <View key={ord.id} style={styles.orderCard}>
                            <View style={styles.orderTop}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ord.status] || Colors.primary) + '18' }]}>
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[ord.status] || Colors.primary }]}>{STATUS_LABELS[ord.status] || ord.status}</Text>
                                </View>
                                <Text style={styles.pharmacyName}>{ord.pharmacy?.name || 'صيدلية'}</Text>
                            </View>
                            <Text style={styles.orderDate}>📅 {ord.created_at?.split('T')[0] || 'اليوم'}</Text>
                            {(ord.items || []).map((item: any, i: number) => (
                                <Text key={i} style={styles.orderItem}>• {item.name || item.item_id} × {item.qty}</Text>
                            ))}
                            <Text style={styles.orderTotal}>المجموع: {(ord.total || 0).toLocaleString()} ل.س</Text>
                            {ord.status === 'pending' && (
                                <View style={styles.orderActions}>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={() => updateOrderStatus(ord.id, 'cancelled')}><Text style={styles.rejectText}>رفض ✗</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.acceptBtn} onPress={() => updateOrderStatus(ord.id, 'processing')}><Text style={styles.acceptText}>قبول وشحن ✓</Text></TouchableOpacity>
                                </View>
                            )}
                            {ord.status === 'processing' && (
                                <TouchableOpacity style={styles.deliveredBtn} onPress={() => updateOrderStatus(ord.id, 'delivered')}><Text style={styles.deliveredText}>✅ تأكيد الاستلام</Text></TouchableOpacity>
                            )}
                        </View>
                    ))}
            </View>

            <View style={{ height: 20 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.warehouse, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 16 },
    logoutBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
    logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'right' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 4 },
    statsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
    statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center', borderTopWidth: 3, ...Shadow.small },
    statVal: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 9, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
    alertBox: { marginHorizontal: 14, backgroundColor: Colors.warning + '18', borderRadius: BorderRadius.md, padding: 12, marginBottom: 4 },
    alertText: { color: Colors.warning, fontWeight: '600', fontSize: 13, textAlign: 'right' },
    section: { paddingHorizontal: 14, paddingBottom: 10 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'right', marginBottom: 10, marginTop: 10 },
    empty: { alignItems: 'center', marginTop: 30 },
    emptyIcon: { fontSize: 40, marginBottom: 8 },
    emptyText: { fontSize: 14, color: Colors.textSecondary },
    orderCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    pharmacyName: { fontSize: 15, fontWeight: '800', color: Colors.text },
    statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    orderDate: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 6 },
    orderItem: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 2 },
    orderTotal: { fontSize: 14, fontWeight: '800', color: Colors.warehouse, textAlign: 'right', marginBottom: 8, marginTop: 4 },
    orderActions: { flexDirection: 'row', gap: 8 },
    rejectBtn: { flex: 1, backgroundColor: Colors.danger + '15', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    rejectText: { color: Colors.danger, fontWeight: '700', fontSize: 12 },
    acceptBtn: { flex: 2, backgroundColor: Colors.warehouse, borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    acceptText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    deliveredBtn: { backgroundColor: Colors.confirmed + '15', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    deliveredText: { color: Colors.confirmed, fontWeight: '700', fontSize: 12 },
});
