import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSubscreenBottomPadding } from '../../src/constants/layout';
import ModernSheet from '../../src/components/ModernSheet';
import WarehouseInvoiceSheet from '../../src/components/WarehouseInvoiceSheet';

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

type FilterKey = 'all' | 'active' | 'completed';

const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'active', label: 'نشطة' },
    { key: 'completed', label: 'مكتملة' },
];

const ACTIVE_STATUSES = new Set(['pending', 'processing', 'shipped']);

export default function PharmacyWarehouseOrders() {
    const { user } = useAuth();
    const router = useRouter();
    const bottomPad = useSubscreenBottomPadding();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [pendingOrder, setPendingOrder] = useState<any | null>(null);
    const [successData, setSuccessData] = useState<{ stockUpdates: any[]; warehouseName: string } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [invoiceData, setInvoiceData] = useState<any | null>(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try {
            setLoadError(null);
            const ords = await api.getPharmacyWarehouseOrders(user.id);
            setOrders((ords || []).sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || '')));
        } catch (e: any) {
            setLoadError(e?.message || 'تعذر تحميل الطلبات');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [user]);

    const filteredOrders = useMemo(() => {
        if (filter === 'active') return orders.filter(o => ACTIVE_STATUSES.has(o.status));
        if (filter === 'completed') return orders.filter(o => o.status === 'delivered');
        return orders;
    }, [orders, filter]);

    const awaitingConfirm = orders.filter(o => o.status === 'shipped').length;

    const openInvoice = async (orderId: string) => {
        setInvoiceLoading(true);
        try {
            const inv = await api.getWarehouseOrderInvoice(orderId);
            setInvoiceData(inv);
        } catch (e: any) {
            setErrorMsg(e.message || 'تعذر تحميل الفاتورة');
        } finally {
            setInvoiceLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!pendingOrder) return;
        setConfirmingId(pendingOrder.id);
        try {
            const updated = await api.confirmPharmacyWarehouseOrder(pendingOrder.id);
            setOrders(prev => {
                const next = prev.map(o => o.id === updated.id ? { ...o, ...updated } : o);
                if (!next.some(o => o.id === updated.id)) next.unshift(updated);
                return next.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            });
            setPendingOrder(null);
            setSuccessData({
                stockUpdates: updated.stock_updates || [],
                warehouseName: updated.warehouse?.name || pendingOrder.warehouse?.name || 'المستودع',
            });
        } catch (e: any) {
            setErrorMsg(e.message || 'تعذر تأكيد الاستلام');
        } finally {
            setConfirmingId(null);
        }
    };

    const renderOrderCard = (ord: any) => (
        <View key={ord.id} style={[styles.card, ord.status === 'shipped' && styles.cardHighlight, ord.status === 'delivered' && styles.cardDelivered]}>
            <View style={styles.cardTop}>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[ord.status] || C.primary) + '18' }]}>
                    <Text style={[styles.badgeText, { color: STATUS_COLORS[ord.status] || C.primary }]}>
                        {STATUS_LABELS[ord.status] || ord.status}
                    </Text>
                </View>
                <Text style={styles.whName}>{ord.warehouse?.name || 'المستودع'}</Text>
            </View>
            {ord.purchase_order_number ? (
                <View style={styles.poRow}>
                    <MaterialCommunityIcons name="file-sign" size={14} color={C.primary} />
                    <Text style={styles.poText}>أمر شراء: {ord.purchase_order_number}</Text>
                </View>
            ) : null}
            <Text style={styles.date}>📅 {ord.created_at?.split('T')[0] || 'اليوم'}</Text>
            {ord.status === 'delivered' && (
                <View style={styles.deliveredNote}>
                    <MaterialCommunityIcons name="check-circle" size={16} color={C.success} />
                    <Text style={styles.deliveredNoteText}>تم الاستلام — الأدوية أُضيفت للمخزون</Text>
                </View>
            )}
            <View style={styles.itemsBox}>
                {(ord.items || []).map((item: any, i: number) => (
                    <View key={i} style={styles.itemRow}>
                        <Text style={styles.itemQty}>×{item.qty}</Text>
                        <Text style={styles.itemLine}>{item.name || item.item_id}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.footer}>
                <View style={{ gap: 8, alignItems: 'flex-end' }}>
                    <Text style={styles.total}>{(ord.total || 0).toLocaleString()} ل.س</Text>
                    {['shipped', 'delivered', 'processing'].includes(ord.status) && (
                        <TouchableOpacity style={styles.invoiceBtn} onPress={() => openInvoice(ord.id)} disabled={invoiceLoading}>
                            <MaterialCommunityIcons name="file-document-outline" size={16} color={C.primary} />
                            <Text style={styles.invoiceBtnText}>عرض الفاتورة</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {ord.status === 'shipped' && (
                    <TouchableOpacity
                        style={[styles.confirmBtn, confirmingId === ord.id && { opacity: 0.7 }]}
                        onPress={() => setPendingOrder(ord)}
                        disabled={!!confirmingId}
                    >
                        <MaterialCommunityIcons name="check-circle" size={18} color="#FFF" />
                        <Text style={styles.confirmText}>تأكيد الاستلام</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

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

            <View style={styles.filterRow}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                        onPress={() => setFilter(f.key)}
                    >
                        <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: bottomPad }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? <ActivityIndicator color="#EA580C" style={{ marginTop: 40 }} size="large" /> :
                    loadError ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={48} color={C.danger} />
                            <Text style={styles.emptyText}>{loadError}</Text>
                            <TouchableOpacity style={styles.orderBtn} onPress={load}>
                                <Text style={styles.orderBtnText}>إعادة المحاولة</Text>
                            </TouchableOpacity>
                        </View>
                    ) : orders.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="truck-outline" size={48} color={C.textSec} />
                            <Text style={styles.emptyText}>لا توجد طلبات من المستودع بعد</Text>
                            <TouchableOpacity style={styles.orderBtn} onPress={() => router.push('/(pharmacy)/warehouse' as any)}>
                                <Text style={styles.orderBtnText}>طلب من المستودع</Text>
                            </TouchableOpacity>
                        </View>
                    ) : filteredOrders.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="filter-outline" size={48} color={C.textSec} />
                            <Text style={styles.emptyText}>
                                {filter === 'active' ? 'لا توجد طلبات نشطة' : 'لا توجد طلبات مكتملة بعد'}
                            </Text>
                            <TouchableOpacity style={styles.orderBtn} onPress={() => setFilter('all')}>
                                <Text style={styles.orderBtnText}>عرض كل الطلبات</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {filter === 'all' && awaitingConfirm > 0 && (
                                <Text style={styles.sectionTitle}>بانتظار التأكيد ({awaitingConfirm})</Text>
                            )}
                            {filteredOrders.map(renderOrderCard)}
                        </>
                    )}
            </ScrollView>

            <ModernSheet
                visible={!!pendingOrder}
                onClose={() => !confirmingId && setPendingOrder(null)}
                title="تأكيد استلام الشحنة"
                subtitle={`هل استلمت شحنة «${pendingOrder?.warehouse?.name || 'المستودع'}» بالكامل؟\nسيتم إضافة الكميات تلقائياً إلى مخزون الصيدلية.`}
                icon="package-variant-closed-check"
                iconColors={['#EA580C', '#F59E0B']}
                actions={[
                    { label: 'ليس بعد', onPress: () => setPendingOrder(null), variant: 'secondary' },
                    { label: 'نعم، استلمت الشحنة', onPress: handleConfirm, variant: 'primary', loading: !!confirmingId },
                ]}
            >
                <View style={styles.sheetItems}>
                    {(pendingOrder?.items || []).map((item: any, i: number) => (
                        <View key={i} style={styles.sheetItem}>
                            <View style={styles.sheetItemIcon}>
                                <MaterialCommunityIcons name="pill" size={16} color="#EA580C" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetItemName}>{item.name || item.item_id}</Text>
                                <Text style={styles.sheetItemMeta}>
                                    الكمية: {item.qty} {item.unit || 'وحدة'}
                                    {item.units_per_pack ? ` • ${item.units_per_pack} وحدة/حزمة` : ''}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ModernSheet>

            <ModernSheet
                visible={!!successData}
                onClose={() => setSuccessData(null)}
                title="تم الاستلام بنجاح"
                subtitle={`أُضيفت الأدوية إلى مخزون الصيدلية من ${successData?.warehouseName || 'المستودع'}`}
                icon="check-decagram"
                iconColors={['#10B981', '#059669']}
                actions={[
                    { label: 'إغلاق', onPress: () => setSuccessData(null), variant: 'secondary' },
                    {
                        label: 'عرض مخزون الأدوية',
                        onPress: () => { setSuccessData(null); router.push('/(pharmacy)/medicines' as any); },
                        variant: 'primary',
                    },
                ]}
            >
                {successData?.stockUpdates?.length ? (
                    <View style={styles.stockList}>
                        {successData.stockUpdates.map((u: any) => (
                            <View key={u.medicine_id} style={styles.stockRow}>
                                <View style={styles.stockAdded}>
                                    <Text style={styles.stockAddedText}>+{u.added}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.stockName}>{u.name}</Text>
                                    <Text style={styles.stockTotal}>المجموع الآن: {u.total} وحدة</Text>
                                </View>
                                {u.created && (
                                    <View style={styles.newBadge}><Text style={styles.newBadgeText}>جديد</Text></View>
                                )}
                            </View>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.noStockText}>تم تأكيد الاستلام. تحقق من قائمة الأدوية.</Text>
                )}
            </ModernSheet>

            <WarehouseInvoiceSheet
                visible={!!invoiceData}
                onClose={() => setInvoiceData(null)}
                invoice={invoiceData}
            />

            <ModernSheet
                visible={!!errorMsg}
                onClose={() => setErrorMsg(null)}
                title="تعذر التأكيد"
                subtitle={errorMsg || ''}
                icon="alert-circle-outline"
                iconColors={['#EF4444', '#DC2626']}
                actions={[{ label: 'حسناً', onPress: () => setErrorMsg(null), variant: 'primary' }]}
            />
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
    filterRow: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
    filterChipActive: { backgroundColor: '#EA580C', borderColor: '#EA580C' },
    filterText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    filterTextActive: { color: '#FFF' },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    sectionTitle: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.purple, textAlign: 'right', marginBottom: 8 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'center' },
    orderBtn: { backgroundColor: '#EA580C', borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
    orderBtnText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 14 },
    card: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    cardHighlight: { borderWidth: 2, borderColor: C.purple + '40' },
    cardDelivered: { borderWidth: 1, borderColor: C.success + '30' },
    cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    whName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.text },
    poRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6, alignSelf: 'flex-end' },
    poText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: C.primary },
    badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    date: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 8 },
    deliveredNote: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.success + '12', borderRadius: 10, padding: 8, marginBottom: 8 },
    deliveredNoteText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.success },
    itemsBox: { backgroundColor: C.bg, borderRadius: 12, padding: 10, marginBottom: 10 },
    itemRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
    itemLine: { flex: 1, fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right' },
    itemQty: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#EA580C' },
    footer: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    total: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#EA580C' },
    invoiceBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: C.primary + '12', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    invoiceBtnText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: C.primary },
    confirmBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.success, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    confirmText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_700Bold' },
    sheetItems: { gap: 8 },
    sheetItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    sheetItemIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EA580C18', justifyContent: 'center', alignItems: 'center' },
    sheetItemName: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A', textAlign: 'right' },
    sheetItemMeta: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'right', marginTop: 2 },
    stockList: { gap: 8 },
    stockRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
    stockAdded: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    stockAddedText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 13 },
    stockName: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A', textAlign: 'right' },
    stockTotal: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'right' },
    newBadge: { backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    newBadgeText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#2563EB' },
    noStockText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'center' },
});
