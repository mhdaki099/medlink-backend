import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const C = {
    primary: '#1E88E5', primaryDark: '#1565C0', accent: '#43A047', success: '#27AE60',
    danger: '#E74C3C', blue: '#2980B9', bg: '#F5F6FA', white: '#FFFFFF',
    text: '#1A1A2E', textSec: '#636E72', textMuted: '#B2BEC3', border: '#E8ECF0',
};

export default function PharmacyDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try {
            const [ords, meds, anal] = await Promise.all([
                api.getOrders({ pharmacy_id: user.id }),
                api.getPharmacyMedicines(user.id),
                api.getPharmacyAnalytics(user.id).catch(() => null),
            ]);
            setOrders(ords);
            setMedicines(meds);
            setAnalytics(anal);
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const updateOrderStatus = async (id: string, status: string) => {
        try {
            await api.updateOrderStatus(id, status);
            load();
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const counts = {
        pending: orders.filter((o: any) => ['pending', 'pending_confirmation'].includes(o.status)).length,
        processing: orders.filter((o: any) => ['processing', 'preparing'].includes(o.status)).length,
        delivered: orders.filter((o: any) => o.status === 'delivered').length,
    };
    const inStock = medicines.filter((m: any) => m.stock_status === 'in_stock').length;

    const STATS = [
        { label: 'أدوية متوفرة', val: inStock, icon: 'pill', color: C.success },
        { label: 'طلبات جديدة', val: counts.pending, icon: 'bell-ring-outline', color: C.primary },
        { label: 'قيد التجهيز', val: counts.processing, icon: 'package-variant', color: C.blue },
        { label: 'تم التسليم', val: counts.delivered, icon: 'check-circle-outline', color: C.success },
        { label: 'المفضلة', val: analytics?.favorites_count || 0, icon: 'heart-outline', color: '#E91E63' },
        { label: 'هذا الشهر', val: analytics?.monthly_bookings || 0, icon: 'calendar-month', color: C.blue },
        { label: 'التقييم', val: analytics?.overall_rating || '—', icon: 'star-outline', color: '#F59E0B' },
        { label: 'العملاء', val: analytics?.active_customers || 0, icon: 'account-group-outline', color: C.accent },
    ];

    const STATUS_LABELS: Record<string, string> = { pending: 'جديد', pending_confirmation: 'جديد', processing: 'قيد التجهيز', preparing: 'قيد التجهيز', delivered: 'تم التسليم', cancelled: 'ملغى' };
    const STATUS_COLORS: Record<string, string> = { pending: C.primary, pending_confirmation: C.primary, processing: C.blue, preparing: C.blue, delivered: C.success, cancelled: C.danger };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}>

            {/* Gradient Header */}
            <LinearGradient colors={[C.primaryDark, C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob1} />
                <View style={styles.headerBlob2} />
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <MaterialCommunityIcons name="logout" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <View style={styles.avatarCircle}>
                            <MaterialCommunityIcons name="store" size={28} color={C.primary} />
                        </View>
                    </View>
                </View>
                <Text style={styles.greeting}>{user?.name || 'الصيدلية'}</Text>
                <Text style={styles.sub}>{user?.clinic_address || user?.city || 'سوريا'}</Text>
            </LinearGradient>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                {STATS.map((s) => (
                    <View key={s.label} style={styles.statCard}>
                        <View style={[styles.statIconCircle, { backgroundColor: s.color + '15' }]}>
                            <MaterialCommunityIcons name={s.icon as any} size={22} color={s.color} />
                        </View>
                        <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {/* Prescription Fulfillment Quick Action */}
            <TouchableOpacity style={styles.rxBtn} onPress={() => router.push('/(pharmacy)/prescriptions' as any)}>
                <LinearGradient colors={[C.accent, C.primary]} style={styles.rxBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <MaterialCommunityIcons name="file-document-outline" size={24} color="#FFF" />
                    <Text style={styles.rxBtnText}>صرف الوصفات الطبية</Text>
                </LinearGradient>
            </TouchableOpacity>

            {/* Pending Orders */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="clipboard-list-outline" size={20} color={C.primary} />
                    <Text style={styles.sectionTitle}>الطلبات الجديدة</Text>
                </View>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} /> :
                    orders.filter((o: any) => ['pending', 'pending_confirmation'].includes(o.status)).length === 0 ? (
                        <View style={styles.empty}>
                            <View style={styles.emptyIconCircle}>
                                <MaterialCommunityIcons name="check-circle" size={36} color={C.success} />
                            </View>
                            <Text style={styles.emptyText}>لا توجد طلبات جديدة</Text>
                        </View>
                    ) : orders.filter((o: any) => ['pending', 'pending_confirmation'].includes(o.status)).map((ord: any) => (
                        <View key={ord.id} style={styles.orderCard}>
                            <View style={styles.orderHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[ord.status] || C.primary) + '15' }]}>
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[ord.status] || C.primary }]}>{STATUS_LABELS[ord.status]}</Text>
                                </View>
                                <View style={styles.orderNameRow}>
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
                                <Text style={styles.infoText}>{(ord.items || []).length} أصناف</Text>
                                <MaterialCommunityIcons name="package-variant" size={14} color={C.textSec} style={{ marginLeft: 6 }} />
                            </View>
                            <View style={styles.orderFooter}>
                                <Text style={styles.orderTotal}>{(ord.total || 0).toLocaleString()} ل.س</Text>
                                <View style={styles.orderActions}>
                                    <TouchableOpacity style={styles.rejectBtn} onPress={() => updateOrderStatus(ord.id, 'cancelled')}>
                                        <MaterialCommunityIcons name="close" size={18} color={C.danger} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.acceptBtn} onPress={() => updateOrderStatus(ord.id, 'preparing')}>
                                        <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                                        <Text style={styles.acceptBtnText}>قبول</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ))}
            </View>

            {/* Processing Orders */}
            {orders.filter((o: any) => ['processing', 'preparing'].includes(o.status)).length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="truck-delivery-outline" size={20} color={C.blue} />
                        <Text style={styles.sectionTitle}>قيد التوصيل</Text>
                    </View>
                    {orders.filter((o: any) => ['processing', 'preparing'].includes(o.status)).map((ord: any) => (
                        <View key={ord.id} style={styles.orderCard}>
                            <View style={styles.orderHeader}>
                                <View style={[styles.statusBadge, { backgroundColor: C.blue + '15' }]}>
                                    <Text style={[styles.statusText, { color: C.blue }]}>جاري التوصيل</Text>
                                </View>
                                <Text style={styles.patientName}>{ord.patient?.name || 'مريض'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoText}>{ord.delivery_address || 'بدون عنوان'}</Text>
                                <MaterialCommunityIcons name="map-marker" size={14} color={C.textSec} style={{ marginLeft: 6 }} />
                            </View>
                            <View style={styles.orderFooter}>
                                <Text style={styles.orderTotal}>{(ord.total || 0).toLocaleString()} ل.س</Text>
                                <TouchableOpacity style={styles.deliveredBtn} onPress={() => updateOrderStatus(ord.id, 'delivered')}>
                                    <MaterialCommunityIcons name="check-all" size={16} color={C.success} />
                                    <Text style={styles.deliveredBtnText}>تم التوصيل</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 28, paddingHorizontal: 20, overflow: 'hidden' },
    headerBlob1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40 },
    headerBlob2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -30, left: -20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    logoutBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    greeting: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#FFF', textAlign: 'right' },
    sub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 2 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: -16, gap: 8 },
    statCard: { width: (width - 40) / 2, backgroundColor: C.white, borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    statIconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statVal: { fontSize: 24, fontFamily: 'Cairo_700Bold' },
    statLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec, marginTop: 2 },
    section: { paddingHorizontal: 16, marginTop: 20 },
    sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: C.text },
    empty: { alignItems: 'center', paddingVertical: 28, backgroundColor: C.white, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
    emptyIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.success + '12', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    emptyText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.textSec },
    orderCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    orderNameRow: { flexDirection: 'row', alignItems: 'center' },
    patientName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text },
    statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4 },
    infoText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    orderTotal: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.primary },
    orderActions: { flexDirection: 'row', gap: 8 },
    rejectBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.danger + '12', justifyContent: 'center', alignItems: 'center' },
    acceptBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    acceptBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_700Bold' },
    deliveredBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: C.success + '12', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
    deliveredBtnText: { color: C.success, fontSize: 13, fontFamily: 'Cairo_700Bold' },
    rxBtn: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
    rxBtnGrad: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    rxBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#FFF' },
});
