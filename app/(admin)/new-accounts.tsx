import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, Image, Linking, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../src/services/api';
import AdminShell, { AdminEmptyState } from '../../src/components/admin/AdminShell';
import { ADMIN_THEME, ADMIN_ROLE_META } from '../../src/constants/adminTheme';

export default function NewAccounts() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const all = await api.getRegistrationRequests();
            setRequests(all.filter((r: any) => r.status === 'pending'));
        } catch {
            Alert.alert('خطأ', 'تعذر تحميل الطلبات');
        } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { loadData(); }, []);

    const getFullUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace('/api', '')}${path}`;
    };

    const handleApprove = (id: string, name: string) => {
        Alert.alert('موافقة', `تفعيل حساب ${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'موافقة', onPress: async () => {
                try { await api.approveRegistration(id); Alert.alert('تم', 'تم تفعيل الحساب'); loadData(); }
                catch (e: any) { Alert.alert('خطأ', e.message); }
            }},
        ]);
    };

    const handleReject = (id: string, name: string) => {
        Alert.alert('رفض', `رفض طلب ${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'رفض', style: 'destructive', onPress: async () => {
                try { await api.rejectRegistration(id); loadData(); }
                catch (e: any) { Alert.alert('خطأ', e.message); }
            }},
        ]);
    };

    return (
        <AdminShell
            title="طلبات التسجيل"
            subtitle="مراجعة طلبات انضمام مقدمي الخدمة"
            loading={loading}
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
        >
            {!loading && requests.length === 0 ? (
                <AdminEmptyState icon="check-circle-outline" title="لا توجد طلبات معلقة" subtitle="جميع الطلبات تمت مراجعتها" />
            ) : (
                requests.map(r => {
                    const fullName = `${r.data?.first_name || ''} ${r.data?.last_name || ''}`.trim() || r.email;
                    const meta = ADMIN_ROLE_META[r.role] || { label: r.role, icon: 'account', color: ADMIN_THEME.accent };
                    const photoUrl = getFullUrl(r.data?.photo);
                    const location = [r.data?.country || 'سوريا', r.data?.province, r.data?.city].filter(Boolean).join(' · ');

                    return (
                        <View key={r.id} style={styles.card}>
                            <View style={styles.cardTop}>
                                {photoUrl ? (
                                    <Image source={{ uri: photoUrl }} style={styles.photo} />
                                ) : (
                                    <View style={[styles.photo, styles.photoPlaceholder]}>
                                        <MaterialCommunityIcons name={meta.icon as any} size={32} color={meta.color} />
                                    </View>
                                )}
                                <View style={styles.cardInfo}>
                                    <Text style={styles.name}>{fullName}</Text>
                                    <Text style={styles.email}>{r.email}</Text>
                                    <View style={[styles.roleTag, { backgroundColor: meta.color + '15' }]}>
                                        <Text style={[styles.roleTagText, { color: meta.color }]}>{meta.label}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.details}>
                                {r.data?.phone ? <DetailLine icon="phone-outline" text={r.data.phone} /> : null}
                                {location ? <DetailLine icon="map-marker-outline" text={location} /> : null}
                                {r.data?.clinic_name ? <DetailLine icon="hospital-building" text={r.data.clinic_name} /> : null}
                                {r.data?.clinic_address ? <DetailLine icon="home-outline" text={r.data.clinic_address} /> : null}
                                {r.data?.price_per_session ? <DetailLine icon="cash" text={`${r.data.price_per_session} ل.س / جلسة`} highlight /> : null}
                                {r.data?.license_no ? <DetailLine icon="card-account-details-outline" text={r.data.license_no} /> : null}
                            </View>

                            {r.data?.documents?.length > 0 ? (
                                <View style={styles.docs}>
                                    <Text style={styles.docsTitle}>المرفقات</Text>
                                    <View style={styles.docsRow}>
                                        {r.data.documents.map((doc: string, idx: number) => (
                                            <TouchableOpacity key={idx} style={styles.docBtn} onPress={() => Linking.openURL(getFullUrl(doc))}>
                                                <MaterialCommunityIcons name="file-document-outline" size={16} color={ADMIN_THEME.accent} />
                                                <Text style={styles.docBtnText}>ملف {idx + 1}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ) : null}

                            <View style={styles.actions}>
                                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(r.id, fullName)}>
                                    <Text style={styles.rejectText}>رفض</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(r.id, fullName)}>
                                    <LinearGradient colors={[ADMIN_THEME.success, '#047857']} style={styles.approveGrad}>
                                        <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                                        <Text style={styles.approveText}>قبول وتفعيل</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })
            )}
        </AdminShell>
    );
}

function DetailLine({ icon, text, highlight }: { icon: string; text: string; highlight?: boolean }) {
    return (
        <View style={styles.detailLine}>
            <Text style={[styles.detailText, highlight && { color: ADMIN_THEME.success, fontFamily: 'Cairo_700Bold' }]}>{text}</Text>
            <MaterialCommunityIcons name={icon as any} size={15} color={highlight ? ADMIN_THEME.success : ADMIN_THEME.textMuted} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: ADMIN_THEME.borderLight,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
            android: { elevation: 2 },
        }),
    },
    cardTop: { flexDirection: 'row-reverse', gap: 14, marginBottom: 14 },
    photo: { width: 72, height: 88, borderRadius: 12, backgroundColor: ADMIN_THEME.surfaceMuted },
    photoPlaceholder: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: ADMIN_THEME.border },
    cardInfo: { flex: 1, alignItems: 'flex-end' },
    name: { fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: ADMIN_THEME.text },
    email: { fontFamily: 'Cairo_500Medium', fontSize: 12, color: ADMIN_THEME.textMuted, marginTop: 2 },
    roleTag: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    roleTagText: { fontFamily: 'Cairo_700Bold', fontSize: 11 },
    details: { backgroundColor: ADMIN_THEME.surfaceMuted, borderRadius: 12, padding: 12, gap: 8, marginBottom: 12 },
    detailLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    detailText: { flex: 1, fontFamily: 'Cairo_500Medium', fontSize: 12, color: ADMIN_THEME.textSecondary, textAlign: 'right' },
    docs: { marginBottom: 14 },
    docsTitle: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: ADMIN_THEME.textSecondary, textAlign: 'right', marginBottom: 8 },
    docsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    docBtn: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        backgroundColor: ADMIN_THEME.infoBg, borderWidth: 1, borderColor: ADMIN_THEME.border,
    },
    docBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, color: ADMIN_THEME.accent },
    actions: { flexDirection: 'row-reverse', gap: 10 },
    rejectBtn: {
        flex: 1, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: ADMIN_THEME.danger + '40', backgroundColor: ADMIN_THEME.dangerBg,
    },
    rejectText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: ADMIN_THEME.danger },
    approveBtn: { flex: 2, height: 46, borderRadius: 12, overflow: 'hidden' },
    approveGrad: { flex: 1, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 6 },
    approveText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#FFF' },
});
