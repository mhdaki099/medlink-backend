import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Modal, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { TAB_BAR_CLEARANCE } from '../../src/constants/layout';
import {
    SERVICE_AVAILABILITY,
    SERVICE_AVAILABILITY_OPTIONS,
    getServiceAvailability,
    type ServiceAvailabilityKey,
} from '../../src/constants/serviceAvailability';

const C = {
    primary: '#8E24AA', accent: '#CE93D8', bg: '#F8FAFC', white: '#FFF',
    text: '#111827', textSec: '#6B7280', border: '#F1F5F9',
};

const EMPTY_FORM = {
    name: '', category: 'عام', price: '', duration_hours: '24',
    description: '', preparation: '', availability_status: 'available' as ServiceAvailabilityKey,
};

export default function LabTests() {
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ServiceAvailabilityKey>('all');
    const [selected, setSelected] = useState<any>(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const isRadiology = user?.role === 'radiology';

    const load = async () => {
        if (!user?.id) return;
        try { const t = await api.getLabTests(user.id); setTests(t); }
        catch (e) { console.warn(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [user]);

    const openAdd = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (test: any) => {
        setEditing(test);
        setForm({
            name: test.name || '',
            category: test.category || 'عام',
            price: String(test.price || ''),
            duration_hours: String(test.duration_hours || 24),
            description: test.description || '',
            preparation: test.preparation || '',
            availability_status: (test.availability_status || 'available') as ServiceAvailabilityKey,
        });
        setSelected(null);
        setShowForm(true);
    };

    const saveTest = async () => {
        if (!user?.id || !form.name.trim()) {
            Alert.alert('تنبيه', 'اسم الخدمة مطلوب');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                category: form.category.trim() || 'عام',
                price: Number(form.price) || 0,
                duration_hours: Number(form.duration_hours) || 24,
                description: form.description.trim(),
                preparation: form.preparation.trim(),
                availability_status: form.availability_status,
            };
            if (editing) {
                await api.updateLabTest(editing.id, payload);
            } else {
                await api.addLabTest(user.id, payload);
            }
            setShowForm(false);
            setEditing(null);
            setForm(EMPTY_FORM);
            await load();
            Alert.alert('✅ تم', editing ? 'تم تحديث الخدمة' : 'تمت إضافة الخدمة');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSaving(false);
        }
    };

    const deleteTest = (test: any) => {
        Alert.alert('حذف الخدمة', `حذف «${test.name}»؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'حذف', style: 'destructive', onPress: async () => {
                    try {
                        await api.deleteLabTest(test.id);
                        setSelected(null);
                        load();
                    } catch (e: any) { Alert.alert('خطأ', e.message); }
                },
            },
        ]);
    };

    const filtered = tests.filter(t => {
        const matchesSearch = !search || t.name?.includes(search) || t.category?.includes(search);
        const matchesStatus = statusFilter === 'all' || (t.availability_status || 'available') === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusCounts = SERVICE_AVAILABILITY_OPTIONS.reduce((acc, key) => {
        acc[key] = tests.filter(t => (t.availability_status || 'available') === key).length;
        return acc;
    }, {} as Record<ServiceAvailabilityKey, number>);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#6A1B9A', C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerRow}>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name={isRadiology ? 'radiology-box' : 'flask'} size={26} color={C.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>{isRadiology ? 'خدمات الأشعة' : 'قائمة الفحوصات'}</Text>
                        <Text style={styles.headerSub}>
                            {statusCounts.available || 0} متاح | {statusCounts.out_of_service || 0} خارج الخدمة
                        </Text>
                    </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                    <TouchableOpacity
                        style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
                        onPress={() => setStatusFilter('all')}
                    >
                        <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>الكل ({tests.length})</Text>
                    </TouchableOpacity>
                    {SERVICE_AVAILABILITY_OPTIONS.map(key => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.filterChip, statusFilter === key && styles.filterChipActive]}
                            onPress={() => setStatusFilter(key)}
                        >
                            <Text style={[styles.filterChipText, statusFilter === key && styles.filterChipTextActive]}>
                                {SERVICE_AVAILABILITY[key].label} ({statusCounts[key] || 0})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.7)" />
                    <TextInput style={styles.searchInput} placeholder="ابحث..." placeholderTextColor="rgba(255,255,255,0.6)"
                        value={search} onChangeText={setSearch} textAlign="right" />
                </View>
            </LinearGradient>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE + 70 }}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="flask-empty-outline" size={56} color="#E5E7EB" />
                            <Text style={styles.emptyText}>لا توجد خدمات — أضف أول خدمة</Text>
                        </View>
                    ) : filtered.map((t: any) => (
                        <TouchableOpacity key={t.id} style={styles.testCard} onPress={() => setSelected(t)} activeOpacity={0.85}>
                            <View style={styles.cardTop}>
                                <View style={styles.badgeRow}>
                                    <View style={[styles.availBadge, { backgroundColor: getServiceAvailability(t.availability_status).bg }]}>
                                        <Text style={[styles.availBadgeText, { color: getServiceAvailability(t.availability_status).color }]}>
                                            {getServiceAvailability(t.availability_status).label}
                                        </Text>
                                    </View>
                                    <View style={styles.catBadge}>
                                        <Text style={styles.catText}>{t.category || 'عام'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.testName}>{t.name}</Text>
                            </View>
                            {t.description ? <Text style={styles.testDesc} numberOfLines={2}>{t.description}</Text> : null}
                            <View style={styles.cardFooter}>
                                <View style={styles.metaPill}>
                                    <MaterialCommunityIcons name="cash" size={13} color={C.primary} />
                                    <Text style={styles.metaText}>{(t.price || 0).toLocaleString()} ل.س</Text>
                                </View>
                                <View style={styles.metaPill}>
                                    <MaterialCommunityIcons name="timer-outline" size={13} color={C.textSec} />
                                    <Text style={styles.metaText}>{t.duration_hours} ساعة</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
            </ScrollView>

            <TouchableOpacity style={[styles.fab, { bottom: TAB_BAR_CLEARANCE }]} onPress={openAdd} activeOpacity={0.9}>
                <LinearGradient colors={['#6A1B9A', C.primary]} style={styles.fabGrad}>
                    <MaterialCommunityIcons name="plus" size={28} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Detail Modal */}
            <Modal visible={!!selected} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setSelected(null)}>
                                <MaterialCommunityIcons name="close" size={24} color={C.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{selected?.name}</Text>
                        </View>
                        {selected && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailVal}>{selected.category || 'عام'}</Text>
                                    <Text style={styles.detailLabel}>التصنيف</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailVal}>{(selected.price || 0).toLocaleString()} ل.س</Text>
                                    <Text style={styles.detailLabel}>السعر</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailVal}>{selected.duration_hours} ساعة</Text>
                                    <Text style={styles.detailLabel}>مدة النتيجة</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailVal, { color: getServiceAvailability(selected.availability_status).color }]}>
                                        {getServiceAvailability(selected.availability_status).label}
                                    </Text>
                                    <Text style={styles.detailLabel}>حالة التوفر</Text>
                                </View>
                                {selected.description ? (
                                    <View style={styles.descBox}>
                                        <Text style={styles.detailLabel}>الوصف</Text>
                                        <Text style={styles.descText}>{selected.description}</Text>
                                    </View>
                                ) : null}
                                {selected.preparation ? (
                                    <View style={[styles.descBox, { backgroundColor: '#FEF3C7' }]}>
                                        <Text style={[styles.detailLabel, { color: '#D97706' }]}>تعليمات التحضير</Text>
                                        <Text style={[styles.descText, { color: '#92400E' }]}>{selected.preparation}</Text>
                                    </View>
                                ) : null}
                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(selected)}>
                                        <Text style={styles.editBtnText}>تعديل</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.delBtn} onPress={() => deleteTest(selected)}>
                                        <Text style={styles.delBtnText}>حذف</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Add/Edit Form Modal */}
            <Modal visible={showForm} transparent animationType="slide">
                <View style={styles.overlay}>
                    <ScrollView style={styles.formModal} keyboardShouldPersistTaps="handled">
                        <Text style={styles.formTitle}>{editing ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}</Text>
                        {[
                            { key: 'name', label: 'اسم الخدمة *', placeholder: isRadiology ? 'مثال: أشعة مقطعية' : 'مثال: صورة دم كاملة' },
                            { key: 'category', label: 'التصنيف', placeholder: isRadiology ? 'أشعة' : 'تحاليل الدم' },
                            { key: 'price', label: 'السعر (ل.س)', placeholder: '15000', keyboard: 'numeric' },
                            { key: 'duration_hours', label: 'مدة النتيجة (ساعات)', placeholder: '24', keyboard: 'numeric' },
                            { key: 'description', label: 'الوصف', placeholder: 'وصف مختصر للخدمة', multiline: true },
                            { key: 'preparation', label: 'تعليمات التحضير', placeholder: 'مثال: الصيام 8 ساعات', multiline: true },
                        ].map(field => (
                            <View key={field.key}>
                                <Text style={styles.fieldLabel}>{field.label}</Text>
                                <TextInput
                                    style={[styles.fieldInput, field.multiline && { minHeight: 70 }]}
                                    placeholder={field.placeholder}
                                    placeholderTextColor={C.textSec}
                                    value={(form as any)[field.key]}
                                    onChangeText={v => setForm(f => ({ ...f, [field.key]: v }))}
                                    keyboardType={field.keyboard as any}
                                    multiline={field.multiline}
                                    textAlign="right"
                                />
                            </View>
                        ))}
                        <Text style={styles.fieldLabel}>حالة التوفر</Text>
                        <View style={styles.statusPicker}>
                            {SERVICE_AVAILABILITY_OPTIONS.map(key => {
                                const active = form.availability_status === key;
                                const meta = SERVICE_AVAILABILITY[key];
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[styles.statusOption, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                                        onPress={() => setForm(f => ({ ...f, availability_status: key }))}
                                    >
                                        <Text style={[styles.statusOptionText, active && { color: meta.color }]}>{meta.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <View style={styles.formBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                                <Text style={styles.cancelBtnText}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={saveTest} disabled={saving}>
                                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>حفظ</Text>}
                            </TouchableOpacity>
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
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
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    filterRow: { marginBottom: 10 },
    filterChip: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
    filterChipActive: { backgroundColor: '#FFF' },
    filterChipText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: 'rgba(255,255,255,0.9)' },
    filterChipTextActive: { color: C.primary },
    badgeRow: { flexDirection: 'row-reverse', gap: 6 },
    availBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    availBadgeText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)' },
    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 14, height: 44, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#FFF' },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.textSec },
    testCard: { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    testName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right' },
    catBadge: { backgroundColor: C.primary + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    catText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: C.primary },
    testDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', lineHeight: 18, marginBottom: 10 },
    cardFooter: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
    metaPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    metaText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    fab: { position: 'absolute', left: 20, borderRadius: 28, elevation: 8 },
    statusPicker: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    statusOption: { borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8 },
    statusOptionText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    fabGrad: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '75%' },
    formModal: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right', marginRight: 10 },
    detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    detailLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.textSec },
    detailVal: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.text },
    descBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginTop: 12 },
    descText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: C.text, textAlign: 'right', lineHeight: 20, marginTop: 6 },
    modalActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
    editBtn: { flex: 1, backgroundColor: C.primary + '15', borderRadius: 12, padding: 12, alignItems: 'center' },
    editBtnText: { color: C.primary, fontFamily: 'Cairo_700Bold' },
    delBtn: { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 12, alignItems: 'center' },
    delBtnText: { color: '#EF4444', fontFamily: 'Cairo_700Bold' },
    formTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'center', marginBottom: 16 },
    fieldLabel: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: C.text, textAlign: 'right', marginBottom: 6, marginTop: 10 },
    fieldInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.text },
    formBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
    cancelBtnText: { color: C.textSec, fontFamily: 'Cairo_600SemiBold' },
    saveBtn: { flex: 1, backgroundColor: C.primary, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontFamily: 'Cairo_700Bold' },
});
