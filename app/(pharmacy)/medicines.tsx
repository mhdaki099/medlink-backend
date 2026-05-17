import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';

const { width } = Dimensions.get('window');
const C = {
    primary: '#E67E22', accent: '#F39C12', success: '#27AE60', danger: '#E74C3C',
    warning: '#F1C40F', bg: '#F5F6FA', white: '#FFF', text: '#1A1A2E',
    textSec: '#636E72', textMuted: '#B2BEC3', border: '#E8ECF0',
};
const STOCK_COLORS: Record<string, string> = { in_stock: C.success, out_of_stock: C.danger, coming_soon: C.warning };
const STOCK_LABELS: Record<string, string> = { in_stock: 'متوفر', out_of_stock: 'غير متوفر', coming_soon: 'قريباً' };
const STOCK_ICONS: Record<string, string> = { in_stock: 'check-circle', out_of_stock: 'close-circle', coming_soon: 'clock-outline' };

export default function PharmacyMedicines() {
    const { user } = useAuth();
    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ name: '', category: '', price: '', description: '', stock_status: 'in_stock' });

    const load = async () => {
        if (!user?.id) return;
        try { const meds = await api.getPharmacyMedicines(user.id); setMedicines(meds); }
        catch (e) { console.warn(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [user]);

    const updateStock = async (id: string, status: string) => {
        try { await api.updateMedicine(id, { stock_status: status }); load(); }
        catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const addMedicine = async () => {
        if (!form.name || !form.price) { Alert.alert('تنبيه', 'أدخل الاسم والسعر على الأقل'); return; }
        try {
            await api.addMedicine({ ...form, price: parseInt(form.price) || 0, pharmacy_id: user?.id });
            setShowAdd(false); setForm({ name: '', category: '', price: '', description: '', stock_status: 'in_stock' }); load();
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const uploadExcel = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'] });
            if (!result.canceled && result.assets[0]) {
                const formData = new FormData();
                formData.append('file', {
                    uri: result.assets[0].uri,
                    name: result.assets[0].name || 'medicines.xlsx',
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                } as any);
                const { BASE_URL } = require('../../src/services/api');
                const res = await fetch(`${BASE_URL}/pharmacies/medicines/upload-excel?pharmacy_id=${user?.id}`, {
                    method: 'POST',
                    body: formData,
                });
                if (!res.ok) throw new Error('فشل رفع الملف');
                Alert.alert('✅ تم', 'تم رفع ملف الأدوية بنجاح');
                load();
            }
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const filtered = medicines.filter((m: any) => !search || m.name?.includes(search));

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient colors={['#D35400', C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.excelBtn} onPress={uploadExcel}>
                        <MaterialCommunityIcons name="file-excel" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>إدارة الأدوية</Text>
                        <Text style={styles.headerSub}>{medicines.length} دواء في الصيدلية</Text>
                    </View>
                    <View style={styles.headerIconCircle}>
                        <MaterialCommunityIcons name="pill" size={26} color={C.primary} />
                    </View>
                </View>
                {/* Search */}
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color={C.textMuted} />
                    <TextInput style={styles.searchInput} placeholder="ابحث عن دواء..." placeholderTextColor={C.textMuted}
                        value={search} onChangeText={setSearch} textAlign="right" />
                </View>
            </LinearGradient>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
                <LinearGradient colors={[C.primary, C.accent]} style={styles.fabGrad}>
                    <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="pill" size={48} color={C.textMuted} />
                            <Text style={styles.emptyText}>{search ? 'لا توجد نتائج' : 'لا توجد أدوية بعد'}</Text>
                        </View>
                    ) : filtered.map((med: any) => (
                        <View key={med.id} style={styles.medCard}>
                            <View style={styles.medTop}>
                                <View style={[styles.stockBadge, { backgroundColor: (STOCK_COLORS[med.stock_status] || C.primary) + '15' }]}>
                                    <MaterialCommunityIcons name={STOCK_ICONS[med.stock_status] as any || 'help-circle'} size={14} color={STOCK_COLORS[med.stock_status] || C.primary} />
                                    <Text style={[styles.stockText, { color: STOCK_COLORS[med.stock_status] || C.primary }]}>{STOCK_LABELS[med.stock_status]}</Text>
                                </View>
                                <View style={styles.medNameRow}>
                                    <Text style={styles.medName}>{med.name}</Text>
                                    <View style={styles.medIconCircle}>
                                        <MaterialCommunityIcons name="pill" size={16} color={C.primary} />
                                    </View>
                                </View>
                            </View>
                            {med.category ? <Text style={styles.medCat}>{med.category}</Text> : null}
                            <View style={styles.medFooter}>
                                <View style={styles.medActions}>
                                    {['in_stock', 'out_of_stock', 'coming_soon'].map(status => (
                                        <TouchableOpacity key={status}
                                            style={[styles.statusBtn, med.stock_status === status && { backgroundColor: STOCK_COLORS[status], borderColor: STOCK_COLORS[status] }]}
                                            onPress={() => updateStock(med.id, status)}>
                                            <Text style={[styles.statusBtnText, med.stock_status === status && { color: '#fff' }]}>{STOCK_LABELS[status]}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.medPrice}>{(med.price || 0).toLocaleString()} ل.س</Text>
                            </View>
                        </View>
                    ))}
            </ScrollView>

            {/* Add Medicine Modal */}
            <Modal visible={showAdd} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>إضافة دواء جديد</Text>
                        {[
                            { field: 'name', label: 'اسم الدواء *', placeholder: 'باراسيتامول', icon: 'pill' },
                            { field: 'category', label: 'التصنيف (اختياري)', placeholder: 'مسكنات', icon: 'tag-outline' },
                            { field: 'price', label: 'السعر (ل.س) *', placeholder: '5000', icon: 'cash' },
                            { field: 'description', label: 'الوصف', placeholder: 'وصف الدواء...', icon: 'text' },
                        ].map(({ field, label, placeholder, icon }) => (
                            <View key={field}>
                                <Text style={styles.fieldLabel}>{label}</Text>
                                <View style={styles.inputWrap}>
                                    <MaterialCommunityIcons name={icon as any} size={18} color={C.textMuted} style={{ marginLeft: 8 }} />
                                    <TextInput style={styles.input} placeholder={placeholder} value={(form as any)[field]}
                                        onChangeText={v => setForm(f => ({ ...f, [field]: v }))} textAlign="right"
                                        keyboardType={field === 'price' ? 'numeric' : 'default'} placeholderTextColor={C.textMuted} />
                                </View>
                            </View>
                        ))}
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                                <Text style={styles.cancelBtnText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={addMedicine}>
                                <LinearGradient colors={[C.primary, C.accent]} style={styles.saveBtnGrad}>
                                    <Text style={styles.saveBtnText}>حفظ</Text>
                                </LinearGradient>
                            </TouchableOpacity>
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
    headerBlob: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -30 },
    headerTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
    headerIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    excelBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.text, marginRight: 8 },
    fab: { position: 'absolute', bottom: 90, left: 20, zIndex: 50 },
    fabGrad: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.textSec },
    medCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    medTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    medNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    medIconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primary + '12', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    medName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right' },
    stockBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    stockText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    medCat: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 4 },
    medFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
    medPrice: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.primary },
    medActions: { flexDirection: 'row', gap: 4 },
    statusBtn: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
    statusBtnText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: C.textSec },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'center', marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'right', marginBottom: 5, marginTop: 10 },
    inputWrap: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14 },
    input: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.text },
    modalBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.border },
    cancelBtnText: { color: C.textSec, fontFamily: 'Cairo_700Bold' },
    saveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 15 },
});
