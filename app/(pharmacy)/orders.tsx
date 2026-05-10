import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function PharmacyOrders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try { const ords = await api.getOrders({ pharmacy_id: user.id }); setOrders(ords); }
        catch (e) { console.warn(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const update = async (id: string, status: string) => {
        try { await api.updateOrderStatus(id, status); load(); Alert.alert('✅ تم', 'تم تحديث الطلب'); }
        catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const STATUS_COLORS: Record<string, string> = { pending: Colors.warning, processing: Colors.primary, delivered: Colors.confirmed, cancelled: Colors.danger };
    const STATUS_LABELS: Record<string, string> = { pending: 'جديد', processing: 'جاري التوصيل', delivered: 'تم التوصيل', cancelled: 'ملغى' };

    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>طلبات الأدوية 🛒</Text></View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
                {loading ? <ActivityIndicator color={Colors.pharmacy} style={{ marginTop: 40 }} size="large" /> :
                    orders.length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>🛒</Text><Text style={styles.emptyText}>لا توجد طلبات</Text></View>
                    ) : orders.map((ord: any) => (
                        <View key={ord.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ord.status] || Colors.primary) + '18' }]}>
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[ord.status] || Colors.primary }]}>{STATUS_LABELS[ord.status] || ord.status}</Text>
                                </View>
                                <Text style={styles.patient}>{ord.patient?.name || 'مريض'}</Text>
                            </View>
                            <Text style={styles.date}>📅 {ord.created_at?.split('T')[0]}</Text>
                            <Text style={styles.address}>📍 {ord.delivery_address}</Text>
                            {(ord.items || []).map((item: any, i: number) => (
                                <Text key={i} style={styles.itemRow}>• {item.medicine?.name || item.medicine_id} × {item.qty} — {((item.price || 0) * item.qty).toLocaleString()} ل.س</Text>
                            ))}
                            <Text style={styles.total}>المجموع: {(ord.total || 0).toLocaleString()} ل.س</Text>
                            {ord.status === 'pending' && (
                                <View style={styles.actions}>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={() => update(ord.id, 'cancelled')}><Text style={styles.rejectText}>رفض ✗</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.acceptBtn} onPress={() => update(ord.id, 'processing')}><Text style={styles.acceptText}>قبول ✓</Text></TouchableOpacity>
                                </View>
                            )}
                            {ord.status === 'processing' && (
                                <TouchableOpacity style={styles.deliveredBtn} onPress={() => update(ord.id, 'delivered')}><Text style={styles.deliveredText}>✅ تأكيد التوصيل</Text></TouchableOpacity>
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
    header: { backgroundColor: Colors.pharmacy, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'right' },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 15, color: Colors.textSecondary },
    card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    patient: { fontSize: 15, fontWeight: '800', color: Colors.text },
    statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    date: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 2 },
    address: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 6 },
    itemRow: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 2 },
    total: { fontSize: 14, fontWeight: '800', color: Colors.pharmacy, textAlign: 'right', marginBottom: 8, marginTop: 4 },
    actions: { flexDirection: 'row', gap: 8 },
    rejectBtn: { flex: 1, backgroundColor: Colors.danger + '15', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    rejectText: { color: Colors.danger, fontWeight: '700', fontSize: 13 },
    acceptBtn: { flex: 2, backgroundColor: Colors.pharmacy, borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    acceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    deliveredBtn: { backgroundColor: Colors.confirmed + '15', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    deliveredText: { color: Colors.confirmed, fontWeight: '700', fontSize: 13 },
});
