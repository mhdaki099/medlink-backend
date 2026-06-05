import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Platform, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';

import { TAB_BAR_CLEARANCE, TAB_BAR_FAB_BOTTOM } from '../../src/constants/layout';
const C = {
    primary: '#1E88E5', accent: '#43A047', success: '#10B981', danger: '#EF4444', warning: '#F59E0B',
    bg: '#F8FAFC', white: '#FFF', text: '#111827', textSec: '#6B7280', border: '#F1F5F9',
};

export default function WarehouseInventory() {
    const { user } = useAuth();
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', category: '', strength: '', barcode: '', bulk_price: '', stock: '', unit: 'علبة', min_order: '1' });

    const load = async () => {
        if (!user?.id) return;
        try { const inv = await api.getWarehouseInventory(user.id); setInventory(inv); }
        catch (e) { console.warn(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [user]);

    const addStock = async () => {
        if (!user?.id || !form.name) return Alert.alert('تنبيه', 'اسم الصنف مطلوب');
        try {
            await api.addWarehouseInventory(user.id, {
                ...form,
                bulk_price: parseFloat(form.bulk_price) || 0,
                stock: parseInt(form.stock) || 0,
                min_order: parseInt(form.min_order) || 1,
            });
            setShowAdd(false);
            setForm({ name: '', category: '', strength: '', barcode: '', bulk_price: '', stock: '', unit: 'علبة', min_order: '1' });
            load();
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const uploadExcel = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'] });
            if (!result.canceled && user?.id) {
                await api.uploadWarehouseExcel(user.id, result.assets[0]);
                Alert.alert('تم', 'تم استيراد ملف المخزون');
                load();
            }
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const filtered = inventory.filter(i => !search || i.name?.includes(search) || i.category?.includes(search));
    const lowStockCount = inventory.filter(i => i.stock < i.min_order * 2).length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#BF360C', C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.headerAction} onPress={uploadExcel}>
                        <MaterialCommunityIcons name="file-excel" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerAction} onPress={() => setShowAdd(true)}>
                        <MaterialCommunityIcons name="plus" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="package-variant" size={26} color={C.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>المخزون</Text>
                        <Text style={styles.headerSub}>{inventory.length} صنف • {lowStockCount > 0 ? `⚠️ ${lowStockCount} منخفض` : '✅ كل شيء بخير'}</Text>
                    </View>
                </View>
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.7)" />
                    <TextInput style={styles.searchInput} placeholder="ابحث في المخزون..." placeholderTextColor="rgba(255,255,255,0.6)"
                        value={search} onChangeText={setSearch} textAlign="right" />
                </View>
            </LinearGradient>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="package-variant-closed" size={56} color="#E5E7EB" />
                            <Text style={styles.emptyText}>لا توجد أصناف</Text>
                        </View>
                    ) : filtered.map((item: any) => {
                        const isLow = item.stock < item.min_order * 2;
                        return (
                            <View key={item.id} style={[styles.itemCard, isLow && styles.itemCardLow]}>
                                <View style={styles.itemTop}>
                                    <View style={[styles.stockBadge, { backgroundColor: isLow ? C.danger + '18' : C.success + '18' }]}>
                                        <MaterialCommunityIcons name={isLow ? 'alert-circle-outline' : 'check-circle-outline'} size={13} color={isLow ? C.danger : C.success} />
                                        <Text style={[styles.stockText, { color: isLow ? C.danger : C.success }]}>{item.stock} {item.unit}</Text>
                                    </View>
                                    <Text style={styles.itemName}>{item.name}</Text>
                                </View>
                                {item.category && <Text style={styles.itemCat}>{item.category}</Text>}
                                <View style={styles.itemMeta}>
                                    <View style={styles.metaPill}>
                                        <MaterialCommunityIcons name="cash" size={13} color={C.primary} />
                                        <Text style={styles.metaText}>{(item.bulk_price || 0).toLocaleString()} ل.س</Text>
                                    </View>
                                    <View style={styles.metaPill}>
                                        <MaterialCommunityIcons name="package-variant-closed" size={13} color={C.textSec} />
                                        <Text style={styles.metaText}>الحد الأدنى: {item.min_order} {item.unit}</Text>
                                    </View>
                                </View>
                                {isLow && (
                                    <View style={styles.lowAlert}>
                                        <MaterialCommunityIcons name="alert" size={14} color={C.danger} />
                                        <Text style={styles.lowAlertText}>مخزون منخفض — يجب إعادة الطلب</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
            </ScrollView>
            <Modal visible={showAdd} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>إضافة مخزون</Text>
                        {[
                            ['name', 'اسم الدواء *'],
                            ['category', 'التصنيف'],
                            ['strength', 'العيار'],
                            ['barcode', 'الباركود'],
                            ['bulk_price', 'السعر'],
                            ['stock', 'الكمية'],
                            ['unit', 'الوحدة'],
                            ['min_order', 'الحد الأدنى'],
                        ].map(([field, label]) => (
                            <TextInput
                                key={field}
                                style={styles.modalInput}
                                placeholder={label}
                                value={(form as any)[field]}
                                onChangeText={v => setForm(f => ({ ...f, [field]: v }))}
                                textAlign="right"
                                keyboardType={['bulk_price', 'stock', 'min_order'].includes(field) ? 'numeric' : 'default'}
                            />
                        ))}
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}><Text style={styles.cancelText}>إلغاء</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={addStock}><Text style={styles.saveText}>حفظ</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20, paddingHorizontal: 20, overflow: 'hidden' },
    headerBlob: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -30 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
    headerAction: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)' },
    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 14, height: 44, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#FFF' },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.textSec },
    itemCard: { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    itemCardLow: { borderWidth: 1, borderColor: C.danger + '30' },
    itemTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    itemName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right' },
    stockBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    stockText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
    itemCat: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 8 },
    itemMeta: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
    metaPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    metaText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    lowAlert: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.danger + '10', borderRadius: 10, padding: 8, marginTop: 10 },
    lowAlertText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.danger },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'center', marginBottom: 8 },
    modalInput: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, height: 46, fontFamily: 'Cairo_400Regular' },
    modalBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
    cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', padding: 13 },
    saveBtn: { flex: 1, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', padding: 13 },
    cancelText: { fontFamily: 'Cairo_700Bold', color: C.textSec },
    saveText: { fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
