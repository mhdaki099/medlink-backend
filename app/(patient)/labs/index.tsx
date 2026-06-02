import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Dimensions, Platform, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../../src/contexts/AuthContext';
import { api } from '../../../src/services/api';

const { width } = Dimensions.get('window');

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: 'قيد الانتظار', color: '#F59E0B', icon: 'clock-outline' },
    confirmed: { label: 'مؤكد', color: '#10B981', icon: 'check-circle-outline' },
    booked: { label: 'محجوز', color: '#F59E0B', icon: 'clock-outline' },
    completed: { label: 'مكتمل', color: '#10B981', icon: 'check-circle-outline' },
    cancelled: { label: 'ملغي', color: '#EF4444', icon: 'close-circle-outline' },
    rejected: { label: 'مرفوض', color: '#EF4444', icon: 'close-circle-outline' },
};

type TabKey = 'browse' | 'bookings' | 'results';

export default function PatientLabsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [labs, setLabs] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<TabKey>('browse');
    const [search, setSearch] = useState('');

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const [labsData, history, serviceBookings, labResults] = await Promise.all([
                api.getLabs(),
                api.getPatientHistory(user.id),
                api.getServiceBookings({ patient_id: user.id }).catch(() => []),
                api.getLabResults(user.id),
            ]);

            setLabs(labsData || []);

            const legacyBookings = history?.lab_bookings || [];
            const serviceLabBookings = (serviceBookings || [])
                .filter((b: any) => b.provider_role === 'lab')
                .map((b: any) => ({
                    ...b,
                    test: { name: b.service_name || 'تحليل' },
                    lab: b.provider || { name: b.provider?.name },
                }));
            const merged = [...serviceLabBookings, ...legacyBookings];
            const seen = new Set<string>();
            setBookings(merged.filter((b: any) => {
                if (!b.id || seen.has(b.id)) return false;
                seen.add(b.id);
                return true;
            }));

            setResults(labResults || []);
        } catch (e: any) {
            console.error(e);
            Alert.alert('خطأ', e.message || 'تعذر تحميل بيانات المختبرات');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [user?.id])
    );

    const filteredLabs = labs.filter(l =>
        !search.trim() ||
        l.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.city?.toLowerCase().includes(search.toLowerCase())
    );

    const renderLab = ({ item, index }: any) => (
        <Animated.View entering={FadeInDown.delay(index * 60)}>
            <TouchableOpacity
                style={styles.labCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/(patient)/labs/${item.id}` as any)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={14} color="#64748B" />
                            <Text style={styles.metaText}>{item.city || item.address || 'غير محدد'}</Text>
                        </View>
                    </View>
                    <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="flask" size={26} color="#1E88E5" />
                    </View>
                </View>
                <View style={styles.bookRow}>
                    <Ionicons name="chevron-back" size={18} color="#1E88E5" />
                    <Text style={styles.bookRowText}>اختر التحاليل واحجز</Text>
                    <MaterialCommunityIcons name="calendar-plus" size={18} color="#1E88E5" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderResult = ({ item, index }: any) => (
        <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                    <Text style={[styles.statusText, { color: '#10B981' }]}>مكتمل</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.cardTitle}>{item.test?.name || 'تحليل'}</Text>
                    <Text style={styles.cardSub}>{item.lab?.name || ''}</Text>
                </View>
                <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name="flask" size={22} color="#1E88E5" />
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.dateText}>{item.date || item.created_at?.split('T')[0]}</Text>
            </View>
        </Animated.View>
    );

    const renderBooking = ({ item, index }: any) => {
        const s = STATUS_MAP[item.status] || STATUS_MAP.pending;
        return (
            <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: s.color + '20' }]}>
                        <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.cardTitle}>{item.test?.name || item.service_name || 'تحليل'}</Text>
                        <Text style={styles.cardSub}>{item.lab?.name || item.provider?.name || ''}</Text>
                    </View>
                    <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name={s.icon as any} size={22} color={s.color} />
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>
                        {item.date}{item.time ? ` — ${item.time}` : ''}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    const listData = tab === 'browse' ? filteredLabs : tab === 'results' ? results : bookings;
    const renderItem = tab === 'browse' ? renderLab : tab === 'results' ? renderResult : renderBooking;
    const emptyMessage =
        tab === 'browse' ? 'لا توجد مختبرات متاحة حالياً' :
        tab === 'results' ? 'لا توجد نتائج بعد' :
        'لا توجد حجوزات — احجز من تبويب المختبرات';

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1E88E5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>المختبرات</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <View style={styles.tabs}>
                {([
                    { key: 'browse' as TabKey, label: `المختبرات (${filteredLabs.length})` },
                    { key: 'bookings' as TabKey, label: `حجوزاتي (${bookings.length})` },
                    { key: 'results' as TabKey, label: `النتائج (${results.length})` },
                ]).map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tab, tab === t.key && styles.tabActive]}
                        onPress={() => setTab(t.key)}
                    >
                        <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]} numberOfLines={1}>
                            {t.key === 'browse' ? 'احجز' : t.key === 'bookings' ? 'حجوزاتي' : 'النتائج'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'browse' && (
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginLeft: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ابحث عن مختبر..."
                        placeholderTextColor="#9CA3AF"
                        value={search}
                        onChangeText={setSearch}
                        textAlign="right"
                    />
                </View>
            )}

            <FlatList
                data={listData}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadData(); }}
                        colors={['#1E88E5']}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="flask-empty-outline" size={60} color="#D1D5DB" />
                        <Text style={styles.emptyText}>{emptyMessage}</Text>
                        {tab !== 'browse' && (
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('browse')}>
                                <Text style={styles.emptyBtnText}>احجز تحليلاً الآن</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingBottom: 16, paddingHorizontal: 20,
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    tabs: { flexDirection: 'row-reverse', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
    tabActive: { backgroundColor: '#1E88E5' },
    tabText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#6B7280' },
    tabTextActive: { color: '#FFF' },
    searchBox: {
        flexDirection: 'row-reverse', alignItems: 'center', marginHorizontal: 16, marginBottom: 8,
        backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E7EB',
    },
    searchInput: { flex: 1, height: 44, fontFamily: 'Cairo_400Regular', fontSize: 15, color: '#111827' },
    labCard: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        borderWidth: 1, borderColor: '#E8F4FD',
    },
    bookRow: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    bookRowText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    card: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    iconCircle: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBF5FF',
        justifyContent: 'center', alignItems: 'center',
    },
    cardTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right' },
    cardSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right' },
    metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    metaText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
    cardFooter: {
        flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    dateText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    empty: { alignItems: 'center', marginTop: 60, gap: 12, paddingHorizontal: 24 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#9CA3AF', textAlign: 'center' },
    emptyBtn: {
        marginTop: 8, backgroundColor: '#1E88E5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    },
    emptyBtnText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 14 },
});
