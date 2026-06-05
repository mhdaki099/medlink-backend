import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal, Platform, Dimensions, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';

import { useSubscreenBottomPadding, useSubscreenFabBottom } from '../../src/constants/layout';

const { width } = Dimensions.get('window');
const C = {
    primary: '#1E88E5', accent: '#43A047', success: '#27AE60', danger: '#E74C3C',
    warning: '#F1C40F', bg: '#F5F6FA', white: '#FFF', text: '#1A1A2E',
    textSec: '#636E72', textMuted: '#B2BEC3', border: '#E8ECF0',
};

type MedForm = {
    name: string;
    category: string;
    price: string;
    description: string;
    dosage: string;
    manufacturer: string;
    available: boolean;
    requires_prescription: boolean;
};

const EMPTY_FORM: MedForm = {
    name: '', category: '', price: '', description: '', dosage: '', manufacturer: '',
    available: true, requires_prescription: false,
};

export default function PharmacyMedicines() {
    const { user } = useAuth();
    const router = useRouter();
    const bottomPad = useSubscreenBottomPadding(80);
    const fabBottom = useSubscreenFabBottom();
    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState<MedForm>(EMPTY_FORM);

    const load = async () => {
        if (!user?.id) return;
        try { const meds = await api.getPharmacyMedicines(user.id); setMedicines(meds); }
        catch (e) { console.warn(e); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [user]);

    const openAdd = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    const openEdit = (med: any) => {
        setEditingId(med.id);
        setForm({
            name: med.name || '',
            category: med.category || '',
            price: String(med.price || ''),
            description: med.description || '',
            dosage: med.dosage || '',
            manufacturer: med.manufacturer || '',
            available: med.stock_status !== 'out_of_stock',
            requires_prescription: !!med.requires_prescription,
        });
        setShowModal(true);
    };

    const saveMedicine = async () => {
        if (!form.name || !form.price) { Alert.alert('تنبيه', 'أدخل اسم الدواء والسعر'); return; }
        const payload = {
            name: form.name,
            category: form.category || null,
            price: parseInt(form.price) || 0,
            description: form.description || null,
            dosage: form.dosage || null,
            manufacturer: form.manufacturer || null,
            stock_status: form.available ? 'in_stock' : 'out_of_stock',
            requires_prescription: form.requires_prescription,
        };
        try {
            if (editingId) {
                await api.updateMedicine(editingId, payload);
            } else {
                await api.addMedicine({ ...payload, pharmacy_id: user?.id });
            }
            setShowModal(false);
            setForm(EMPTY_FORM);
            setEditingId(null);
            load();
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const deleteMedicine = (med: any) => {
        Alert.alert('حذف الدواء', `هل تريد حذف "${med.name}" من قائمة الأدوية؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'حذف', style: 'destructive', onPress: async () => {
                    try { await api.deleteMedicine(med.id); load(); }
                    catch (e: any) { Alert.alert('خطأ', e.message); }
                },
            },
        ]);
    };

    const uploadExcel = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'] });
            if (!result.canceled && result.assets[0]) {
                await api.uploadMedicineExcel(user!.id, result.assets[0]);
                Alert.alert('✅ تم', 'تم رفع ملف الأدوية بنجاح');
                load();
            }
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const filtered = medicines.filter((m: any) =>
        !search || m.name?.includes(search) || m.category?.includes(search)
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.headerBtn} onPress={uploadExcel}>
                        <MaterialCommunityIcons name="file-excel" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>قائمة الأدوية</Text>
                        <Text style={styles.headerSub}>{medicines.length} دواء مسجّل</Text>
                    </View>
                    <View style={styles.headerIconCircle}>
                        <MaterialCommunityIcons name="pill" size={26} color={C.primary} />
                    </View>
                </View>
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color={C.textMuted} />
                    <TextInput style={styles.searchInput} placeholder="ابحث بالاسم أو التصنيف..." placeholderTextColor={C.textMuted}
                        value={search} onChangeText={setSearch} textAlign="right" />
                </View>
            </LinearGradient>

            <TouchableOpacity style={[styles.fab, { bottom: fabBottom }]} onPress={openAdd}>
                <LinearGradient colors={[C.primary, C.accent]} style={styles.fabGrad}>
                    <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad }}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="pill" size={48} color={C.textMuted} />
                            <Text style={styles.emptyText}>{search ? 'لا توجد نتائج' : 'لا توجد أدوية بعد — أضف أول دواء'}</Text>
                        </View>
                    ) : filtered.map((med: any) => (
                        <View key={med.id} style={styles.medCard}>
                            <View style={styles.medTop}>
                                <View style={styles.medActions}>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(med)}>
                                        <MaterialCommunityIcons name="pencil-outline" size={18} color={C.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => deleteMedicine(med)}>
                                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={C.danger} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.medNameRow}>
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.medName}>{med.name}</Text>
                                        {med.dosage ? <Text style={styles.medDosage}>{med.dosage}</Text> : null}
                                    </View>
                                    <View style={styles.medIconCircle}>
                                        <MaterialCommunityIcons name="pill" size={16} color={C.primary} />
                                    </View>
                                </View>
                            </View>

                            {med.category ? <Text style={styles.medCat}>{med.category}</Text> : null}
                            {med.manufacturer ? <Text style={styles.medMeta}>الشركة: {med.manufacturer}</Text> : null}
                            {med.description ? <Text style={styles.medDesc} numberOfLines={2}>{med.description}</Text> : null}

                            <View style={styles.medFooter}>
                                <View style={styles.tagsRow}>
                                    {med.requires_prescription && (
                                        <View style={styles.rxTag}>
                                            <MaterialCommunityIcons name="file-document-outline" size={12} color="#FF9500" />
                                            <Text style={styles.rxTagText}>يتطلب وصفة</Text>
                                        </View>
                                    )}
                                    <View style={[styles.availTag, { backgroundColor: (med.stock_status === 'out_of_stock' ? C.danger : C.success) + '15' }]}>
                                        <Text style={[styles.availTagText, { color: med.stock_status === 'out_of_stock' ? C.danger : C.success }]}>
                                            {med.stock_status === 'out_of_stock' ? 'غير معروض' : 'معروض للمرضى'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.medPrice}>{(med.price || 0).toLocaleString()} ل.س</Text>
                            </View>
                        </View>
                    ))}
            </ScrollView>

            <Modal visible={showModal} transparent animationType="slide">
                <View style={styles.overlay}>
                    <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
                        <View style={styles.modal}>
                            <View style={styles.modalHandle} />
                            <Text style={styles.modalTitle}>{editingId ? 'تعديل الدواء' : 'إضافة دواء جديد'}</Text>

                            {[
                                { field: 'name', label: 'اسم الدواء *', placeholder: 'باراسيتامول 500mg', icon: 'pill' },
                                { field: 'category', label: 'التصنيف', placeholder: 'مسكنات', icon: 'tag-outline' },
                                { field: 'price', label: 'سعر البيع (ل.س) *', placeholder: '5000', icon: 'cash' },
                                { field: 'dosage', label: 'الجرعة', placeholder: '500mg — قرص كل 8 ساعات', icon: 'medical-bag' },
                                { field: 'manufacturer', label: 'الشركة المصنّعة', placeholder: 'شركة دواء سورية', icon: 'factory' },
                                { field: 'description', label: 'الوصف', placeholder: 'وصف الدواء للمريض...', icon: 'text', multiline: true },
                            ].map(({ field, label, placeholder, icon, multiline }) => (
                                <View key={field}>
                                    <Text style={styles.fieldLabel}>{label}</Text>
                                    <View style={[styles.inputWrap, multiline && { alignItems: 'flex-start', paddingVertical: 8 }]}>
                                        <MaterialCommunityIcons name={icon as any} size={18} color={C.textMuted} style={{ marginLeft: 8, marginTop: multiline ? 4 : 0 }} />
                                        <TextInput
                                            style={[styles.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
                                            placeholder={placeholder}
                                            value={(form as any)[field]}
                                            onChangeText={v => setForm(f => ({ ...f, [field]: v }))}
                                            textAlign="right"
                                            multiline={multiline}
                                            keyboardType={field === 'price' ? 'numeric' : 'default'}
                                            placeholderTextColor={C.textMuted}
                                        />
                                    </View>
                                </View>
                            ))}

                            <View style={styles.switchRow}>
                                <Switch value={form.available} onValueChange={v => setForm(f => ({ ...f, available: v }))}
                                    trackColor={{ false: C.border, true: C.success + '80' }} thumbColor={form.available ? C.success : '#f4f4f4'} />
                                <Text style={styles.switchLabel}>معروض للمرضى في التطبيق</Text>
                            </View>
                            <View style={styles.switchRow}>
                                <Switch value={form.requires_prescription} onValueChange={v => setForm(f => ({ ...f, requires_prescription: v }))}
                                    trackColor={{ false: C.border, true: '#FF950080' }} thumbColor={form.requires_prescription ? '#FF9500' : '#f4f4f4'} />
                                <Text style={styles.switchLabel}>يتطلب وصفة طبية</Text>
                            </View>

                            <View style={styles.modalBtns}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(false); setEditingId(null); }}>
                                    <Text style={styles.cancelBtnText}>إلغاء</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveBtn} onPress={saveMedicine}>
                                    <LinearGradient colors={[C.primary, C.accent]} style={styles.saveBtnGrad}>
                                        <Text style={styles.saveBtnText}>{editingId ? 'حفظ التعديل' : 'إضافة الدواء'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
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
    headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, paddingHorizontal: 14, height: 44 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.text, marginRight: 8 },
    fab: { position: 'absolute', left: 20, zIndex: 50 },
    fabGrad: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'center' },
    medCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    medTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    medNameRow: { flexDirection: 'row-reverse', alignItems: 'center', flex: 1, gap: 8 },
    medIconCircle: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primary + '12', justifyContent: 'center', alignItems: 'center' },
    medName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'right' },
    medDosage: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginTop: 2 },
    medCat: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.primary, textAlign: 'right', marginBottom: 4 },
    medMeta: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 2 },
    medDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 6, lineHeight: 18 },
    medFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
    medPrice: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.primary },
    medActions: { flexDirection: 'row', gap: 6 },
    iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
    tagsRow: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap', flex: 1 },
    availTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    availTagText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
    rxTag: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#FF950015', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    rxTagText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#FF9500' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'center', marginBottom: 8 },
    fieldLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'right', marginBottom: 5, marginTop: 10 },
    inputWrap: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: C.bg, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14 },
    input: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.text },
    switchRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
    switchLabel: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: C.text, flex: 1, textAlign: 'right', marginRight: 12 },
    modalBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: C.border },
    cancelBtnText: { color: C.textSec, fontFamily: 'Cairo_700Bold' },
    saveBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
    saveBtnGrad: { paddingVertical: 14, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 15 },
});
