import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProviderTabBarClearance } from '../../src/constants/layout';

export default function WarehouseDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const bottomPad = useProviderTabBarClearance();
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
            contentContainerStyle={{ paddingBottom: bottomPad }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
            <LinearGradient colors={['#EA580C', '#DC2626']} style={styles.header} start={{x:0,y:0}} end={{x:1,y:1}}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <MaterialCommunityIcons name="logout" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{flex:1, alignItems:'flex-end'}}>
                        <Text style={styles.headerTitle}>{user?.name || 'المستودع'}</Text>
                        <Text style={styles.headerSub}>{user?.city}</Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="warehouse" size={28} color="#FFF" />
                    </View>
                </View>
            </LinearGradient>

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

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/(warehouse)/inventory' as any)}>
                    <View style={[styles.quickIcon, { backgroundColor: Colors.primary + '15' }]}>
                        <MaterialCommunityIcons name="package-variant-plus" size={24} color={Colors.primary} />
                    </View>
                    <Text style={styles.quickTitle}>إدارة المخزون</Text>
                    <Text style={styles.quickSub}>إضافة أصناف وتوريد</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickCard} onPress={() => router.replace('/(warehouse)/orders' as any)}>
                    <View style={[styles.quickIcon, { backgroundColor: Colors.warning + '15' }]}>
                        <MaterialCommunityIcons name="truck-delivery-outline" size={24} color={Colors.warning} />
                    </View>
                    <Text style={styles.quickTitle}>طلبات الصيدليات</Text>
                    <Text style={styles.quickSub}>{pendingOrders} طلب جديد</Text>
                </TouchableOpacity>
            </View>

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

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 24, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    logoutBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
    logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    statsRow: { flexDirection: 'row-reverse', paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
    statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 12, alignItems: 'center', borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    statVal: { fontSize: 20, fontFamily: 'Cairo_700Bold' },
    statLabel: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#6B7280', marginTop: 2, textAlign: 'center' },
    quickActions: { flexDirection: 'row-reverse', paddingHorizontal: 16, marginTop: 4, gap: 10 },
    quickCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    quickIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    quickTitle: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'center' },
    quickSub: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'center', marginTop: 2 },
    alertBox: { marginHorizontal: 16, backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, marginBottom: 4, marginTop: 12 },
    alertText: { color: '#D97706', fontFamily: 'Cairo_600SemiBold', fontSize: 13, textAlign: 'right' },
    section: { paddingHorizontal: 16, paddingBottom: 10 },
    sectionTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right', marginBottom: 12, marginTop: 10 },
    empty: { alignItems: 'center', marginTop: 30, gap: 8 },
    emptyIcon: { fontSize: 40, marginBottom: 4 },
    emptyText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    orderCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    orderTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    pharmacyName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827' },
    statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
    orderDate: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#9CA3AF', textAlign: 'right', marginBottom: 6 },
    orderItem: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right', marginBottom: 2 },
    orderTotal: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#EA580C', textAlign: 'right', marginBottom: 8, marginTop: 4 },
    orderActions: { flexDirection: 'row-reverse', gap: 8 },
    rejectBtn: { flex: 1, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, alignItems: 'center' },
    rejectText: { color: '#EF4444', fontFamily: 'Cairo_700Bold', fontSize: 13 },
    acceptBtn: { flex: 2, backgroundColor: '#EA580C', borderRadius: 14, padding: 12, alignItems: 'center' },
    acceptText: { color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 13 },
    deliveredBtn: { backgroundColor: '#D1FAE5', borderRadius: 14, padding: 12, alignItems: 'center' },
    deliveredText: { color: '#10B981', fontFamily: 'Cairo_700Bold', fontSize: 13 },
});
