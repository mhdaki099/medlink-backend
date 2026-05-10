import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
    confirmed: Colors.confirmed, pending: Colors.pending,
    cancelled: Colors.cancelled, completed: Colors.completed,
    delivered: Colors.confirmed, processing: Colors.pending,
    booked: Colors.primary,
};
const STATUS_LABELS: Record<string, string> = {
    confirmed: 'مؤكد', pending: 'بانتظار', cancelled: 'ملغى', completed: 'مكتمل',
    delivered: 'تم التوصيل', processing: 'جاري المعالجة', booked: 'محجوز',
};

export default function HistoryScreen() {
    const { user } = useAuth();
    const [history, setHistory] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'appointments' | 'orders' | 'labs'>('appointments');

    const load = async () => {
        if (!user?.id) return;
        try {
            const data = await api.getPatientHistory(user.id);
            setHistory(data);
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const StatusBadge = ({ status }: { status: string }) => (
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[status] || Colors.primary) + '18' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[status] || Colors.primary }]}>
                {STATUS_LABELS[status] || status}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1E88E5', '#43A047']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>سجل نشاطي 📊</Text>
                <Text style={styles.headerSub}>كل تاريخك الطبي في مكان واحد</Text>
            </LinearGradient>

            {/* Stats row */}
            {history && (
                <View style={styles.statsRow}>
                    {[
                        { label: 'مواعيد', val: history.appointments?.length || 0, icon: '📅', color: Colors.primary },
                        { label: 'طلبات', val: history.orders?.length || 0, icon: '🛒', color: Colors.pharmacy },
                        { label: 'تحاليل', val: history.lab_bookings?.length || 0, icon: '🧪', color: Colors.lab },
                        { label: 'سجلات', val: history.records?.length || 0, icon: '📋', color: Colors.purple },
                    ].map((s) => (
                        <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                            <Text style={styles.statIcon}>{s.icon}</Text>
                            <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsBar}>
                {[
                    { key: 'appointments', label: '📅 المواعيد' },
                    { key: 'orders', label: '🛒 الطلبات' },
                    { key: 'labs', label: '🧪 المختبر' },
                ].map((t) => (
                    <View key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]}>
                        <Text
                            style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}
                            onPress={() => setActiveTab(t.key as any)}
                        >
                            {t.label}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} size="large" />
                ) : !history ? (
                    <Text style={styles.errorText}>تعذر تحميل البيانات</Text>
                ) : activeTab === 'appointments' ? (
                    (history.appointments || []).length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>📅</Text><Text style={styles.emptyText}>لا توجد مواعيد</Text></View>
                    ) : (history.appointments || []).map((apt: any) => (
                        <View key={apt.id} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                                <StatusBadge status={apt.status} />
                                <Text style={styles.itemTitle}>{apt.doctor?.name || 'طبيب'}</Text>
                            </View>
                            <Text style={styles.itemSub}>{apt.doctor?.specialization || ''}</Text>
                            <Text style={styles.itemDate}>📅 {apt.date} — ⏰ {apt.time}</Text>
                            <Text style={styles.itemPrice}>💰 {(apt.price || 0).toLocaleString()} ل.س</Text>
                        </View>
                    ))
                ) : activeTab === 'orders' ? (
                    (history.orders || []).length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>🛒</Text><Text style={styles.emptyText}>لا توجد طلبات</Text></View>
                    ) : (history.orders || []).map((ord: any) => (
                        <View key={ord.id} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                                <StatusBadge status={ord.status} />
                                <Text style={styles.itemTitle}>{ord.pharmacy?.name || 'صيدلية'}</Text>
                            </View>
                            <Text style={styles.itemSub}>{(ord.items || []).length} أصناف</Text>
                            <Text style={styles.itemDate}>📅 {ord.created_at?.split('T')[0]}</Text>
                            <Text style={styles.itemPrice}>المجموع: {(ord.total || 0).toLocaleString()} ل.س</Text>
                        </View>
                    ))
                ) : (
                    (history.lab_bookings || []).length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>🧪</Text><Text style={styles.emptyText}>لا توجد تحاليل</Text></View>
                    ) : (history.lab_bookings || []).map((bk: any) => (
                        <View key={bk.id} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                                <StatusBadge status={bk.status} />
                                <Text style={styles.itemTitle}>{bk.test?.name || 'تحليل'}</Text>
                            </View>
                            <Text style={styles.itemSub}>🏥 {bk.lab?.name || 'مختبر'}</Text>
                            <Text style={styles.itemDate}>📅 {bk.date} — ⏰ {bk.time}</Text>
                            <Text style={styles.itemPrice}>💰 {(bk.test?.price || 0).toLocaleString()} ل.س</Text>
                        </View>
                    ))
                )}
                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.text, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'right' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 },
    statsRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
    statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: 10, alignItems: 'center', borderTopWidth: 3, ...Shadow.small },
    statIcon: { fontSize: 18 },
    statVal: { fontSize: 18, fontWeight: '800', marginTop: 4 },
    statLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2 },
    tabsBar: { paddingHorizontal: 14, maxHeight: 48 },
    tab: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 4 },
    tabActive: { borderBottomColor: Colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
    tabTextActive: { color: Colors.primary },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 15, color: Colors.textSecondary },
    errorText: { textAlign: 'center', color: Colors.danger, marginTop: 40 },
    itemCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    itemTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, flex: 1, textAlign: 'right', marginLeft: 8 },
    itemSub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 4 },
    itemDate: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginBottom: 2 },
    itemPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary, textAlign: 'right' },
    statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
});
