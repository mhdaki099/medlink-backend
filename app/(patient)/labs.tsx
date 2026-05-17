import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

const { width } = Dimensions.get('window');

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
    booked: { label: 'محجوز', color: '#F59E0B', icon: 'clock-outline' },
    completed: { label: 'مكتمل', color: '#10B981', icon: 'check-circle-outline' },
    cancelled: { label: 'ملغي', color: '#EF4444', icon: 'close-circle-outline' },
};

export default function PatientLabsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [results, setResults] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'results' | 'bookings'>('results');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const [r, b] = await Promise.all([
                api.getLabResults(user.id),
                api.getLabBookingsByPatient(user.id),
            ]);
            setResults(r || []);
            setBookings(b || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

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
                <TouchableOpacity style={styles.viewBtn}>
                    <Text style={styles.viewBtnText}>عرض النتيجة</Text>
                    <Ionicons name="chevron-back" size={16} color="#1E88E5" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderBooking = ({ item, index }: any) => {
        const s = STATUS_MAP[item.status] || STATUS_MAP.booked;
        return (
            <Animated.View entering={FadeInDown.delay(index * 80)} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: s.color + '20' }]}>
                        <Text style={[styles.statusText, { color: s.color }]}>{s.label}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.cardTitle}>{item.test?.name || 'تحليل'}</Text>
                        <Text style={styles.cardSub}>{item.lab?.name || ''}</Text>
                    </View>
                    <View style={styles.iconCircle}>
                        <MaterialCommunityIcons name={s.icon as any} size={22} color={s.color} />
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>{item.date} - {item.time}</Text>
                </View>
            </Animated.View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1E88E5" /></View>;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>نتائج المختبر</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <View style={styles.tabs}>
                <TouchableOpacity style={[styles.tab, tab === 'results' && styles.tabActive]} onPress={() => setTab('results')}>
                    <Text style={[styles.tabText, tab === 'results' && styles.tabTextActive]}>النتائج ({results.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'bookings' && styles.tabActive]} onPress={() => setTab('bookings')}>
                    <Text style={[styles.tabText, tab === 'bookings' && styles.tabTextActive]}>الحجوزات ({bookings.length})</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={tab === 'results' ? results : bookings}
                renderItem={tab === 'results' ? renderResult : renderBooking}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="flask-empty-outline" size={60} color="#D1D5DB" />
                        <Text style={styles.emptyText}>{tab === 'results' ? 'لا توجد نتائج بعد' : 'لا توجد حجوزات'}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 45, paddingBottom: 16, paddingHorizontal: 20 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    tabs: { flexDirection: 'row-reverse', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
    tabActive: { backgroundColor: '#1E88E5' },
    tabText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#6B7280' },
    tabTextActive: { color: '#FFF' },
    card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827' },
    cardSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    dateText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    viewBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    viewBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    empty: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyText: { fontSize: 16, fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
});
