import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LabTests() {
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const load = async () => {
            if (!user?.id) return;
            try { const t = await api.getLabTests(user.id); setTests(t); }
            catch (e) { console.warn(e); } finally { setLoading(false); }
        };
        load();
    }, [user]);

    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>قائمة الفحوصات 🧪</Text></View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {loading ? <ActivityIndicator color={Colors.lab} style={{ marginTop: 40 }} size="large" /> :
                    tests.map((t: any) => (
                        <View key={t.id} style={styles.testCard}>
                            <Text style={styles.testName}>{t.name}</Text>
                            <Text style={styles.testCat}>{t.category}</Text>
                            <Text style={styles.testDesc}>{t.description}</Text>
                            <View style={styles.testMeta}>
                                <Text style={styles.metaItem}>⏱️ النتيجة خلال {t.duration_hours} ساعة</Text>
                                <Text style={styles.metaItem}>💰 {(t.price || 0).toLocaleString()} ل.س</Text>
                            </View>
                            {t.preparation && <Text style={styles.prep}>📋 {t.preparation}</Text>}
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
    testCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    testName: { fontSize: 15, fontWeight: '800', color: Colors.text, textAlign: 'right', marginBottom: 4 },
    testCat: { fontSize: 12, color: Colors.lab, fontWeight: '600', textAlign: 'right', marginBottom: 4 },
    testDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', lineHeight: 18, marginBottom: 8 },
    testMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    metaItem: { fontSize: 12, color: Colors.textSecondary },
    prep: { fontSize: 12, color: Colors.warning, textAlign: 'right', marginTop: 6, fontWeight: '500' },
});
