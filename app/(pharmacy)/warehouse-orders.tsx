import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSubscreenBottomPadding } from '../../src/constants/layout';

const C = {
    primary: '#1E88E5', accent: '#43A047', success: '#27AE60', danger: '#E74C3C',
    warning: '#F59E0B', purple: '#8B5CF6', bg: '#F5F6FA', white: '#FFF',
    text: '#1A1A2E', textSec: '#636E72', border: '#E8ECF0',
};

const STATUS_COLORS: Record<string, string> = {
    pending: C.warning, processing: C.primary, shipped: C.purple, delivered: C.success, cancelled: C.danger,
};
const STATUS_LABELS: Record<string, string> = {
    pending: 'بانتظار المستودع', processing: 'قيد التجهيز', shipped: 'في الطريق — أكّد الاستلام',
    delivered: 'تم الاستلام', cancelled: 'ملغى',
};

export default function PharmacyWarehouseOrders() {
    const { user } = useAuth();
    const router = useRouter();
    const bottomPad = useSubscreenBottomPadding();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try {
            const ords = await api.getPharmacyWarehouseOrders(user.id);
            setOrders(ords.sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || '')));
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const confirmReceipt = (ord: any) => {
        Alert.alert('تأكيد الاستلام', `هل استلمت شحنة "${ord.warehouse?.name || 'المستودع'}" بالكامل؟`, [
            { text: 'ليس بعد', style: 'cancel' },
            {
                text: 'نعم، استلمت', onPress: async () => {
                    try {
                        await api.confirmPharmacyWarehouseOrder(ord.id);
                        load();
                        Alert.alert('✅ تم', 'تم تأكيد استلام الشحنة');
                    } catch (e: any) { Alert.alert('خطأ', e.message); }
                },
            },
        ]);
    };

    const awaitingConfirm = orders.filter(o => o.status === 'shipped').length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#BF360C', '#EA580C']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>طلباتي من المستودع</Text>
                        <Text style={styles.headerSub}>
                            {awaitingConfirm > 0 ? `${awaitingConfirm} شحنة بانتظار التأكيد` : `${orders.length} طلب`}
                        </Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="truck-delivery" size={26} color="#EA580C" />
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: bottomPad }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? <ActivityIndicator color="#EA580C" style={{ marginTop: 40 }} size="large" /> :
                    orders.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="truck-outline" size={48} color={C.textSec} />
                            <Text style={styles.emptyText}>لا توجد طلبات من المستودع بعد</Text>
                            <TouchableOpacity style={styles.orderBtn} onPress={() => router.push('/(pharmacy)/warehouse' as any)}>
                                <Text style={styles.orderBtnText}>طلب من المستودع</Text>
                            </TouchableOpacity>
                        </View>
                    ) : orders.map((ord: any) => (
                        <View key={ord.id} style={[styles.card, ord.status === 'shipped' && styles.cardHighlight]}>
                            <View style={styles.cardTop}>
                                <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[ord.status] || C.primary) + '18' }]}>
                                    <Text style={[styles.badgeText, { color: STATUS_COLORS[ord.status] || C.primary }]}>
                                        {STATUS_LABELS[ord.status] || ord.status}
                                    </Text>
                                </View>
                                <Text style={styles.whName}>{ord.warehouse?.name || 'المستودع'}</Text>
                            </View>
                            <Text style={styles.date}>📅 {ord.created_at?.split('T')[0] || 'اليوم'}</Text>
                            <View style={styles.itemsBox}>
                                {(ord.items || []).map((item: any, i: number) => (
                                    <Text key={i} style={styles.itemLine}>• {item.name || item.item_id} × {item.qty}</Text>
                                ))}
                            </View>
                            <View style={styles.footer}>
                                <Text style={styles.total}>{(ord.total || 0).toLocaleString()} ل.س</Text>
                                {ord.status === 'shipped' && (
                                    <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmReceipt(ord)}>
                                        <MaterialCommunityIcons name="check-circle" size={18} color="#FFF" />
                                        <Text style={styles.confirmText}>تأكيد الاستلام</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16, paddingHorizontal: 16 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF', textAlign: 'right' },
    headerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: 2 },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.textSec },
    orderBtn: { backgroundColor: '#EA580C', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
    orderBtnText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 14 },
    card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    cardHighlight: { borderWidth: 2, borderColor: C.purple + '40' },
    cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    whName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.text },
    badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    date: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 8 },
    itemsBox: { backgroundColor: C.bg, borderRadius: 12, padding: 10, marginBottom: 10 },
    itemLine: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 2 },
    footer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    total: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#EA580C' },
    confirmBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.success, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    confirmText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_700Bold' },
});
