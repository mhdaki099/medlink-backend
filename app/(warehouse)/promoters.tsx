import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import ModernSheet from '../../src/components/ModernSheet';
import { useSubscreenBottomPadding } from '../../src/constants/layout';

const C = {
    primary: '#1E88E5', accent: '#43A047', success: '#10B981', danger: '#EF4444',
    warning: '#F59E0B', bg: '#F8FAFC', white: '#FFF', text: '#0F172A', textSec: '#64748B', border: '#E2E8F0',
};

export default function WarehousePromoters() {
    const { user } = useAuth();
    const router = useRouter();
    const bottomPad = useSubscreenBottomPadding();
    const [promoters, setPromoters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', commission_percent: '' });

    const load = async () => {
        try {
            const rows = await api.getWarehousePromoters();
            setPromoters(rows.filter((r: any) => r.is_active !== false));
        } catch (e: any) {
            console.warn(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [user]);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', phone: '', commission_percent: '' });
        setShowForm(true);
    };

    const openEdit = (row: any) => {
        setEditing(row);
        setForm({
            name: row.name || '',
            phone: row.phone || '',
            commission_percent: String(row.commission_percent ?? ''),
        });
        setShowForm(true);
    };

    const save = async () => {
        const name = form.name.trim();
        const pct = parseFloat(form.commission_percent);
        if (!name) { Alert.alert('تنبيه', 'اسم المندوب مطلوب'); return; }
        if (isNaN(pct) || pct < 0 || pct > 100) { Alert.alert('تنبيه', 'نسبة العمولة بين 0 و 100'); return; }
        setSaving(true);
        try {
            const payload = { name, phone: form.phone.trim() || undefined, commission_percent: pct };
            if (editing) {
                await api.updateWarehousePromoter(editing.id, payload);
            } else {
                await api.createWarehousePromoter(payload);
            }
            setShowForm(false);
            load();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSaving(false);
        }
    };

    const remove = (row: any) => {
        Alert.alert('حذف المندوب', `إزالة ${row.name} من القائمة؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'حذف', style: 'destructive', onPress: async () => {
                    try {
                        await api.deleteWarehousePromoter(row.id);
                        load();
                    } catch (e: any) { Alert.alert('خطأ', e.message); }
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={[C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addHeaderBtn} onPress={openAdd}>
                        <MaterialCommunityIcons name="account-plus" size={20} color={C.primary} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>المندوبون والمسوقون</Text>
                        <Text style={styles.headerSub}>نسب العمولة للفواتير</Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="account-tie" size={26} color={C.primary} />
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: bottomPad }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" />
                ) : promoters.length === 0 ? (
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="account-group-outline" size={56} color="#E2E8F0" />
                        <Text style={styles.emptyTitle}>لا يوجد مندوبون بعد</Text>
                        <Text style={styles.emptySub}>أضف مندوباً أو مسوقاً لربطه بفواتير طلبات الصيدليات</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={openAdd}>
                            <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                            <Text style={styles.emptyBtnText}>إضافة مندوب</Text>
                        </TouchableOpacity>
                    </View>
                ) : promoters.map((row: any) => (
                    <View key={row.id} style={styles.card}>
                        <View style={styles.cardTop}>
                            <View style={styles.pctBadge}>
                                <Text style={styles.pctVal}>{row.commission_percent ?? 0}%</Text>
                                <Text style={styles.pctLbl}>عمولة</Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.cardName}>{row.name}</Text>
                                {row.phone ? (
                                    <View style={styles.phoneRow}>
                                        <Text style={styles.phoneText}>{row.phone}</Text>
                                        <MaterialCommunityIcons name="phone-outline" size={13} color={C.textSec} />
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.avatar}>
                                <MaterialCommunityIcons name="account-tie" size={22} color={C.primary} />
                            </View>
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(row)}>
                                <MaterialCommunityIcons name="pencil-outline" size={16} color={C.primary} />
                                <Text style={styles.editBtnText}>تعديل</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.delBtn} onPress={() => remove(row)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <ModernSheet
                visible={showForm}
                onClose={() => setShowForm(false)}
                title={editing ? 'تعديل المندوب' : 'مندوب جديد'}
                subtitle="يُستخدم عند إصدار فاتورة طلب الصيدلية"
                icon="account-tie"
                iconColors={['#1E88E5', '#6366F1']}
                actions={[
                    { label: 'إلغاء', onPress: () => setShowForm(false), variant: 'secondary' },
                    { label: editing ? 'حفظ' : 'إضافة', onPress: save, variant: 'primary', loading: saving },
                ]}
            >
                <View style={styles.form}>
                    <Text style={styles.label}>اسم المندوب / المسوق</Text>
                    <TextInput
                        style={styles.input}
                        value={form.name}
                        onChangeText={v => setForm(f => ({ ...f, name: v }))}
                        placeholder="مثال: أحمد محمد"
                        textAlign="right"
                    />
                    <Text style={styles.label}>رقم الهاتف (اختياري)</Text>
                    <TextInput
                        style={styles.input}
                        value={form.phone}
                        onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                        placeholder="09xxxxxxxx"
                        keyboardType="phone-pad"
                        textAlign="right"
                    />
                    <Text style={styles.label}>نسبة العمولة %</Text>
                    <TextInput
                        style={styles.input}
                        value={form.commission_percent}
                        onChangeText={v => setForm(f => ({ ...f, commission_percent: v }))}
                        placeholder="مثال: 5"
                        keyboardType="decimal-pad"
                        textAlign="right"
                    />
                    <Text style={styles.hint}>تُحسب العمولة من إجمالي الفاتورة عند اختيار المندوب في الفاتورة</Text>
                </View>
            </ModernSheet>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 16, paddingHorizontal: 16 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    addHeaderBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
    headerIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)' },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
    empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 8 },
    emptyTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.text },
    emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'center' },
    emptyBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 12 },
    emptyBtnText: { fontFamily: 'Cairo_700Bold', color: '#FFF', fontSize: 14 },
    card: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
    cardTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary + '15', alignItems: 'center', justifyContent: 'center' },
    cardName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text },
    phoneRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 },
    phoneText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec },
    pctBadge: { alignItems: 'center', backgroundColor: C.warning + '18', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minWidth: 64 },
    pctVal: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.warning },
    pctLbl: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: C.textSec },
    cardActions: { flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
    editBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.primary + '12' },
    editBtnText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.primary },
    delBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.danger + '12', alignItems: 'center', justifyContent: 'center' },
    form: { gap: 6 },
    label: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.textSec, textAlign: 'right', marginTop: 4 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontFamily: 'Cairo_400Regular', fontSize: 14 },
    hint: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginTop: 4 },
});
