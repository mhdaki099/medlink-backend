import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function PharmacyWarehouse() {
    const { user } = useAuth();
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [selectedWh, setSelectedWh] = useState<string | null>(null);
    const [cart, setCart] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const load = async () => {
            try {
                const whs = await api.getWarehouses();
                setWarehouses(whs);
                if (whs.length > 0) {
                    setSelectedWh(whs[0].id);
                    const inv = await api.getWarehouseInventory(whs[0].id);
                    setInventory(inv);
                }
            } catch (e) { console.warn(e); } finally { setLoading(false); }
        };
        load();
    }, []);

    useEffect(() => {
        if (!selectedWh) return;
        const load = async () => {
            try { const inv = await api.getWarehouseInventory(selectedWh); setInventory(inv); }
            catch (e) { console.warn(e); }
        };
        load();
    }, [selectedWh]);

    const addToCart = (id: string) => setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }));
    const removeFromCart = (id: string) => setCart(c => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });

    const placeOrder = async () => {
        if (!user || Object.keys(cart).length === 0 || !selectedWh) { Alert.alert('السلة فارغة'); return; }
        const items = Object.entries(cart).map(([iid, qty]) => ({ item_id: iid, qty }));
        const total = Object.entries(cart).reduce((s, [iid, qty]) => {
            const item = inventory.find((x: any) => x.id === iid);
            return s + (item?.bulk_price || 0) * qty;
        }, 0);
        try {
            await api.createWarehouseOrder({ pharmacy_id: user.id, warehouse_id: selectedWh, items, total });
            setCart({});
            Alert.alert('✅ تم الطلب!', `تم إرسال الطلب للمستودع بنجاح`);
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}><Text style={styles.headerTitle}>الطلب من المستودع 🏭</Text></View>

            {/* Warehouse Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.whBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                {warehouses.map((wh: any) => (
                    <TouchableOpacity key={wh.id} style={[styles.whChip, selectedWh === wh.id && styles.whChipActive]} onPress={() => setSelectedWh(wh.id)}>
                        <Text style={[styles.whChipText, selectedWh === wh.id && { color: Colors.warehouse }]}>{wh.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {loading ? <ActivityIndicator color={Colors.warehouse} style={{ marginTop: 40 }} size="large" /> :
                    inventory.map((item: any) => (
                        <View key={item.id} style={styles.itemCard}>
                            <View style={styles.itemTop}>
                                <Text style={styles.itemStock}>مخزون: {item.stock}</Text>
                                <Text style={styles.itemName}>{item.name}</Text>
                            </View>
                            <Text style={styles.itemCat}>{item.category}</Text>
                            <Text style={styles.itemUnit}>الوحدة: {item.unit}</Text>
                            <Text style={styles.itemPrice}>💰 {(item.bulk_price || 0).toLocaleString()} ل.س / وحدة</Text>
                            <Text style={styles.itemMin}>الحد الأدنى للطلب: {item.min_order}</Text>
                            <View style={styles.cartRow}>
                                {cart[item.id] > 0 ? (
                                    <View style={styles.qtyRow}>
                                        <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
                                        <Text style={styles.qtyVal}>{cart[item.id]}</Text>
                                        <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item.id)}>
                                        <Text style={styles.addBtnText}>أضف للطلب 📦</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
                <View style={{ height: 100 }} />
            </ScrollView>

            {cartCount > 0 && (
                <TouchableOpacity style={styles.orderBar} onPress={placeOrder} activeOpacity={0.88}>
                    <Text style={styles.orderBarText}>📦 {cartCount} أصناف</Text>
                    <Text style={styles.orderBarBtn}>إرسال الطلب للمستودع ←</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.warehouse, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'right' },
    whBar: { maxHeight: 50 },
    whChip: { backgroundColor: Colors.white, borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: Colors.border },
    whChipActive: { borderColor: Colors.warehouse, backgroundColor: Colors.warehouse + '15' },
    whChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 8 },
    itemCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    itemName: { fontSize: 14, fontWeight: '800', color: Colors.text, flex: 1, textAlign: 'right' },
    itemStock: { fontSize: 11, color: Colors.textMuted },
    itemCat: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 2 },
    itemUnit: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 2 },
    itemPrice: { fontSize: 14, fontWeight: '800', color: Colors.warehouse, textAlign: 'right', marginBottom: 2 },
    itemMin: { fontSize: 11, color: Colors.textMuted, textAlign: 'right', marginBottom: 8 },
    cartRow: { alignSelf: 'flex-end' },
    addBtn: { backgroundColor: Colors.warehouse, borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 7 },
    addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { backgroundColor: Colors.warehouse + '20', borderRadius: BorderRadius.full, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    qtyBtnText: { fontSize: 18, fontWeight: '800', color: Colors.warehouse },
    qtyVal: { fontSize: 16, fontWeight: '800', color: Colors.text },
    orderBar: {
        position: 'absolute', bottom: 80, left: 16, right: 16,
        backgroundColor: Colors.warehouse, borderRadius: BorderRadius.lg, padding: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...Shadow.large,
    },
    orderBarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    orderBarBtn: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
