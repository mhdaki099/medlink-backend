import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function WarehouseInventory() {
    const { user } = useAuth();
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!user?.id) return;
            try { const inv = await api.getWarehouseInventory(user.id); setInventory(inv); }
            catch (e) { console.warn(e); } finally { setLoading(false); }
        };
        load();
    }, [user]);

    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>المخزون 📦</Text></View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {loading ? <ActivityIndicator color={Colors.warehouse} style={{ marginTop: 40 }} size="large" /> :
                    inventory.map((item: any) => (
                        <View key={item.id} style={styles.itemCard}>
                            <View style={styles.itemTop}>
                                <View style={[styles.stockBadge, { backgroundColor: item.stock < item.min_order * 2 ? Colors.danger + '18' : Colors.confirmed + '18' }]}>
                                    <Text style={[styles.stockText, { color: item.stock < item.min_order * 2 ? Colors.danger : Colors.confirmed }]}>
                                        {item.stock} {item.unit}
                                    </Text>
                                </View>
                                <Text style={styles.itemName}>{item.name}</Text>
                            </View>
                            <Text style={styles.itemCat}>{item.category}</Text>
                            <View style={styles.itemMeta}>
                                <Text style={styles.metaItem}>الحد الأدنى: {item.min_order} {item.unit}</Text>
                                <Text style={styles.metaItem}>السعر: {(item.bulk_price || 0).toLocaleString()} ل.س</Text>
                            </View>
                            {item.stock < item.min_order * 2 && (
                                <View style={styles.lowStockAlert}>
                                    <Text style={styles.lowStockText}>⚠️ مخزون منخفض — يجب إعادة الطلب</Text>
                                </View>
                            )}
                        </View>
                    ))}
                <View style={{ height: 20 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.warehouse, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'right' },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    itemCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    itemName: { fontSize: 15, fontWeight: '800', color: Colors.text, flex: 1, textAlign: 'right' },
    stockBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    stockText: { fontSize: 12, fontWeight: '800' },
    itemCat: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 6 },
    itemMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    metaItem: { fontSize: 12, color: Colors.textSecondary },
    lowStockAlert: { backgroundColor: Colors.danger + '12', borderRadius: BorderRadius.sm, padding: 8, marginTop: 8 },
    lowStockText: { color: Colors.danger, fontSize: 12, fontWeight: '600', textAlign: 'right' },
});
