import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const C = {
    primary: '#8E24AA', accent: '#CE93D8', success: '#27AE60', warning: '#F59E0B',
    bg: '#F8FAFC', white: '#FFF', text: '#111827', textSec: '#6B7280', border: '#F1F5F9',
};
const STATUS_COLORS: Record<string, string> = { booked: C.warning, processing: C.primary, completed: C.success };
const STATUS_LABELS: Record<string, string> = { booked: 'محجوز', processing: 'جاري الفحص', completed: 'مكتمل' };
const STATUS_ICONS: Record<string, string> = { booked: 'clock-outline', processing: 'flask', completed: 'check-circle-outline' };

export default function LabBookings() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    const load = async () => {
        if (!user?.id) return;
        try { const bks = await api.getLabBookings(user.id); setBookings(bks); }
        catch (e) { console.warn(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
    const FILTERS = [
        { key: 'all', label: 'الكل', count: bookings.length },
        { key: 'booked', label: 'محجوز', count: bookings.filter(b => b.status === 'booked').length },
        { key: 'processing', label: 'جاري', count: bookings.filter(b => b.status === 'processing').length },
        { key: 'completed', label: 'مكتمل', count: bookings.filter(b => b.status === 'completed').length },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#6A1B9A', C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerRow}>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="calendar-check" size={26} color={C.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>الحجوزات</Text>
                        <Text style={styles.headerSub}>{bookings.length} حجز إجمالي</Text>
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

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="calendar-blank" size={56} color="#E5E7EB" />
                            <Text style={styles.emptyText}>لا توجد حجوزات</Text>
                        </View>
                    ) : filtered.map((bk: any) => (
                        <View key={bk.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[bk.status] || C.primary) + '18' }]}>
                                    <MaterialCommunityIcons name={STATUS_ICONS[bk.status] as any || 'help'} size={13} color={STATUS_COLORS[bk.status] || C.primary} />
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[bk.status] || C.primary }]}>{STATUS_LABELS[bk.status] || bk.status}</Text>
                                </View>
                                <Text style={styles.patient}>{bk.patient?.name || 'مريض'}</Text>
                            </View>
                            <View style={styles.testRow}>
                                <MaterialCommunityIcons name="flask-outline" size={16} color={C.primary} />
                                <Text style={styles.testName}>{bk.test?.name || 'فحص'}</Text>
                            </View>
                            <View style={styles.metaRow}>
                                <View style={styles.metaPill}>
                                    <MaterialCommunityIcons name="clock-outline" size={13} color={C.textSec} />
                                    <Text style={styles.metaText}>{bk.time}</Text>
                                </View>
                                <View style={styles.metaPill}>
                                    <MaterialCommunityIcons name="calendar-outline" size={13} color={C.textSec} />
                                    <Text style={styles.metaText}>{bk.date}</Text>
                                </View>
                            </View>
                            <View style={styles.cardFooter}>
                                <View style={styles.pricePill}>
                                    <Text style={styles.priceText}>{(bk.test?.price || 0).toLocaleString()} ل.س</Text>
                                </View>
                                {bk.test?.preparation && (
                                    <Text style={styles.prepText} numberOfLines={1}>📋 {bk.test.preparation}</Text>
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
    patient: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.text },
    statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    testRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 10 },
    testName: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: C.primary },
    metaRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 10 },
    metaPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    metaText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec },
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    pricePill: { backgroundColor: C.primary + '12', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    priceText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.primary },
    prepText: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#D97706', flex: 1, textAlign: 'right' },
});
