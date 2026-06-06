import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import WarehouseInvoiceSheet from '../../src/components/WarehouseInvoiceSheet';

import { useProviderTabBarClearance } from '../../src/constants/layout';
const C = {
    primary: '#1E88E5', accent: '#43A047', success: '#10B981', danger: '#EF4444', warning: '#F59E0B', blue: '#3B82F6',
    bg: '#F8FAFC', white: '#FFF', text: '#111827', textSec: '#6B7280', border: '#F1F5F9',
};
const STATUS_COLORS: Record<string, string> = { pending: C.warning, processing: C.blue, shipped: '#8B5CF6', delivered: C.success, cancelled: C.danger };
const STATUS_LABELS: Record<string, string> = { pending: 'جديد', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'استلمته الصيدلية', cancelled: 'ملغى' };
const STATUS_ICONS: Record<string, string> = { pending: 'clock-outline', processing: 'package-variant', shipped: 'truck-fast-outline', delivered: 'check-circle-outline', cancelled: 'close-circle-outline' };

export default function WarehouseOrders() {
    const { user, token } = useAuth();
    const bottomPad = useProviderTabBarClearance();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');
    const [invoiceData, setInvoiceData] = useState<any | null>(null);
    const [invoiceSaving, setInvoiceSaving] = useState(false);
    const [invoiceEdit, setInvoiceEdit] = useState(false);
    const [promoters, setPromoters] = useState<any[]>([]);

    useEffect(() => { if (token) api.setToken(token); }, [token]);

    const load = async () => {
        if (!user?.id || !token) return;
        api.setToken(token);
        try {
            const [ords, promos] = await Promise.all([
                api.getWarehouseOrders(user.id),
                api.getWarehousePromoters().catch(() => []),
            ]);
            setOrders(ords);
            setPromoters(promos);
        }
        catch (e) { console.warn(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user?.id, token]);

    const update = async (id: string, status: string) => {
        try {
            await api.updateWarehouseOrderStatus(id, status);
            load();
            if (status === 'shipped') {
                const inv = await api.getWarehouseOrderInvoice(id);
                setInvoiceData(inv);
                setInvoiceEdit(true);
            }
        }
        catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const openInvoice = async (orderId: string, editable: boolean) => {
        try {
            const inv = await api.getWarehouseOrderInvoice(orderId);
            setInvoiceData(inv);
            setInvoiceEdit(editable);
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const saveInvoice = async (data: any) => {
        if (!invoiceData?.order_id) return;
        setInvoiceSaving(true);
        try {
            const inv = await api.updateWarehouseOrderInvoice(invoiceData.order_id, data);
            setInvoiceData(inv);
            setInvoiceEdit(false);
            load();
            Alert.alert('✅ تم', 'تم حفظ الفاتورة');
        } catch (e: any) { Alert.alert('خطأ', e.message); }
        finally { setInvoiceSaving(false); }
    };

    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);
    const FILTERS = [
        { key: 'all', label: 'الكل', count: orders.length },
        { key: 'pending', label: 'جديدة', count: orders.filter(o => o.status === 'pending').length },
        { key: 'processing', label: 'تجهيز', count: orders.filter(o => o.status === 'processing').length },
        { key: 'shipped', label: 'شُحن', count: orders.filter(o => o.status === 'shipped').length },
        { key: 'delivered', label: 'مُستلم', count: orders.filter(o => o.status === 'delivered').length },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient colors={[C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerRow}>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="truck-delivery" size={26} color={C.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>طلبات الشحن</Text>
                        <Text style={styles.headerSub}>{orders.length} طلب</Text>
                    </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    {FILTERS.map(f => (
                        <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
                            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label} ({f.count})</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </LinearGradient>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="truck-outline" size={56} color="#E5E7EB" />
                            <Text style={styles.emptyText}>لا توجد طلبات</Text>
                        </View>
                    ) : filtered.map((ord: any) => (
                        <View key={ord.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ord.status] || C.primary) + '18' }]}>
                                    <MaterialCommunityIcons name={STATUS_ICONS[ord.status] as any || 'help'} size={13} color={STATUS_COLORS[ord.status] || C.primary} />
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[ord.status] || C.primary }]}>{STATUS_LABELS[ord.status] || ord.status}</Text>
                                </View>
                                <Text style={styles.pharmacyName}>{ord.pharmacy?.name || 'صيدلية'}</Text>
                            </View>
                            {(ord.purchase_order_number) && (
                                <View style={styles.poRow}>
                                    <MaterialCommunityIcons name="file-sign" size={14} color={C.primary} />
                                    <Text style={styles.poText}>{ord.purchase_order_number}</Text>
                                </View>
                            )}
                            <View style={styles.metaRow}>
                                <View style={styles.metaPill}>
                                    <MaterialCommunityIcons name="calendar-outline" size={13} color={C.textSec} />
                                    <Text style={styles.metaText}>{ord.created_at?.split('T')[0] || 'اليوم'}</Text>
                                </View>
                                {ord.delivery_time && (
                                    <View style={styles.metaPill}>
                                        <MaterialCommunityIcons name="truck-fast-outline" size={13} color={C.blue} />
                                        <Text style={[styles.metaText, { color: C.blue }]}>تسليم: {ord.delivery_time}</Text>
                                    </View>
                                )}
                            </View>
                            {(ord.items || []).length > 0 && (
                                <View style={styles.itemsList}>
                                    {(ord.items || []).slice(0, 3).map((item: any, i: number) => (
                                        <Text key={i} style={styles.itemText}>• {item.name || item.item_id} × {item.qty}</Text>
                                    ))}
                                    {(ord.items || []).length > 3 && (
                                        <Text style={styles.itemText}>+ {ord.items.length - 3} أصناف أخرى</Text>
                                    )}
                                </View>
                            )}
                            <View style={styles.cardFooter}>
                                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                    <Text style={styles.totalText}>{(ord.total || 0).toLocaleString()} ل.س</Text>
                                    {ord.status !== 'pending' && ord.status !== 'cancelled' && (
                                        <TouchableOpacity style={styles.invoiceBtn} onPress={() => openInvoice(ord.id, ord.status !== 'delivered')}>
                                            <MaterialCommunityIcons name="file-document-edit-outline" size={14} color={C.primary} />
                                            <Text style={styles.invoiceBtnText}>{ord.status === 'delivered' ? 'عرض الفاتورة' : 'تعديل الفاتورة'}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {ord.status === 'pending' && (
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.rejectBtn} onPress={() => update(ord.id, 'cancelled')}>
                                            <MaterialCommunityIcons name="close" size={16} color={C.danger} />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.acceptBtn} onPress={() => update(ord.id, 'processing')}>
                                            <MaterialCommunityIcons name="package-variant" size={16} color="#FFF" />
                                            <Text style={styles.acceptText}>قبول وتجهيز</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {ord.status === 'processing' && (
                                    <TouchableOpacity style={styles.deliveredBtn} onPress={() => update(ord.id, 'shipped')}>
                                        <MaterialCommunityIcons name="truck-fast-outline" size={16} color="#8B5CF6" />
                                        <Text style={[styles.deliveredText, { color: '#8B5CF6' }]}>تم الشحن للصيدلية</Text>
                                    </TouchableOpacity>
                                )}
                                {ord.status === 'shipped' && (
                                    <Text style={styles.waitingText}>بانتظار تأكيد الصيدلية</Text>
                                )}
                            </View>
                        </View>
                    ))}
            </ScrollView>

            <WarehouseInvoiceSheet
                visible={!!invoiceData}
                onClose={() => { setInvoiceData(null); setInvoiceEdit(false); }}
                invoice={invoiceData}
                editable={invoiceEdit}
                promoters={promoters}
                onSave={saveInvoice}
                saving={invoiceSaving}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16, paddingHorizontal: 20, overflow: 'hidden' },
    headerBlob: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)', top: -40, left: -30 },
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
    card: { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    pharmacyName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.text },
    poRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 8, alignSelf: 'flex-end' },
    poText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: C.primary },
    statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    metaRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 10 },
    metaPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    metaText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    itemsList: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginBottom: 10 },
    itemText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 2 },
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    totalText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.primary },
    actions: { flexDirection: 'row', gap: 8 },
    rejectBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.danger + '12', justifyContent: 'center', alignItems: 'center' },
    acceptBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    acceptText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_700Bold' },
    deliveredBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: C.success + '12', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    deliveredText: { color: C.success, fontSize: 13, fontFamily: 'Cairo_700Bold' },
    waitingText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    invoiceBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: C.primary + '12', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
    invoiceBtnText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: C.primary },
});
