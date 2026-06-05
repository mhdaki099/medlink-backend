import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Platform, Alert, TextInput, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../../src/contexts/AuthContext';
import { api } from '../../../src/services/api';
import { TAB_BAR_CLEARANCE } from '../../../src/constants/layout';

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: 'قيد الانتظار', color: '#F59E0B', icon: 'clock-outline' },
    confirmed: { label: 'مؤكد', color: '#10B981', icon: 'check-circle-outline' },
    booked: { label: 'محجوز', color: '#F59E0B', icon: 'clock-outline' },
    completed: { label: 'مكتمل', color: '#10B981', icon: 'check-circle-outline' },
    cancelled: { label: 'ملغي', color: '#EF4444', icon: 'close-circle-outline' },
    rejected: { label: 'مرفوض', color: '#EF4444', icon: 'close-circle-outline' },
};

type TabKey = 'browse' | 'bookings';

export default function RadiologyScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ tab?: string }>();
    const { user } = useAuth();
    const [centers, setCenters] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<TabKey>('browse');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (params.tab === 'bookings' || params.tab === 'browse') {
            setTab(params.tab);
        }
    }, [params.tab]);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const [centersData, serviceBookings] = await Promise.all([
                api.getRadiologyCenters(),
                api.getServiceBookings({ patient_id: user.id }).catch(() => []),
            ]);

            setCenters(centersData || []);

            const radBookings = (serviceBookings || [])
                .filter((b: any) => b.provider_role === 'radiology')
                .map((b: any) => ({
                    ...b,
                    center: b.provider || { name: b.provider?.name },
                }));
            const seen = new Set<string>();
            setBookings(radBookings.filter((b: any) => {
                if (!b.id || seen.has(b.id)) return false;
                seen.add(b.id);
                return true;
            }));
        } catch (e: any) {
            console.error(e);
            Alert.alert('خطأ', e.message || 'تعذر تحميل مراكز الأشعة');
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

    const filteredCenters = centers.filter(c =>
        !search.trim() ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase())
    );

    const renderCenter = ({ item, index }: any) => (
        <Animated.View entering={FadeInDown.delay(index * 60)}>
            <TouchableOpacity
                style={styles.centerCard}
                activeOpacity={0.85}
                onPress={() => router.push(`/(patient)/radiology/${item.id}` as any)}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.cardTitle}>{item.name}</Text>
                        <View style={styles.metaRow}>
                            <Ionicons name="location-outline" size={14} color="#64748B" />
                            <Text style={styles.metaText}>{item.city || item.address || 'غير محدد'}</Text>
                        </View>
                        {item.has_home_service && (
                            <View style={styles.homeBadge}>
                                <MaterialCommunityIcons name="home-outline" size={12} color="#43A047" />
                                <Text style={styles.homeBadgeText}>خدمة منزلية</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name="radiology-box" size={26} color="#8E24AA" />
                    </View>
                </View>
                <View style={styles.bookRow}>
                    <Ionicons name="chevron-back" size={18} color="#8E24AA" />
                    <Text style={styles.bookRowText}>اختر الفحص واحجز</Text>
                    <MaterialCommunityIcons name="calendar-plus" size={18} color="#8E24AA" />
                </View>
            </TouchableOpacity>
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
                        <Text style={styles.cardTitle}>{item.service_name || 'أشعة'}</Text>
                        <Text style={styles.cardSub}>{item.center?.name || item.provider?.name || ''}</Text>
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

    const listData = tab === 'browse' ? filteredCenters : bookings;
    const renderItem = tab === 'browse' ? renderCenter : renderBooking;
    const emptyMessage =
        tab === 'browse'
            ? 'لا توجد مراكز أشعة مسجلة حالياً — سيتم إضافتها قريباً'
            : 'لا توجد حجوزات — احجز من تبويب المراكز';

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#8E24AA" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#8E24AA', '#6A1B9A']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>مراكز الأشعة</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <View style={styles.tabs}>
                {([
                    { key: 'browse' as TabKey, label: 'احجز' },
                    { key: 'bookings' as TabKey, label: 'حجوزاتي' },
                ]).map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tab, tab === t.key && styles.tabActive]}
                        onPress={() => setTab(t.key)}
                    >
                        <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                            {t.label}
                            {t.key === 'browse' ? ` (${filteredCenters.length})` : ` (${bookings.length})`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'browse' && (
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginLeft: 8 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ابحث عن مركز أشعة..."
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
                contentContainerStyle={{ padding: 16, paddingBottom: TAB_BAR_CLEARANCE }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadData(); }}
                        colors={['#8E24AA']}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="radiology-box-outline" size={60} color="#D1D5DB" />
                        <Text style={styles.emptyText}>{emptyMessage}</Text>
                        {tab !== 'browse' && (
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('browse')}>
                                <Text style={styles.emptyBtnText}>احجز موعداً الآن</Text>
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
    tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3E5F5', alignItems: 'center' },
    tabActive: { backgroundColor: '#8E24AA' },
    tabText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#6B7280' },
    tabTextActive: { color: '#FFF' },
    searchBox: {
        flexDirection: 'row-reverse', alignItems: 'center', marginHorizontal: 16, marginBottom: 8,
        backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E7EB',
    },
    searchInput: { flex: 1, height: 44, fontFamily: 'Cairo_400Regular', fontSize: 15, color: '#111827' },
    centerCard: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        borderWidth: 1, borderColor: '#F3E5F5',
    },
    bookRow: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
    },
    bookRowText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#8E24AA' },
    card: {
        backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    iconCircle: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3E5F5',
        justifyContent: 'center', alignItems: 'center',
    },
    cardTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right' },
    cardSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right' },
    metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    metaText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    homeBadge: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 6,
        backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end',
    },
    homeBadgeText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#43A047' },
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
        marginTop: 8, backgroundColor: '#8E24AA', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    },
    emptyBtnText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 14 },
});
