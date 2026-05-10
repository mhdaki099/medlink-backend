import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LabBookings() {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try { const bks = await api.getLabBookings(user.id); setBookings(bks); }
        catch (e) { console.warn(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>الحجوزات 📅</Text></View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
                {loading ? <ActivityIndicator color={Colors.lab} style={{ marginTop: 40 }} size="large" /> :
                    bookings.length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>📅</Text><Text style={styles.emptyText}>لا توجد حجوزات</Text></View>
                    ) : bookings.map((bk: any) => (
                        <View key={bk.id} style={styles.card}>
                            <Text style={styles.patient}>{bk.patient?.name}</Text>
                            <Text style={styles.test}>🧪 {bk.test?.name}</Text>
                            <Text style={styles.date}>📅 {bk.date} — ⏰ {bk.time}</Text>
                            <Text style={styles.price}>💰 {(bk.test?.price || 0).toLocaleString()} ل.س</Text>
                            <View style={[styles.statusBadge, { backgroundColor: bk.status === 'completed' ? Colors.confirmed + '18' : Colors.primary + '18' }]}>
                                <Text style={[styles.statusText, { color: bk.status === 'completed' ? Colors.confirmed : Colors.primary }]}>
                                    {bk.status === 'completed' ? 'مكتمل ✓' : bk.status === 'booked' ? 'محجوز' : 'جاري الفحص'}
                                </Text>
                            </View>
                        </View>
                    ))}
                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.lab, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'right' },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 40, marginBottom: 10 },
    emptyText: { fontSize: 15, color: Colors.textSecondary },
    card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    patient: { fontSize: 16, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 4 },
    test: { fontSize: 13, color: Colors.lab, fontWeight: '600', textAlign: 'right', marginBottom: 4 },
    date: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 4 },
    price: { fontSize: 14, fontWeight: '800', color: Colors.lab, textAlign: 'right', marginBottom: 8 },
    statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-end' },
    statusText: { fontSize: 11, fontWeight: '700' },
});
