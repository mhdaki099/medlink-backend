import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LabResults() {
    const { user } = useAuth();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = async () => {
            try { const res = await api.getLabResults(); setResults(res); }
            catch (e) { console.warn(e); } finally { setLoading(false); }
        };
        load();
    }, []);

    const STATUS_COLORS: Record<string, string> = { normal: Colors.confirmed, high: Colors.danger, low: Colors.warning };

    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>النتائج المرفوعة 📋</Text></View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {loading ? <ActivityIndicator color={Colors.lab} style={{ marginTop: 40 }} size="large" /> :
                    results.length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>📋</Text><Text style={styles.emptyText}>لا توجد نتائج</Text></View>
                    ) : results.map((res: any) => (
                        <View key={res.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                <Text style={styles.date}>{res.date}</Text>
                                <Text style={styles.testName}>{res.test?.name || 'تحليل'}</Text>
                            </View>
                            <Text style={styles.patient}>المريض: {res.patient_id}</Text>
                            {(res.values || []).map((v: any, i: number) => (
                                <View key={i} style={styles.valueRow}>
                                    <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[v.status] || Colors.primary) + '18' }]}>
                                        <Text style={[styles.badgeText, { color: STATUS_COLORS[v.status] || Colors.primary }]}>{v.status === 'normal' ? '✓' : v.status === 'high' ? '↑' : '↓'}</Text>
                                    </View>
                                    <Text style={styles.valueData}>{v.value} {v.unit}</Text>
                                    <Text style={styles.valueName}>{v.parameter}</Text>
                                </View>
                            ))}
                            {res.notes && <Text style={styles.notes}>📝 {res.notes}</Text>}
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
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    testName: { fontSize: 15, fontWeight: '800', color: Colors.text },
    date: { fontSize: 11, color: Colors.textMuted },
    patient: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
    valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.border + '40' },
    valueName: { fontSize: 13, fontWeight: '700', color: Colors.text, flex: 1, textAlign: 'right' },
    valueData: { fontSize: 13, color: Colors.text, minWidth: 70, textAlign: 'center' },
    badge: { borderRadius: BorderRadius.sm, paddingHorizontal: 6, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
    badgeText: { fontSize: 12, fontWeight: '800' },
    notes: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 8, fontStyle: 'italic' },
});
