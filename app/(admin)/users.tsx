import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    RefreshControl, TouchableOpacity, Alert, TextInput,
    Animated, Modal, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import AdminUserForm, {
    emptyAdminUserForm, adminUserFormFromUser, adminFormToPayload, AdminUserFormData,
} from '../../src/components/AdminUserForm';

const PREMIUM_COLORS = {
    primary: '#2563EB',
    secondary: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    white: '#FFFFFF',
    text: '#1F2937',
    textMuted: '#6B7280',
    background: '#F3F4F6',
    border: '#E5E7EB',
    cardLight: 'rgba(255, 255, 255, 0.95)',
    shadow: '#000000',
    adminHeader: '#1E3A8A',
};

const ROLES: Record<string, string> = {
    patient: 'مريض 🧑‍⚕️', doctor: 'طبيب 👨‍⚕️', pharmacy: 'صيدلية 💊',
    lab: 'مختبر 🧪', radiology: 'أشعة 📡', warehouse: 'مستودع 🏭',
    admin: 'مدير 🛠️', secretary: 'سكرتاريا 👩‍💼',
};

const formatLocation = (u: any) => {
    const parts = [u.country, u.province, u.city, u.area].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
};

export default function AdminUsers() {
    const params = useLocalSearchParams<{ role?: string }>();
    const [users, setUsers] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [form, setForm] = useState<AdminUserFormData>(emptyAdminUserForm());
    const [saving, setSaving] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    const loadData = async () => {
        try {
            const [u, docs] = await Promise.all([
                api.getAllUsers(roleFilter === 'all' ? undefined : roleFilter),
                api.getAllUsers('doctor'),
            ]);
            setUsers(u);
            setDoctors(docs.map((d: any) => ({ id: d.id, name: d.name })));

            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start();
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => {
        if (params.role) setRoleFilter(params.role);
    }, [params.role]);

    useEffect(() => { loadData(); }, [roleFilter]);

    const openCreate = () => {
        setForm(emptyAdminUserForm());
        setEditingUserId(null);
        setModalMode('create');
    };

    const openEdit = async (user: any) => {
        try {
            const detail = await api.getAdminUserDetail(user.id);
            setForm(adminUserFormFromUser(detail));
            setEditingUserId(user.id);
            setModalMode('edit');
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'تعذر تحميل بيانات المستخدم');
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setEditingUserId(null);
        setForm(emptyAdminUserForm());
    };

    const handleSave = async () => {
        if (!form.name || !form.email) {
            Alert.alert('خطأ', 'الاسم والبريد الإلكتروني مطلوبان');
            return;
        }
        if (form.role === 'secretary' && !form.supervisor_id) {
            Alert.alert('خطأ', 'يجب تحديد الطبيب المشرف للسكرتارية');
            return;
        }
        setSaving(true);
        try {
            const payload = adminFormToPayload(form, modalMode!);
            if (modalMode === 'create') {
                await api.createAdminUser(payload);
                Alert.alert('نجاح', 'تم إنشاء المستخدم بنجاح');
            } else if (editingUserId) {
                await api.updateAdminUser(editingUserId, payload);
                Alert.alert('نجاح', 'تم تحديث المستخدم بنجاح');
            }
            closeModal();
            loadData();
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'تعذر حفظ البيانات');
        } finally {
            setSaving(false);
        }
    };

    const verifyUser = async (id: string, name: string) => {
        Alert.alert('توثيق حساب', `هل تريد توثيق حساب ${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'توثيق ✓', onPress: async () => {
                try { await api.verifyUser(id); loadData(); }
                catch (e: any) { Alert.alert('خطأ', e.message); }
            }},
        ]);
    };

    const toggleActive = async (id: string, name: string, isActive: boolean) => {
        Alert.alert(isActive ? 'تعطيل الحساب' : 'تفعيل الحساب', `${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: isActive ? 'تعطيل ⛔' : 'تفعيل ✅', onPress: async () => {
                try { await api.toggleUserActive(id); loadData(); }
                catch (e: any) { Alert.alert('خطأ', e.message); }
            }},
        ]);
    };

    const toggleFeatured = async (id: string, name: string, isFeatured: boolean) => {
        Alert.alert(isFeatured ? 'إزالة من التمييز' : 'تمييز الحساب', `${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: isFeatured ? 'إزالة ⭐' : 'تمييز ⭐', onPress: async () => {
                try { await api.toggleUserFeatured(id); loadData(); }
                catch (e: any) { Alert.alert('خطأ', e.message); }
            }},
        ]);
    };

    const deleteUser = async (id: string, name: string) => {
        Alert.alert('تعطيل المستخدم', `تعطيل حساب ${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'تعطيل 🗑️', style: 'destructive', onPress: async () => {
                try { await api.deleteUser(id); loadData(); }
                catch (e: any) { Alert.alert('خطأ', e.message); }
            }},
        ]);
    };

    const ROLE_OPTIONS = [{ key: 'all', label: 'الكل' }, ...Object.entries(ROLES).map(([k, v]) => ({ key: k, label: v }))];

    const filteredUsers = users.filter(u => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.phone?.includes(q) ||
            u.city?.toLowerCase().includes(q) ||
            u.country?.toLowerCase().includes(q) ||
            u.province?.toLowerCase().includes(q) ||
            u.id?.toLowerCase().includes(q)
        );
    });

    return (
        <View style={styles.root}>
            <View style={styles.headerWrapper}>
                <LinearGradient colors={[PREMIUM_COLORS.adminHeader, PREMIUM_COLORS.primary]} style={styles.headerGradient} />
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.createBtnHeader} onPress={openCreate}>
                        <MaterialCommunityIcons name="plus" size={20} color={PREMIUM_COLORS.primary} />
                        <Text style={styles.createBtnText}>إضافة مستخدم</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>المستخدمين</Text>
                </View>
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons name="magnify" size={22} color={PREMIUM_COLORS.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ابحث بالاسم، الإيميل، المدينة، الدولة..."
                        placeholderTextColor={PREMIUM_COLORS.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <View style={styles.filterWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {ROLE_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.key}
                            style={[styles.filterChip, roleFilter === opt.key && styles.filterChipActive]}
                            onPress={() => setRoleFilter(opt.key)}
                        >
                            <Text style={[styles.filterText, roleFilter === opt.key && { color: PREMIUM_COLORS.white }]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView
                style={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={PREMIUM_COLORS.primary} />}
            >
                {loading ? <ActivityIndicator color={PREMIUM_COLORS.primary} style={{ marginTop: 60 }} size="large" /> :
                    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY }] }]}>
                        {filteredUsers.length === 0 ? (
                            <Text style={styles.emptyText}>لم يتم العثور على مستخدمين مطابقين.</Text>
                        ) : (
                            filteredUsers.map((u: any) => (
                                <View key={u.id} style={styles.userCard}>
                                    <View style={styles.userTop}>
                                        <View style={styles.badges}>
                                            {u.verified ?
                                                <View style={styles.badgeSuccess}><Text style={styles.badgeSuccessText}>موثق ✓</Text></View> :
                                                <View style={styles.badgeWarning}><Text style={styles.badgeWarningText}>غير موثق</Text></View>
                                            }
                                            {u.is_featured ? (
                                                <View style={[styles.badgeWarning, { backgroundColor: '#FEF3C7' }]}>
                                                    <Text style={[styles.badgeWarningText, { color: '#D97706' }]}>مميز ⭐</Text>
                                                </View>
                                            ) : null}
                                            {!u.is_active ? <View style={styles.badgeDanger}><Text style={styles.badgeDangerText}>معطل ⛔</Text></View> : null}
                                        </View>
                                        <Text style={styles.userName}>{u.name}</Text>
                                    </View>

                                    <View style={styles.userInfoRow}>
                                        <Text style={styles.userInfoText}>{u.email}</Text>
                                        <MaterialCommunityIcons name="email-outline" size={14} color={PREMIUM_COLORS.textMuted} />
                                    </View>
                                    <View style={styles.userInfoRow}>
                                        <Text style={styles.userInfoText}>{u.phone || 'لا يوجد هاتف'}</Text>
                                        <MaterialCommunityIcons name="phone-outline" size={14} color={PREMIUM_COLORS.textMuted} />
                                    </View>
                                    {formatLocation(u) ? (
                                        <View style={styles.userInfoRow}>
                                            <Text style={styles.userInfoText}>{formatLocation(u)}</Text>
                                            <MaterialCommunityIcons name="map-marker-outline" size={14} color={PREMIUM_COLORS.textMuted} />
                                        </View>
                                    ) : null}
                                    {u.address ? (
                                        <View style={styles.userInfoRow}>
                                            <Text style={styles.userInfoText} numberOfLines={1}>{u.address}</Text>
                                            <MaterialCommunityIcons name="home-outline" size={14} color={PREMIUM_COLORS.textMuted} />
                                        </View>
                                    ) : null}

                                    <View style={styles.roleRow}>
                                        <Text style={styles.roleText}>{ROLES[u.role] || u.role}</Text>
                                        {u.specialization ? <Text style={styles.cityText}>{u.specialization}</Text> : null}
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.actionsRow}>
                                        <TouchableOpacity style={styles.actionBtnDelete} onPress={() => deleteUser(u.id, u.name)}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={PREMIUM_COLORS.danger} />
                                            <Text style={styles.actionBtnTextDelete}>تعطيل</Text>
                                        </TouchableOpacity>

                                        <View style={styles.actionsRight}>
                                            <TouchableOpacity style={styles.actionBtnEdit} onPress={() => openEdit(u)}>
                                                <MaterialCommunityIcons name="pencil-outline" size={16} color={PREMIUM_COLORS.primary} />
                                                <Text style={styles.actionBtnTextEdit}>تعديل</Text>
                                            </TouchableOpacity>
                                            {!u.verified ? (
                                                <TouchableOpacity style={styles.actionBtnVerify} onPress={() => verifyUser(u.id, u.name)}>
                                                    <Text style={styles.actionBtnTextVerify}>توثيق</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                            <TouchableOpacity
                                                style={[styles.actionBtnToggle, u.is_active ? styles.btnDanger : styles.btnSuccess]}
                                                onPress={() => toggleActive(u.id, u.name, u.is_active)}
                                            >
                                                <Text style={[styles.actionBtnTextToggle, { color: u.is_active ? PREMIUM_COLORS.danger : PREMIUM_COLORS.secondary }]}>
                                                    {u.is_active ? 'تعطيل' : 'تفعيل'}
                                                </Text>
                                            </TouchableOpacity>
                                            {(u.role === 'doctor' || u.role === 'pharmacy') ? (
                                                <TouchableOpacity
                                                    style={[styles.actionBtnToggle, u.is_featured ? { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' } : { borderColor: PREMIUM_COLORS.border }]}
                                                    onPress={() => toggleFeatured(u.id, u.name, u.is_featured)}
                                                >
                                                    <MaterialCommunityIcons
                                                        name={u.is_featured ? 'star' : 'star-outline'}
                                                        size={16}
                                                        color={u.is_featured ? '#F59E0B' : PREMIUM_COLORS.textMuted}
                                                    />
                                                </TouchableOpacity>
                                            ) : null}
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                        <View style={{ height: 100 }} />
                    </Animated.View>
                }
            </ScrollView>

            <Modal visible={modalMode !== null} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeModal}>
                                <MaterialCommunityIcons name="close" size={24} color={PREMIUM_COLORS.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>
                                {modalMode === 'create' ? 'مستخدم جديد' : 'تعديل المستخدم'}
                            </Text>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <AdminUserForm
                                form={form}
                                onChange={setForm}
                                mode={modalMode || 'create'}
                                doctors={doctors}
                            />
                            <TouchableOpacity
                                style={[styles.submitBtn, saving && { opacity: 0.7 }]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ?
                                    <ActivityIndicator color={PREMIUM_COLORS.white} /> :
                                    <Text style={styles.submitBtnText}>
                                        {modalMode === 'create' ? 'إنشاء الحساب' : 'حفظ التعديلات'}
                                    </Text>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: PREMIUM_COLORS.background },
    headerWrapper: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerGradient: { ...StyleSheet.absoluteFillObject },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.white },
    createBtnHeader: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: PREMIUM_COLORS.white,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    },
    createBtnText: { color: PREMIUM_COLORS.primary, fontFamily: 'Cairo_700Bold', fontSize: 12, marginLeft: 4 },
    searchContainer: {
        flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: PREMIUM_COLORS.cardLight,
        borderRadius: 16, paddingHorizontal: 14, height: 45,
    },
    searchInput: { flex: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: PREMIUM_COLORS.text, textAlign: 'right', paddingRight: 8 },
    filterWrapper: { marginTop: 15, marginBottom: 5 },
    filterScroll: { paddingHorizontal: 16, gap: 8 },
    filterChip: { backgroundColor: PREMIUM_COLORS.white, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: PREMIUM_COLORS.border },
    filterChipActive: { backgroundColor: PREMIUM_COLORS.primary, borderColor: PREMIUM_COLORS.primary },
    filterText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: PREMIUM_COLORS.textMuted },
    listContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    emptyText: { textAlign: 'center', fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted, marginTop: 40 },
    userCard: { backgroundColor: PREMIUM_COLORS.cardLight, borderRadius: 20, padding: 16, marginBottom: 12, elevation: 3 },
    userTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    userName: { fontSize: 16, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.text },
    badges: { flexDirection: 'row', gap: 4 },
    badgeSuccess: { backgroundColor: PREMIUM_COLORS.secondary + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    badgeSuccessText: { color: PREMIUM_COLORS.secondary, fontSize: 10, fontFamily: 'Cairo_700Bold' },
    badgeWarning: { backgroundColor: PREMIUM_COLORS.warning + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    badgeWarningText: { color: PREMIUM_COLORS.warning, fontSize: 10, fontFamily: 'Cairo_700Bold' },
    badgeDanger: { backgroundColor: PREMIUM_COLORS.danger + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    badgeDangerText: { color: PREMIUM_COLORS.danger, fontSize: 10, fontFamily: 'Cairo_700Bold' },
    userInfoRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 },
    userInfoText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted, marginRight: 6, flex: 1, textAlign: 'right' },
    roleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    roleText: { fontSize: 13, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.primary },
    cityText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted },
    divider: { height: 1, backgroundColor: PREMIUM_COLORS.border, marginVertical: 12 },
    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionsRight: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 },
    actionBtnToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    btnSuccess: { borderColor: PREMIUM_COLORS.secondary, backgroundColor: PREMIUM_COLORS.secondary + '10' },
    btnDanger: { borderColor: PREMIUM_COLORS.danger, backgroundColor: PREMIUM_COLORS.danger + '10' },
    actionBtnTextToggle: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    actionBtnVerify: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: PREMIUM_COLORS.primary + '15' },
    actionBtnTextVerify: { color: PREMIUM_COLORS.primary, fontSize: 11, fontFamily: 'Cairo_700Bold' },
    actionBtnEdit: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
    actionBtnTextEdit: { color: PREMIUM_COLORS.primary, fontSize: 11, fontFamily: 'Cairo_700Bold' },
    actionBtnDelete: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
    actionBtnTextDelete: { color: PREMIUM_COLORS.danger, fontSize: 11, fontFamily: 'Cairo_700Bold', marginLeft: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: PREMIUM_COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '92%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 20, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.text },
    submitBtn: { backgroundColor: PREMIUM_COLORS.primary, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 24 },
    submitBtnText: { color: PREMIUM_COLORS.white, fontFamily: 'Cairo_700Bold', fontSize: 16 },
});
