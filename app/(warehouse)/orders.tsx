import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function WarehouseOrders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try { const ords = await api.getWarehouseOrders(user.id); setOrders(ords); }
        catch (e) { console.warn(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const update = async (id: string, status: string) => {
        try { await api.updateWarehouseOrderStatus(id, status); load(); }
        catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const STATUS_COLORS: Record<string, string> = { pending: Colors.warning, processing: Colors.primary, delivered: Colors.confirmed, cancelled: Colors.danger };
    const STATUS_LABELS: Record<string, string> = { pending: 'جديد', processing: 'جاري', delivered: 'تم', cancelled: 'ملغى' };

    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>طلبات الشحن 🚚</Text></View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
                {loading ? <ActivityIndicator color={Colors.warehouse} style={{ marginTop: 40 }} size="large" /> :
                    orders.length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>📦</Text><Text style={styles.emptyText}>لا توجد طلبات</Text></View>
                    ) : orders.map((ord: any) => (
                        <View key={ord.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[ord.status] || Colors.primary) + '18' }]}>
                                    <Text style={[styles.badgeText, { color: STATUS_COLORS[ord.status] || Colors.primary }]}>{STATUS_LABELS[ord.status] || ord.status}</Text>
                                </View>
                                <Text style={styles.pharmacy}>{ord.pharmacy?.name || 'صيدلية'}</Text>
                            </View>
                            <Text style={styles.date}>📅 {ord.created_at?.split('T')[0]}</Text>
                            <Text style={styles.total}>المجموع: {(ord.total || 0).toLocaleString()} ل.س</Text>
                            {ord.delivery_time && <Text style={styles.delivTime}>🚚 موعد التسليم: {ord.delivery_time}</Text>}
                            {ord.status === 'pending' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={() => update(ord.id, 'cancelled')}><Text style={styles.rejectText}>رفض</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.acceptBtn} onPress={() => update(ord.id, 'processing')}><Text style={styles.acceptText}>شحن ✓</Text></TouchableOpacity>
                                </View>
                            )}
                            {ord.status === 'processing' && (
                                <TouchableOpacity style={styles.deliveredBtn} onPress={() => update(ord.id, 'delivered')}><Text style={styles.deliveredText}>✅ تأكيد التسليم</Text></TouchableOpacity>
                            )}
                        </View>
                    ))}
                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.warehouse, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'right' },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 40, marginBottom: 10 },
    emptyText: { fontSize: 15, color: Colors.textSecondary },
    card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    pharmacy: { fontSize: 15, fontWeight: '800', color: Colors.text },
    badge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    date: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 4 },
    total: { fontSize: 14, fontWeight: '800', color: Colors.warehouse, textAlign: 'right', marginBottom: 4 },
    delivTime: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
    actions: { flexDirection: 'row', gap: 8 },
    rejectBtn: { flex: 1, backgroundColor: Colors.danger + '15', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    rejectText: { color: Colors.danger, fontWeight: '700' },
    acceptBtn: { flex: 2, backgroundColor: Colors.warehouse, borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    acceptText: { color: '#fff', fontWeight: '700' },
    deliveredBtn: { backgroundColor: Colors.confirmed + '15', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    deliveredText: { color: Colors.confirmed, fontWeight: '700' },
});
