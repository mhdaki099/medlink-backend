import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const STOCK_COLORS: Record<string, string> = { in_stock: Colors.confirmed, out_of_stock: Colors.danger, coming_soon: Colors.warning };
const STOCK_LABELS: Record<string, string> = { in_stock: 'متوفر', out_of_stock: 'غير متوفر', coming_soon: 'قريباً' };

export default function PharmacyMedicines() {
    const { user } = useAuth();
    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
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
        if (!form.name || !form.price) { Alert.alert('أدخل الاسم والسعر'); return; }
        try {
            await api.addMedicine({ ...form, price: parseInt(form.price) || 0, pharmacy_id: user?.id });
            setShowAdd(false); setForm({ name: '', category: '', price: '', description: '', stock_status: 'in_stock' }); load();
            Alert.alert('✅ تم', 'تمت إضافة الدواء بنجاح');
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}><Text style={styles.addBtnText}>+ إضافة دواء</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>إدارة الأدوية 💊</Text>
            </View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {loading ? <ActivityIndicator color={Colors.pharmacy} style={{ marginTop: 40 }} size="large" /> :
                    medicines.map((med: any) => (
                        <View key={med.id} style={styles.medCard}>
                            <View style={styles.medTop}>
                                <View style={[styles.stockBadge, { backgroundColor: (STOCK_COLORS[med.stock_status] || Colors.primary) + '18' }]}>
                                    <Text style={[styles.stockText, { color: STOCK_COLORS[med.stock_status] || Colors.primary }]}>{STOCK_LABELS[med.stock_status]}</Text>
                                </View>
                                <Text style={styles.medName}>{med.name}</Text>
                            </View>
                            <Text style={styles.medCat}>{med.category}</Text>
                            <Text style={styles.medPrice}>💰 {(med.price || 0).toLocaleString()} ل.س</Text>
                            <View style={styles.medActions}>
                                {['in_stock', 'out_of_stock', 'coming_soon'].map(status => (
                                    <TouchableOpacity key={status}
                                        style={[styles.statusBtn, med.stock_status === status && { backgroundColor: STOCK_COLORS[status] }]}
                                        onPress={() => updateStock(med.id, status)}>
                                        <Text style={[styles.statusBtnText, med.stock_status === status && { color: '#fff' }]}>{STOCK_LABELS[status]}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ))}
                <View style={{ height: 20 }} />
            </ScrollView>

            <Modal visible={showAdd} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>إضافة دواء جديد</Text>
                        {[
                            { field: 'name', label: 'اسم الدواء', placeholder: 'اسم الدواء' },
                            { field: 'category', label: 'التصنيف', placeholder: 'مضادات حيوية' },
                            { field: 'price', label: 'السعر (ل.س)', placeholder: '5000' },
                            { field: 'description', label: 'الوصف', placeholder: 'وصف الدواء' },
                        ].map(({ field, label, placeholder }) => (
                            <View key={field}>
                                <Text style={styles.fieldLabel}>{label}</Text>
                                <TextInput style={styles.input} placeholder={placeholder} value={(form as any)[field]}
                                    onChangeText={v => setForm(f => ({ ...f, [field]: v }))} textAlign="right" keyboardType={field === 'price' ? 'numeric' : 'default'} placeholderTextColor={Colors.textMuted} />
                            </View>
                        ))}
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}><Text style={styles.cancelBtnText}>إلغاء</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={addMedicine}><Text style={styles.saveBtnText}>حفظ</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.pharmacy, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    addBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 8 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    medCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    medTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    medName: { fontSize: 15, fontWeight: '800', color: Colors.text, flex: 1, textAlign: 'right' },
    stockBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    stockText: { fontSize: 11, fontWeight: '700' },
    medCat: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 4 },
    medPrice: { fontSize: 14, fontWeight: '800', color: Colors.pharmacy, textAlign: 'right', marginBottom: 10 },
    medActions: { flexDirection: 'row', gap: 6 },
    statusBtn: { flex: 1, borderRadius: BorderRadius.full, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    statusBtnText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 5, marginTop: 8 },
    input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, borderRadius: BorderRadius.full, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
    cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
    saveBtn: { flex: 1, backgroundColor: Colors.pharmacy, borderRadius: BorderRadius.full, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700' },
});
