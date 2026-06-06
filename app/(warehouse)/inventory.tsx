import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
    TextInput, Platform, Alert, Modal, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { useSubscreenBottomPadding } from '../../src/constants/layout';

const C = {
    primary: '#1E88E5', accent: '#43A047', success: '#10B981', danger: '#EF4444',
    warning: '#F59E0B', orange: '#EA580C', bg: '#F1F5F9', white: '#FFF',
    text: '#0F172A', textSec: '#64748B', border: '#E2E8F0',
};

type StockStatus = 'ok' | 'low' | 'out';

function getStockStatus(item: any): StockStatus {
    const stock = item.stock || 0;
    const min = item.min_order || 1;
    if (stock <= 0) return 'out';
    if (stock < min * 2) return 'low';
    return 'ok';
}

const STATUS_CFG: Record<StockStatus, { label: string; color: string; icon: string }> = {
    ok: { label: 'متوفر', color: C.success, icon: 'check-circle' },
    low: { label: 'منخفض', color: C.warning, icon: 'alert-circle' },
    out: { label: 'نفد', color: C.danger, icon: 'close-circle' },
};

export default function WarehouseInventory() {
    const { user } = useAuth();
    const router = useRouter();
    const bottomPad = useSubscreenBottomPadding();
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('الكل');
    const [showAdd, setShowAdd] = useState(false);
    const [detailItem, setDetailItem] = useState<any | null>(null);
    const [form, setForm] = useState({ name: '', category: '', strength: '', barcode: '', bulk_price: '', stock: '', unit: 'علبة', min_order: '1' });

    const load = async () => {
        if (!user?.id) return;
        try {
            const inv = await api.getWarehouseInventory(user.id);
            setInventory(inv);
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const categories = useMemo(() => {
        const cats = new Set(inventory.map(i => i.category).filter(Boolean));
        return ['الكل', ...Array.from(cats)];
    }, [inventory]);

    const stats = useMemo(() => {
        const totalUnits = inventory.reduce((s, i) => s + (i.stock || 0), 0);
        const totalValue = inventory.reduce((s, i) => s + (i.stock || 0) * (i.bulk_price || 0), 0);
        const low = inventory.filter(i => getStockStatus(i) === 'low').length;
        const out = inventory.filter(i => getStockStatus(i) === 'out').length;
        return { totalUnits, totalValue, low, out, count: inventory.length };
    }, [inventory]);

    const filtered = useMemo(() => inventory.filter(i => {
        const matchSearch = !search || i.name?.includes(search) || i.category?.includes(search) || i.barcode?.includes(search);
        const matchCat = categoryFilter === 'الكل' || i.category === categoryFilter;
        return matchSearch && matchCat;
    }), [inventory, search, categoryFilter]);

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

    const renderCard = (item: any) => {
        const status = getStockStatus(item);
        const cfg = STATUS_CFG[status];
        const maxBar = Math.max((item.min_order || 1) * 5, item.stock || 1);
        const barPct = Math.min(100, ((item.stock || 0) / maxBar) * 100);

        return (
            <TouchableOpacity key={item.id} style={[styles.itemCard, status !== 'ok' && { borderColor: cfg.color + '40' }]} activeOpacity={0.9} onPress={() => setDetailItem(item)}>
                <View style={styles.itemHeader}>
                    <View style={[styles.statusPill, { backgroundColor: cfg.color + '18' }]}>
                        <MaterialCommunityIcons name={cfg.icon as any} size={14} color={cfg.color} />
                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.category ? <Text style={styles.itemCat}>{item.category}</Text> : null}
                    </View>
                </View>

                <View style={styles.stockBarWrap}>
                    <View style={styles.stockBarBg}>
                        <View style={[styles.stockBarFill, { width: `${barPct}%`, backgroundColor: cfg.color }]} />
                    </View>
                    <Text style={styles.stockBarLabel}>{item.stock} {item.unit}</Text>
                </View>

                <View style={styles.metaGrid}>
                    <View style={styles.metaCell}>
                        <MaterialCommunityIcons name="cash" size={15} color={C.primary} />
                        <Text style={styles.metaVal}>{(item.bulk_price || 0).toLocaleString()}</Text>
                        <Text style={styles.metaLbl}>ل.س/وحدة</Text>
                    </View>
                    <View style={styles.metaCell}>
                        <MaterialCommunityIcons name="package-variant" size={15} color={C.orange} />
                        <Text style={styles.metaVal}>{item.min_order}</Text>
                        <Text style={styles.metaLbl}>حد أدنى</Text>
                    </View>
                    <View style={styles.metaCell}>
                        <MaterialCommunityIcons name="calculator" size={15} color={C.accent} />
                        <Text style={styles.metaVal}>{((item.stock || 0) * (item.bulk_price || 0)).toLocaleString()}</Text>
                        <Text style={styles.metaLbl}>قيمة المخزون</Text>
                    </View>
                </View>

                {(item.strength || item.barcode) && (
                    <View style={styles.extraRow}>
                        {item.strength ? <Text style={styles.extraChip}>💊 {item.strength}</Text> : null}
                        {item.barcode ? <Text style={styles.extraChip}>🏷 {item.barcode}</Text> : null}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F172A', '#1E3A5F', C.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob1} />
                <View style={styles.headerBlob2} />
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.headerAction} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerAction} onPress={uploadExcel}>
                        <MaterialCommunityIcons name="file-excel" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerAction, styles.addAction]} onPress={() => setShowAdd(true)}>
                        <MaterialCommunityIcons name="plus" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>مخزون المستودع</Text>
                        <Text style={styles.headerSub}>{stats.count} صنف • {stats.totalUnits.toLocaleString()} وحدة</Text>
                    </View>
                </View>
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.7)" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ابحث بالاسم، التصنيف، الباركود..."
                        placeholderTextColor="rgba(255,255,255,0.55)"
                        value={search} onChangeText={setSearch} textAlign="right"
                    />
                </View>
            </LinearGradient>

            <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={styles.statsScroll}
                contentContainerStyle={styles.statsRow}
            >
                {[
                    { label: 'إجمالي الوحدات', val: stats.totalUnits.toLocaleString(), icon: 'cube-outline', color: C.primary },
                    { label: 'قيمة المخزون', val: `${(stats.totalValue / 1000000).toFixed(1)}م`, icon: 'cash-multiple', color: C.accent },
                    { label: 'مخزون منخفض', val: stats.low, icon: 'alert-outline', color: C.warning },
                    { label: 'نفد المخزون', val: stats.out, icon: 'close-circle-outline', color: C.danger },
                ].map(s => (
                    <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
                        <MaterialCommunityIcons name={s.icon as any} size={20} color={s.color} />
                        <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                        <Text style={styles.statLbl}>{s.label}</Text>
                    </View>
                ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.catChip, categoryFilter === cat && styles.catChipActive]}
                        onPress={() => setCategoryFilter(cat)}
                    >
                        <Text style={[styles.catText, categoryFilter === cat && styles.catTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: bottomPad }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="package-variant-closed" size={56} color="#CBD5E1" />
                            <Text style={styles.emptyText}>لا توجد أصناف مطابقة</Text>
                        </View>
                    ) : filtered.map(renderCard)}
            </ScrollView>

            {/* Detail modal */}
            <Modal visible={!!detailItem} transparent animationType="slide" onRequestClose={() => setDetailItem(null)}>
                <View style={styles.overlay}>
                    <View style={styles.detailSheet}>
                        <View style={styles.handle} />
                        <Text style={styles.detailTitle}>{detailItem?.name}</Text>
                        {detailItem && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {[
                                    ['التصنيف', detailItem.category || '—'],
                                    ['العيار', detailItem.strength || '—'],
                                    ['الباركود', detailItem.barcode || '—'],
                                    ['الوحدة', detailItem.unit || '—'],
                                    ['المخزون الحالي', `${detailItem.stock} ${detailItem.unit}`],
                                    ['الحد الأدنى للطلب', `${detailItem.min_order} ${detailItem.unit}`],
                                    ['سعر الجملة', `${(detailItem.bulk_price || 0).toLocaleString()} ل.س`],
                                    ['قيمة المخزون', `${((detailItem.stock || 0) * (detailItem.bulk_price || 0)).toLocaleString()} ل.س`],
                                ].map(([k, v]) => (
                                    <View key={k} style={styles.detailRow}>
                                        <Text style={styles.detailVal}>{v}</Text>
                                        <Text style={styles.detailKey}>{k}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailItem(null)}>
                            <Text style={styles.closeBtnText}>إغلاق</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showAdd} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.addSheet}>
                        <Text style={styles.addTitle}>إضافة صنف جديد</Text>
                        {[
                            ['name', 'اسم الدواء *'],
                            ['category', 'التصنيف'],
                            ['strength', 'العيار'],
                            ['barcode', 'الباركود'],
                            ['bulk_price', 'سعر الجملة'],
                            ['stock', 'الكمية'],
                            ['unit', 'الوحدة'],
                            ['min_order', 'الحد الأدنى'],
                        ].map(([field, label]) => (
                            <TextInput
                                key={field}
                                style={styles.addInput}
                                placeholder={label}
                                value={(form as any)[field]}
                                onChangeText={v => setForm(f => ({ ...f, [field]: v }))}
                                textAlign="right"
                                keyboardType={['bulk_price', 'stock', 'min_order'].includes(field) ? 'numeric' : 'default'}
                            />
                        ))}
                        <View style={styles.addBtns}>
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
    headerBlob1: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)', top: -30, right: -20 },
    headerBlob2: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 10, left: 20 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 14 },
    headerAction: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    addAction: { backgroundColor: C.orange },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF', textAlign: 'right' },
    headerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.75)', textAlign: 'right' },
    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 14, height: 46, gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#FFF' },
    statsScroll: { maxHeight: 110, marginTop: -8 },
    statsRow: { paddingHorizontal: 16, gap: 10, paddingVertical: 12 },
    statCard: { width: 130, backgroundColor: C.white, borderRadius: 16, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, gap: 4 },
    statVal: { fontSize: 18, fontFamily: 'Cairo_700Bold' },
    statLbl: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: C.textSec },
    catRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
    catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
    catChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    catText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    catTextActive: { color: '#FFF' },
    list: { flex: 1, paddingHorizontal: 16 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.textSec },
    itemCard: { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    itemHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
    itemName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'right' },
    itemCat: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginTop: 2 },
    statusPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
    statusText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    stockBarWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
    stockBarBg: { flex: 1, height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
    stockBarFill: { height: '100%', borderRadius: 4 },
    stockBarLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.text, minWidth: 70, textAlign: 'left' },
    metaGrid: { flexDirection: 'row-reverse', gap: 8 },
    metaCell: { flex: 1, backgroundColor: C.bg, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
    metaVal: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: C.text },
    metaLbl: { fontSize: 9, fontFamily: 'Cairo_400Regular', color: C.textSec },
    extraRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    extraChip: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 14 },
    detailSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '75%' },
    detailTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'center', marginBottom: 16 },
    detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    detailKey: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    detailVal: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.text },
    closeBtn: { marginTop: 16, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    closeBtnText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 15 },
    addSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 8 },
    addTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'center', marginBottom: 8 },
    addInput: { backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, height: 46, fontFamily: 'Cairo_400Regular' },
    addBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 8 },
    cancelBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', padding: 13 },
    saveBtn: { flex: 1, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', padding: 13 },
    cancelText: { fontFamily: 'Cairo_700Bold', color: C.textSec },
    saveText: { fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
