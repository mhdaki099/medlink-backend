import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const C = {
    warehouse: '#EA580C', bg: '#F8FAFC', white: '#FFF', text: '#111827',
    textSec: '#6B7280', textMuted: '#9CA3AF', border: '#E5E7EB',
};

export default function PharmacyWarehouse() {
    const { user } = useAuth();
    const router = useRouter();
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
            try { const inv = await api.getWarehouseInventory(selectedWh); setInventory(inv); setCart({}); }
            catch (e) { console.warn(e); }
        };
        load();
    }, [selectedWh]);

    const addToCart = (id: string, minOrder: number) => {
        setCart(c => ({ ...c, [id]: Math.max((c[id] || 0) + 1, minOrder || 1) }));
    };
    const removeFromCart = (id: string) => setCart(c => { const n = { ...c }; if (n[id] > 1) n[id]--; else delete n[id]; return n; });

    const placeOrder = async () => {
        if (!user || Object.keys(cart).length === 0 || !selectedWh) { Alert.alert('السلة فارغة'); return; }
        const items = Object.entries(cart).map(([iid, qty]) => {
            const item = inventory.find((x: any) => x.id === iid);
            return { item_id: iid, qty, name: item?.name, bulk_price: item?.bulk_price };
        });
        const total = items.reduce((s, row) => s + (row.bulk_price || 0) * row.qty, 0);
        try {
            await api.createWarehouseOrder({ pharmacy_id: user.id, warehouse_id: selectedWh, items, total });
            setCart({});
            Alert.alert('✅ تم الطلب!', 'تم إرسال الطلب للمستودع بنجاح');
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#BF360C', C.warehouse]} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>الطلب من المستودع</Text>
                        <Text style={styles.headerSub}>توريد أدوية بالجملة للصيدلية</Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="warehouse" size={26} color={C.warehouse} />
                    </View>
                </View>
            </LinearGradient>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.whBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 14, paddingVertical: 8 }}>
                {warehouses.map((wh: any) => (
                    <TouchableOpacity key={wh.id} style={[styles.whChip, selectedWh === wh.id && styles.whChipActive]} onPress={() => setSelectedWh(wh.id)}>
                        <Text style={[styles.whChipText, selectedWh === wh.id && { color: C.warehouse }]}>{wh.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: cartCount > 0 ? 100 : 24 }}>
                {loading ? <ActivityIndicator color={C.warehouse} style={{ marginTop: 40 }} size="large" /> :
                    warehouses.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="warehouse" size={48} color={C.textMuted} />
                            <Text style={styles.emptyText}>لا توجد مستودعات متاحة حالياً</Text>
                        </View>
                    ) : inventory.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="package-variant-closed" size={48} color={C.textMuted} />
                            <Text style={styles.emptyText}>لا توجد أصناف في هذا المستودع بعد</Text>
                        </View>
                    ) : inventory.map((item: any) => (
                        <View key={item.id} style={styles.itemCard}>
                            <View style={styles.itemTop}>
                                <Text style={styles.itemStock}>مخزون: {item.stock}</Text>
                                <Text style={styles.itemName}>{item.name}</Text>
                            </View>
                            <Text style={styles.itemCat}>{item.category}</Text>
                            <Text style={styles.itemUnit}>الوحدة: {item.unit}</Text>
                            <Text style={styles.itemPrice}>{(item.bulk_price || 0).toLocaleString()} ل.س / وحدة</Text>
                            <Text style={styles.itemMin}>الحد الأدنى للطلب: {item.min_order}</Text>
                            <View style={styles.cartRow}>
                                {cart[item.id] > 0 ? (
                                    <View style={styles.qtyRow}>
                                        <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}><Text style={styles.qtyBtnText}>−</Text></TouchableOpacity>
                                        <Text style={styles.qtyVal}>{cart[item.id]}</Text>
                                        <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.id, item.min_order)}><Text style={styles.qtyBtnText}>+</Text></TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item.id, item.min_order)}>
                                        <Text style={styles.addBtnText}>أضف للطلب</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
            </ScrollView>

            {cartCount > 0 && (
                <TouchableOpacity style={styles.orderBar} onPress={placeOrder} activeOpacity={0.88}>
                    <Text style={styles.orderBarText}>{cartCount} أصناف</Text>
                    <Text style={styles.orderBarBtn}>إرسال الطلب للمستودع ←</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16, paddingHorizontal: 16 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF', textAlign: 'right' },
    headerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: 2 },
    whBar: { maxHeight: 50 },
    whChip: { backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5, borderColor: C.border },
    whChipActive: { borderColor: C.warehouse, backgroundColor: C.warehouse + '15' },
    whChipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 8 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.textSec },
    itemCard: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    itemTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    itemName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right' },
    itemStock: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textMuted },
    itemCat: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 2 },
    itemUnit: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 2 },
    itemPrice: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: C.warehouse, textAlign: 'right', marginBottom: 2 },
    itemMin: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textMuted, textAlign: 'right', marginBottom: 8 },
    cartRow: { alignSelf: 'flex-end' },
    addBtn: { backgroundColor: C.warehouse, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    addBtnText: { color: '#FFF', fontSize: 12, fontFamily: 'Cairo_700Bold' },
    qtyRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    qtyBtn: { backgroundColor: C.warehouse + '20', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    qtyBtnText: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.warehouse },
    qtyVal: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.text },
    orderBar: {
        position: 'absolute', bottom: 24, left: 16, right: 16,
        backgroundColor: C.warehouse, borderRadius: 16, padding: 16,
        flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    },
    orderBarText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 14 },
    orderBarBtn: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 13 },
});
