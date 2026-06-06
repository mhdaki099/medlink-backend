import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
    TextInput, Modal, ActivityIndicator, Platform, FlatList, RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/services/api';
import AdminUserForm, {
    emptyAdminUserForm, adminUserFormFromUser, adminFormToPayload, AdminUserFormData,
} from '../../src/components/AdminUserForm';
import AdminShell, { AdminEmptyState, AdminIconButton } from '../../src/components/admin/AdminShell';
import { ADMIN_THEME, ADMIN_ROLE_META, getAdminTabClearance } from '../../src/constants/adminTheme';
import { useAdminPermissions } from '../../src/hooks/useAdminPermissions';
import { isProtectedSuperAdminUser } from '../../src/constants/adminPermissions';

const formatLocation = (u: any) => {
    const parts = [u.country, u.province, u.city].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
};

function StatusBadge({ label, tone }: { label: string; tone: 'success' | 'warn' | 'danger' | 'info' }) {
    const bg = tone === 'success' ? ADMIN_THEME.successBg
        : tone === 'warn' ? ADMIN_THEME.warningBg
            : tone === 'danger' ? ADMIN_THEME.dangerBg
                : ADMIN_THEME.infoBg;
    const color = tone === 'success' ? ADMIN_THEME.success
        : tone === 'warn' ? ADMIN_THEME.warning
            : tone === 'danger' ? ADMIN_THEME.danger
                : ADMIN_THEME.info;
    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
}

function UserCard({
    user: u,
    canEdit,
    canVerify,
    canToggle,
    canFeature,
    canDelete,
    onEdit,
    onVerify,
    onToggle,
    onFeature,
    onDelete,
}: {
    user: any;
    canEdit: boolean;
    canVerify: boolean;
    canToggle: boolean;
    canFeature: boolean;
    canDelete: boolean;
    onEdit: () => void;
    onVerify: () => void;
    onToggle: () => void;
    onFeature: () => void;
    onDelete: () => void;
}) {
    const meta = ADMIN_ROLE_META[u.role] || { label: u.role, icon: 'account', color: ADMIN_THEME.accent };
    const isProtected = isProtectedSuperAdminUser(u);
    const canOpenEdit = canEdit && !isProtected;

    return (
        <TouchableOpacity
            style={styles.userCard}
            activeOpacity={canOpenEdit ? 0.85 : 1}
            onPress={canOpenEdit ? onEdit : undefined}
            disabled={!canOpenEdit}
        >
            <View style={styles.userHeader}>
                <View style={[styles.avatar, { backgroundColor: meta.color + '18' }]}>
                    <MaterialCommunityIcons name={meta.icon as any} size={24} color={meta.color} />
                </View>
                <View style={styles.userMain}>
                    <View style={styles.nameRow}>
                        <Text style={styles.userId} selectable>{u.id}</Text>
                        <Text style={styles.userName}>{u.name}</Text>
                    </View>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <View style={styles.badgeRow}>
                        <View style={[styles.rolePill, { backgroundColor: meta.color + '15' }]}>
                            <Text style={[styles.rolePillText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        {u.verified ? <StatusBadge label="موثق" tone="success" /> : <StatusBadge label="غير موثق" tone="warn" />}
                        {!u.is_active ? <StatusBadge label="معطل" tone="danger" /> : null}
                        {u.is_featured ? <StatusBadge label="مميز" tone="info" /> : null}
                        {u.rating ? <StatusBadge label={`★ ${Number(u.rating).toFixed(1)}`} tone="info" /> : null}
                        {isProtected ? <StatusBadge label="مدير رئيسي" tone="info" /> : null}
                    </View>
                </View>
            </View>

            {(u.phone || formatLocation(u) || u.specialization) ? (
                <View style={styles.metaBox}>
                    {u.phone ? (
                        <View style={styles.metaLine}>
                            <Text style={styles.metaText}>{u.phone}</Text>
                            <MaterialCommunityIcons name="phone-outline" size={14} color={ADMIN_THEME.textMuted} />
                        </View>
                    ) : null}
                    {formatLocation(u) ? (
                        <View style={styles.metaLine}>
                            <Text style={styles.metaText}>{formatLocation(u)}</Text>
                            <MaterialCommunityIcons name="map-marker-outline" size={14} color={ADMIN_THEME.textMuted} />
                        </View>
                    ) : null}
                    {u.specialization ? (
                        <View style={styles.metaLine}>
                            <Text style={styles.metaText}>{u.specialization}</Text>
                            <MaterialCommunityIcons name="certificate-outline" size={14} color={ADMIN_THEME.textMuted} />
                        </View>
                    ) : null}
                </View>
            ) : null}

            <View style={styles.actions}>
                {isProtected ? (
                    <Text style={styles.protectedNote}>حساب محمي — لا يمكن تعديله أو تعطيله</Text>
                ) : (
                    <>
                        {canEdit ? (
                            <TouchableOpacity style={styles.actionIcon} onPress={onEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <MaterialCommunityIcons name="pencil-outline" size={18} color={ADMIN_THEME.accent} />
                            </TouchableOpacity>
                        ) : null}
                        {canVerify && !u.verified ? (
                            <TouchableOpacity style={styles.actionIcon} onPress={onVerify} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <MaterialCommunityIcons name="check-decagram" size={18} color={ADMIN_THEME.success} />
                            </TouchableOpacity>
                        ) : null}
                        {canToggle ? (
                            <TouchableOpacity style={styles.actionIcon} onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <MaterialCommunityIcons name={u.is_active ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={u.is_active ? ADMIN_THEME.warning : ADMIN_THEME.success} />
                            </TouchableOpacity>
                        ) : null}
                        {canFeature && (u.role === 'doctor' || u.role === 'pharmacy') ? (
                            <TouchableOpacity style={styles.actionIcon} onPress={onFeature} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <MaterialCommunityIcons name={u.is_featured ? 'star' : 'star-outline'} size={18} color="#F59E0B" />
                            </TouchableOpacity>
                        ) : null}
                        {canDelete ? (
                            <TouchableOpacity style={styles.actionIcon} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color={ADMIN_THEME.danger} />
                            </TouchableOpacity>
                        ) : null}
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default function AdminUsers() {
    const { can } = useAdminPermissions();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ role?: string | string[] }>();
    const roleParam = Array.isArray(params.role) ? params.role[0] : params.role;
    const [users, setUsers] = useState<any[]>([]);
    const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [roleFilter, setRoleFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [form, setForm] = useState<AdminUserFormData>(emptyAdminUserForm());
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        try {
            const [u, docs] = await Promise.all([
                api.getAllUsers(roleFilter === 'all' ? undefined : roleFilter),
                api.getAllUsers('doctor'),
            ]);
            setUsers(u);
            setDoctors(docs.map((d: any) => ({ id: d.id, name: d.name })));
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { if (roleParam) setRoleFilter(roleParam); }, [roleParam]);
    useEffect(() => { setLoading(true); loadData(); }, [roleFilter]);

    const openCreate = () => { setForm(emptyAdminUserForm()); setEditingUserId(null); setModalMode('create'); };
    const closeModal = () => { setModalMode(null); setEditingUserId(null); setForm(emptyAdminUserForm()); };

    const openEdit = async (user: any) => {
        if (isProtectedSuperAdminUser(user)) {
            return Alert.alert('غير مسموح', 'لا يمكن تعديل المدير الرئيسي من هنا');
        }
        try {
            const detail = await api.getAdminUserDetail(user.id);
            setForm(adminUserFormFromUser(detail));
            setEditingUserId(user.id);
            setModalMode('edit');
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'تعذر تحميل البيانات');
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.email) return Alert.alert('تنبيه', 'الاسم والبريد مطلوبان');
        if (form.role === 'secretary' && !form.supervisor_id) return Alert.alert('تنبيه', 'حدد الطبيب المشرف');
        setSaving(true);
        try {
            const payload = adminFormToPayload(form, modalMode!);
            if (modalMode === 'create') await api.createAdminUser(payload);
            else if (editingUserId) await api.updateAdminUser(editingUserId, payload);
            Alert.alert('تم', modalMode === 'create' ? 'تم إنشاء المستخدم' : 'تم حفظ التعديلات');
            closeModal();
            loadData();
        } catch (e: any) { Alert.alert('خطأ', e.message); }
        finally { setSaving(false); }
    };

    const confirm = (title: string, msg: string, onOk: () => void, destructive?: boolean) => {
        Alert.alert(title, msg, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'تأكيد', style: destructive ? 'destructive' : 'default', onPress: onOk },
        ]);
    };

    const filtered = useMemo(() => users.filter(u => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return [u.name, u.email, u.phone, u.city, u.country, u.province, u.id]
            .some((v: string) => v?.toLowerCase?.().includes(q) || v?.includes?.(searchQuery));
    }), [users, searchQuery]);

    const roleFilters = [{ key: 'all', label: 'الكل' }, ...Object.entries(ADMIN_ROLE_META).map(([k, v]) => ({ key: k, label: v.label }))];

    const listHeader = useMemo(() => (
        <>
            <View style={styles.searchBox}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="بحث بالاسم، البريد، المدينة..."
                    placeholderTextColor={ADMIN_THEME.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    textAlign="right"
                />
                <MaterialCommunityIcons name="magnify" size={20} color={ADMIN_THEME.textMuted} />
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={styles.filtersScroll}
            >
                {roleFilters.map(f => (
                    <TouchableOpacity
                        key={f.key}
                        style={[styles.filterChip, roleFilter === f.key && styles.filterActive]}
                        onPress={() => setRoleFilter(f.key)}
                    >
                        <Text style={[styles.filterText, roleFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </>
    ), [searchQuery, roleFilter, roleFilters]);

    const renderUser = useCallback(({ item: u }: { item: any }) => (
        <UserCard
            user={u}
            canEdit={can('users_edit')}
            canVerify={can('users_verify')}
            canToggle={can('users_toggle_active')}
            canFeature={can('users_feature')}
            canDelete={can('users_delete')}
            onEdit={() => openEdit(u)}
            onVerify={() => confirm('توثيق', `توثيق ${u.name}؟`, async () => { await api.verifyUser(u.id); loadData(); })}
            onToggle={() => confirm(u.is_active ? 'تعطيل' : 'تفعيل', `${u.name}؟`, async () => { await api.toggleUserActive(u.id); loadData(); })}
            onFeature={() => confirm('تمييز', `${u.name}؟`, async () => { await api.toggleUserFeatured(u.id); loadData(); })}
            onDelete={() => confirm('تعطيل الحساب', `تعطيل ${u.name}؟`, async () => { await api.deleteUser(u.id); loadData(); }, true)}
        />
    ), [can, confirm, loadData, openEdit]);

    return (
        <AdminShell
            title="المستخدمين"
            subtitle={`${filtered.length} حساب`}
            loading={loading}
            scroll={false}
            headerRight={can('users_create') ? <AdminIconButton icon="plus" onPress={openCreate} variant="primary" /> : undefined}
        >
            <FlatList
                style={{ flex: 1 }}
                data={filtered}
                keyExtractor={u => u.id}
                renderItem={renderUser}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={!loading ? (
                    <AdminEmptyState icon="account-search-outline" title="لا يوجد مستخدمون" subtitle="جرّب تغيير الفلتر أو البحث" />
                ) : null}
                contentContainerStyle={{ paddingBottom: getAdminTabClearance(insets.bottom), flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                refreshControl={(
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadData(); }}
                        tintColor={ADMIN_THEME.accent}
                    />
                )}
            />

            <Modal visible={modalMode !== null} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modal}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
                            <MaterialCommunityIcons name="close" size={22} color={ADMIN_THEME.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{modalMode === 'create' ? 'مستخدم جديد' : 'تعديل المستخدم'}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <ScrollView
                        style={styles.modalScroll}
                        contentContainerStyle={{ paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <AdminUserForm form={form} onChange={setForm} mode={modalMode || 'create'} doctors={doctors} />
                    </ScrollView>
                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="#FFF" /> : (
                                <Text style={styles.saveBtnText}>{modalMode === 'create' ? 'إنشاء الحساب' : 'حفظ التعديلات'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </AdminShell>
    );
}

const styles = StyleSheet.create({
    searchBox: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: ADMIN_THEME.border,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 12,
        gap: 8,
    },
    searchInput: { flex: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: ADMIN_THEME.text },
    filtersScroll: { flexGrow: 0, marginBottom: 4 },
    filters: { flexDirection: 'row-reverse', gap: 8, paddingBottom: 14 },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: ADMIN_THEME.surface, borderWidth: 1, borderColor: ADMIN_THEME.border,
    },
    filterActive: { backgroundColor: ADMIN_THEME.primary, borderColor: ADMIN_THEME.primary },
    filterText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: ADMIN_THEME.textSecondary },
    filterTextActive: { color: '#FFF' },
    userCard: {
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: ADMIN_THEME.borderLight,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
            android: { elevation: 1 },
        }),
    },
    userHeader: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    userMain: { flex: 1, alignItems: 'flex-end' },
    nameRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        width: '100%',
    },
    userName: { fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: ADMIN_THEME.text },
    userId: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 11,
        color: ADMIN_THEME.textMuted,
        backgroundColor: ADMIN_THEME.surfaceMuted,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: ADMIN_THEME.border,
        overflow: 'hidden',
    },
    userEmail: { fontFamily: 'Cairo_500Medium', fontSize: 12, color: ADMIN_THEME.textMuted, marginTop: 2 },
    badgeRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    rolePillText: { fontFamily: 'Cairo_700Bold', fontSize: 10 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    badgeText: { fontFamily: 'Cairo_700Bold', fontSize: 10 },
    metaBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: ADMIN_THEME.borderLight, gap: 6 },
    metaLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    metaText: { fontFamily: 'Cairo_500Medium', fontSize: 12, color: ADMIN_THEME.textSecondary, flex: 1, textAlign: 'right' },
    actions: {
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start',
        gap: 4,
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: ADMIN_THEME.borderLight,
    },
    actionIcon: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: ADMIN_THEME.surfaceMuted,
        justifyContent: 'center', alignItems: 'center',
    },
    protectedNote: {
        flex: 1,
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 11,
        color: ADMIN_THEME.textMuted,
        textAlign: 'right',
    },
    modal: { flex: 1, backgroundColor: ADMIN_THEME.bg },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: ADMIN_THEME.border, alignSelf: 'center', marginTop: 10 },
    modalHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    modalClose: { width: 40, height: 40, borderRadius: 12, backgroundColor: ADMIN_THEME.surface, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: ADMIN_THEME.text },
    modalScroll: { flex: 1, paddingHorizontal: 16 },
    modalFooter: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: ADMIN_THEME.surface, borderTopWidth: 1, borderTopColor: ADMIN_THEME.borderLight },
    saveBtn: { height: 50, borderRadius: 14, backgroundColor: ADMIN_THEME.accent, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#FFF' },
});
