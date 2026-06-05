import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import OrderItemsList from '../../src/components/OrderItemsList';

import { TAB_BAR_CLEARANCE, TAB_BAR_FAB_BOTTOM } from '../../src/constants/layout';
const C = {
    primary: '#1E88E5', accent: '#43A047', success: '#27AE60', danger: '#E74C3C',
    blue: '#2980B9', bg: '#F5F6FA', white: '#FFF', text: '#1A1A2E',
    textSec: '#636E72', textMuted: '#B2BEC3', border: '#E8ECF0',
};
const STATUS_COLORS: Record<string, string> = { pending_confirmation: C.primary, pending: C.primary, preparing: C.blue, processing: C.blue, delivered: C.success, cancelled: C.danger };
const STATUS_LABELS: Record<string, string> = { pending_confirmation: 'بانتظار التأكيد', pending: 'بانتظار التأكيد', preparing: 'قيد التجهيز', processing: 'قيد التجهيز', delivered: 'تم التسليم', cancelled: 'ملغى' };
const STATUS_ICONS: Record<string, string> = { pending_confirmation: 'clock-outline', pending: 'clock-outline', preparing: 'package-variant', processing: 'package-variant', delivered: 'check-circle-outline', cancelled: 'close-circle-outline' };

export default function PharmacyOrders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    const load = async () => {
        if (!user?.id) return;
        try { const ords = await api.getOrders({ pharmacy_id: user.id }); setOrders(ords); }
        catch (e) { console.warn(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const updateStatus = async (id: string, status: string) => {
        try { await api.updateOrderStatus(id, status); load(); }
        catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const filtered = filter === 'all' ? orders : orders.filter((o: any) => filter === 'pending_confirmation' ? ['pending', 'pending_confirmation'].includes(o.status) : filter === 'preparing' ? ['processing', 'preparing'].includes(o.status) : o.status === filter);
    const FILTERS = [
        { key: 'all', label: 'الكل', count: orders.length },
        { key: 'pending_confirmation', label: 'جديدة', count: orders.filter(o => ['pending', 'pending_confirmation'].includes(o.status)).length },
        { key: 'preparing', label: 'قيد التجهيز', count: orders.filter(o => ['processing', 'preparing'].includes(o.status)).length },
        { key: 'delivered', label: 'تم', count: orders.filter(o => o.status === 'delivered').length },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient colors={[C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerRow}>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>إدارة الطلبات</Text>
                        <Text style={styles.headerSub}>{orders.length} طلب</Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="clipboard-list" size={26} color={C.primary} />
                    </View>
                </View>
                {/* Filter chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    {FILTERS.map(f => (
                        <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
                            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label} ({f.count})</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </LinearGradient>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="clipboard-check-outline" size={48} color={C.textMuted} />
                            <Text style={styles.emptyText}>لا توجد طلبات</Text>
                        </View>
                    ) : filtered.map((ord: any) => (
                        <View key={ord.id} style={styles.orderCard}>
                            <View style={styles.orderTop}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ord.status] || C.primary) + '15' }]}>
                                    <MaterialCommunityIcons name={STATUS_ICONS[ord.status] as any || 'help'} size={14} color={STATUS_COLORS[ord.status] || C.primary} />
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[ord.status] || C.primary }]}>{STATUS_LABELS[ord.status]}</Text>
                                </View>
                                <View style={styles.nameRow}>
                                    <Text style={styles.patientName}>{ord.patient?.name || 'مريض'}</Text>
                                    <MaterialCommunityIcons name="account" size={18} color={C.text} style={{ marginLeft: 4 }} />
                                </View>
                            </View>

                            {ord.patient?.phone && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoText}>{ord.patient.phone}</Text>
                                    <MaterialCommunityIcons name="phone" size={14} color={C.textSec} style={{ marginLeft: 6 }} />
                                </View>
                            )}
                            <View style={styles.infoRow}>
                                <Text style={styles.infoText}>{ord.delivery_address || 'بدون عنوان'}</Text>
                                <MaterialCommunityIcons name="map-marker" size={14} color={C.textSec} style={{ marginLeft: 6 }} />
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoText}>{(ord.items || []).length} أصناف • {ord.created_at?.split('T')[0]}</Text>
                                <MaterialCommunityIcons name="package-variant" size={14} color={C.textSec} style={{ marginLeft: 6 }} />
                            </View>

                            {(ord.prescription_code || ord.prescription?.prescription_code) && (
                                <View style={styles.rxRow}>
                                    <MaterialCommunityIcons name="file-document-outline" size={14} color="#FF9500" style={{ marginLeft: 6 }} />
                                    <Text style={styles.rxText}>وصفة: {ord.prescription_code || ord.prescription?.prescription_code}</Text>
                                </View>
                            )}

                            <OrderItemsList items={ord.items} />

                            <View style={styles.orderFooter}>
                                <Text style={styles.orderTotal}>{(ord.total || 0).toLocaleString()} ل.س</Text>
                                {['pending', 'pending_confirmation'].includes(ord.status) && (
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.rejectBtn} onPress={() => updateStatus(ord.id, 'cancelled')}>
                                            <MaterialCommunityIcons name="close" size={18} color={C.danger} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.acceptBtn} onPress={() => updateStatus(ord.id, 'preparing')}>
                                            <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                                            <Text style={styles.acceptText}>قبول</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {['processing', 'preparing'].includes(ord.status) && (
                                    <TouchableOpacity style={styles.deliveredBtn} onPress={() => updateStatus(ord.id, 'delivered')}>
                                        <MaterialCommunityIcons name="check-all" size={16} color={C.success} />
                                        <Text style={styles.deliveredText}>تم التوصيل</Text>
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
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16, paddingHorizontal: 20, overflow: 'hidden' },
    headerBlob: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)', top: -30, left: -30 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)' },
    filterRow: { marginTop: 4 },
    filterChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6, marginLeft: 8 },
    filterActive: { backgroundColor: '#FFF' },
    filterText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: 'rgba(255,255,255,0.9)' },
    filterTextActive: { color: C.primary },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.textSec },
    orderCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    patientName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text },
    statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4 },
    infoText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec },
    rxRow: { flexDirection: 'row-reverse', alignItems: 'center', marginTop: 6 },
    rxText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#FF9500' },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    orderTotal: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.primary },
    actions: { flexDirection: 'row', gap: 8 },
    rejectBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.danger + '12', justifyContent: 'center', alignItems: 'center' },
    acceptBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    acceptText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_700Bold' },
    deliveredBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: C.success + '12', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    deliveredText: { color: C.success, fontSize: 13, fontFamily: 'Cairo_700Bold' },
});
