import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, TextInput,
    Modal, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import AdminShell, { AdminEmptyState, AdminIconButton } from '../../src/components/admin/AdminShell';
import AdminPermissionsEditor from '../../src/components/AdminPermissionsEditor';
import { ADMIN_THEME } from '../../src/constants/adminTheme';
import {
    AdminPermissions,
    buildAllAdminPermissions,
    normalizeAdminPermissions,
    countEnabledAdminPermissions,
} from '../../src/constants/adminPermissions';
import { useAdminPermissions } from '../../src/hooks/useAdminPermissions';
import { useRouter } from 'expo-router';

type SubAdminForm = {
    name: string;
    email: string;
    password: string;
    phone: string;
    permissions: AdminPermissions;
};

const emptyForm = (): SubAdminForm => ({
    name: '', email: '', password: '', phone: '',
    permissions: buildAllAdminPermissions(false),
});

export default function SubAdminsScreen() {
    const router = useRouter();
    const { isSuperAdmin } = useAdminPermissions();
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<SubAdminForm>(emptyForm());
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        try {
            setAdmins(await api.getSubAdmins());
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'تعذر تحميل المدراء');
        } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => {
        if (!isSuperAdmin) {
            router.replace('/(admin)');
            return;
        }
        loadData();
    }, [isSuperAdmin]);

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm());
        setModalVisible(true);
    };

    const openEdit = (admin: any) => {
        setEditingId(admin.id);
        setForm({
            name: admin.name || '',
            email: admin.email || '',
            password: '',
            phone: admin.phone || '',
            permissions: normalizeAdminPermissions(admin.admin_permissions, false),
        });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name || !form.email) return Alert.alert('تنبيه', 'الاسم والبريد مطلوبان');
        if (countEnabledAdminPermissions(form.permissions) === 0) {
            return Alert.alert('تنبيه', 'حدد صلاحية واحدة على الأقل');
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                email: form.email,
                phone: form.phone,
                password: form.password || undefined,
                permissions: form.permissions,
            };
            if (editingId) await api.updateSubAdmin(editingId, payload);
            else await api.createSubAdmin(payload);
            Alert.alert('تم', editingId ? 'تم تحديث المدير' : 'تم إنشاء المدير الفرعي');
            setModalVisible(false);
            loadData();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally { setSaving(false); }
    };

    const handleDeactivate = (admin: any) => {
        Alert.alert('تعطيل المدير', `تعطيل ${admin.name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'تعطيل', style: 'destructive', onPress: async () => {
                try { await api.deleteSubAdmin(admin.id); loadData(); }
                catch (e: any) { Alert.alert('خطأ', e.message); }
            }},
        ]);
    };

    if (!isSuperAdmin) return null;

    return (
        <AdminShell
            title="المدراء الفرعيون"
            subtitle="إنشاء مدراء بصلاحيات محددة"
            loading={loading}
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            headerRight={<AdminIconButton icon="plus" onPress={openCreate} variant="primary" />}
        >
            <View style={styles.superBanner}>
                <MaterialCommunityIcons name="shield-crown" size={22} color="#F59E0B" />
                <Text style={styles.superText}>أنت المدير الرئيسي — يمكنك إنشاء مدراء فرعيين بصلاحيات مخصصة</Text>
            </View>

            {admins.length === 0 ? (
                <AdminEmptyState
                    icon="shield-account-outline"
                    title="لا يوجد مدراء فرعيون"
                    subtitle="أنشئ مديراً فرعياً وحدد صلاحياته"
                />
            ) : (
                admins.map(admin => (
                    <View key={admin.id} style={styles.card}>
                        <View style={styles.cardTop}>
                            <View style={styles.cardActions}>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(admin)}>
                                    <MaterialCommunityIcons name="pencil-outline" size={18} color={ADMIN_THEME.accent} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeactivate(admin)}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color={ADMIN_THEME.danger} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.name}>{admin.name}</Text>
                                <Text style={styles.email}>{admin.email}</Text>
                                <Text style={styles.idBadge}>{admin.id}</Text>
                            </View>
                        </View>
                        <Text style={styles.permCount}>
                            {countEnabledAdminPermissions(normalizeAdminPermissions(admin.admin_permissions, false))} صلاحية مفعّلة
                        </Text>
                        {!admin.is_active ? (
                            <Text style={styles.inactive}>معطل</Text>
                        ) : null}
                    </View>
                ))
            )}

            <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
                <View style={styles.modal}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <MaterialCommunityIcons name="close" size={22} color={ADMIN_THEME.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>{editingId ? 'تعديل مدير فرعي' : 'مدير فرعي جديد'}</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                        <Text style={styles.label}>الاسم *</Text>
                        <TextInput style={styles.input} value={form.name} onChangeText={t => setForm({ ...form, name: t })} textAlign="right" />
                        <Text style={styles.label}>البريد *</Text>
                        <TextInput style={styles.input} value={form.email} onChangeText={t => setForm({ ...form, email: t })} keyboardType="email-address" autoCapitalize="none" textAlign="right" />
                        <Text style={styles.label}>{editingId ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور (افتراضي 123456)'}</Text>
                        <TextInput style={styles.input} value={form.password} onChangeText={t => setForm({ ...form, password: t })} secureTextEntry textAlign="right" />
                        <Text style={styles.label}>الهاتف</Text>
                        <TextInput style={styles.input} value={form.phone} onChangeText={t => setForm({ ...form, phone: t })} keyboardType="phone-pad" textAlign="right" />
                        <Text style={styles.sectionTitle}>الصلاحيات</Text>
                        <AdminPermissionsEditor
                            permissions={form.permissions}
                            onChange={permissions => setForm({ ...form, permissions })}
                        />
                    </ScrollView>
                    <View style={styles.footer}>
                        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="#FFF" /> : (
                                <Text style={styles.saveBtnText}>{editingId ? 'حفظ' : 'إنشاء المدير'}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </AdminShell>
    );
}

const styles = StyleSheet.create({
    superBanner: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
        backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, marginBottom: 16,
        borderWidth: 1, borderColor: '#FDE68A',
    },
    superText: { flex: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: '#92400E', textAlign: 'right' },
    card: {
        backgroundColor: ADMIN_THEME.surface, borderRadius: 16, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: ADMIN_THEME.borderLight,
    },
    cardTop: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
    cardActions: { flexDirection: 'row', gap: 6 },
    iconBtn: {
        width: 38, height: 38, borderRadius: 10, backgroundColor: ADMIN_THEME.surfaceMuted,
        justifyContent: 'center', alignItems: 'center',
    },
    name: { fontFamily: 'Cairo_800ExtraBold', fontSize: 15, color: ADMIN_THEME.text },
    email: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: ADMIN_THEME.textMuted, marginTop: 2 },
    idBadge: {
        fontFamily: 'Cairo_600SemiBold', fontSize: 10, color: ADMIN_THEME.textMuted,
        marginTop: 6, backgroundColor: ADMIN_THEME.surfaceMuted, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
    },
    permCount: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: ADMIN_THEME.accent, textAlign: 'right', marginTop: 10 },
    inactive: { fontFamily: 'Cairo_700Bold', fontSize: 11, color: ADMIN_THEME.danger, textAlign: 'right', marginTop: 4 },
    modal: { flex: 1, backgroundColor: ADMIN_THEME.bg },
    modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    modalTitle: { fontFamily: 'Cairo_800ExtraBold', fontSize: 18, color: ADMIN_THEME.text },
    label: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: ADMIN_THEME.textSecondary, textAlign: 'right', marginBottom: 6, marginTop: 8 },
    input: {
        backgroundColor: ADMIN_THEME.surface, borderRadius: 12, borderWidth: 1, borderColor: ADMIN_THEME.border,
        height: 46, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14, color: ADMIN_THEME.text, marginBottom: 4,
    },
    sectionTitle: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: ADMIN_THEME.text, textAlign: 'right', marginTop: 16, marginBottom: 8 },
    footer: { padding: 16, paddingBottom: Platform.OS === 'ios' ? 28 : 16, backgroundColor: ADMIN_THEME.surface, borderTopWidth: 1, borderColor: ADMIN_THEME.borderLight },
    saveBtn: { height: 50, borderRadius: 14, backgroundColor: ADMIN_THEME.accent, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#FFF' },
});
