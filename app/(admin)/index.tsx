import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import AdminShell, { AdminCard, AdminSectionTitle, AdminIconButton } from '../../src/components/admin/AdminShell';
import { ADMIN_THEME } from '../../src/constants/adminTheme';
import { useAdminPermissions } from '../../src/hooks/useAdminPermissions';

const { width } = Dimensions.get('window');
const STAT_W = (width - 48) / 2;

function StatTile({
    label, value, icon, color, onPress,
}: { label: string; value: number; icon: string; color: string; onPress?: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.statTile, { width: STAT_W }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.75 : 1}
            disabled={!onPress}
        >
            <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
                <MaterialCommunityIcons name={icon as any} size={22} color={color} />
            </View>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function ChartBlock({ data }: { data: Record<string, number> }) {
    const entries = Object.entries(data || {}).slice(-7);
    if (!entries.length) return null;
    const max = Math.max(...entries.map(([, v]) => v), 1);

    return (
        <AdminCard>
            <AdminSectionTitle title="المواعيد — آخر 7 أيام" />
            <View style={styles.chartRow}>
                {entries.map(([date, count]) => {
                    const h = Math.max((count / max) * 72, 4);
                    const day = new Date(date).toLocaleDateString('ar-SY', { weekday: 'narrow' });
                    return (
                        <View key={date} style={styles.barWrap}>
                            <Text style={styles.barCount}>{count}</Text>
                            <View style={styles.barTrack}>
                                <LinearGradient
                                    colors={[ADMIN_THEME.accent, ADMIN_THEME.primary]}
                                    style={[styles.barFill, { height: h }]}
                                />
                            </View>
                            <Text style={styles.barDay}>{day}</Text>
                        </View>
                    );
                })}
            </View>
        </AdminCard>
    );
}

export default function AdminDashboard() {
    const { logout, user } = useAuth();
    const { can, isSuperAdmin } = useAdminPermissions();
    const router = useRouter();
    const [dashboard, setDashboard] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            setDashboard(await api.getAdminDashboard());
        } catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { loadData(); }, []);

    const goUsers = (role?: string) => {
        if (role) {
            router.push({ pathname: '/(admin)/users', params: { role } } as any);
        } else {
            router.push('/(admin)/users' as any);
        }
    };

    const goHomepage = (tab?: string) => {
        if (tab) {
            router.push({ pathname: '/(admin)/homepage', params: { tab } } as any);
        } else {
            router.push('/(admin)/homepage' as any);
        }
    };

    const quickLinks = [
        can('users_feature') ? { label: 'الصفحة الرئيسية', icon: 'home-star', color: '#F59E0B', route: '/(admin)/homepage' } : null,
        can('users_view') ? { label: 'المستخدمين', icon: 'account-cog', color: ADMIN_THEME.accent, route: '/(admin)/users' } : null,
        can('registrations_view') ? { label: 'طلبات التسجيل', icon: 'account-plus', color: ADMIN_THEME.warning, route: '/(admin)/new-accounts', badge: dashboard?.pending_registrations } : null,
        isSuperAdmin ? { label: 'المدراء الفرعيون', icon: 'shield-account', color: '#F59E0B', route: '/(admin)/sub-admins' } : null,
        can('logs_view') ? { label: 'سجل النشاط', icon: 'history', color: ADMIN_THEME.info, route: '/(admin)/logs' } : null,
    ].filter(Boolean) as { label: string; icon: string; color: string; route: string; badge?: number }[];

    return (
        <AdminShell
            title="لوحة الإدارة"
            subtitle={isSuperAdmin ? 'المدير الرئيسي · MedLink' : `${user?.name || 'مدير'} · MedLink`}
            loading={loading}
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(); }}
            headerLeft={
                <AdminIconButton icon="logout" label="خروج" onPress={logout} variant="ghost" />
            }
        >
            {(dashboard?.pending_registrations > 0 || dashboard?.unverified_users > 0) ? (
                <TouchableOpacity
                    style={styles.alert}
                    onPress={() => router.push('/(admin)/new-accounts' as any)}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons name="bell-ring-outline" size={22} color={ADMIN_THEME.warning} />
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        {dashboard.pending_registrations > 0 ? (
                            <Text style={styles.alertText}>{dashboard.pending_registrations} طلب بانتظار الموافقة</Text>
                        ) : null}
                        {dashboard.unverified_users > 0 ? (
                            <Text style={styles.alertSub}>{dashboard.unverified_users} حساب غير موثق</Text>
                        ) : null}
                    </View>
                    <MaterialCommunityIcons name="chevron-left" size={20} color={ADMIN_THEME.warning} />
                </TouchableOpacity>
            ) : null}

            <View style={styles.quickRow}>
                {quickLinks.map(link => (
                    <TouchableOpacity
                        key={link.label}
                        style={styles.quickCard}
                        onPress={() => router.push(link.route as any)}
                    >
                        <View style={[styles.quickIcon, { backgroundColor: link.color + '15' }]}>
                            <MaterialCommunityIcons name={link.icon as any} size={24} color={link.color} />
                            {link.badge > 0 ? (
                                <View style={styles.quickBadge}><Text style={styles.quickBadgeText}>{link.badge}</Text></View>
                            ) : null}
                        </View>
                        <Text style={styles.quickLabel}>{link.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <AdminSectionTitle title="نظرة عامة" />
            <View style={styles.statGrid}>
                <StatTile label="إجمالي المستخدمين" value={dashboard?.total_users || 0} icon="account-group" color={ADMIN_THEME.primary} onPress={() => goUsers()} />
                <StatTile label="مواعيد اليوم" value={dashboard?.today_appointments || 0} icon="calendar-today" color="#14B8A6" />
                <StatTile label="إجمالي المواعيد" value={dashboard?.total_appointments || 0} icon="calendar-check" color={ADMIN_THEME.info} />
                <StatTile label="طلبات معلقة" value={dashboard?.pending_registrations || 0} icon="clock-alert-outline" color={ADMIN_THEME.warning} onPress={() => router.push('/(admin)/new-accounts' as any)} />
            </View>

            <AdminSectionTitle title="المستخدمون حسب الدور" />
            <View style={styles.statGrid}>
                <StatTile label="المرضى" value={dashboard?.patients || 0} icon="account-heart" color="#3B82F6" onPress={() => goUsers('patient')} />
                <StatTile label="الأطباء" value={dashboard?.doctors || 0} icon="stethoscope" color="#059669" onPress={() => can('users_feature') ? goHomepage('doctor') : goUsers('doctor')} />
                <StatTile label="الصيدليات" value={dashboard?.pharmacies || 0} icon="pill" color="#D97706" onPress={() => can('users_feature') ? goHomepage('pharmacy') : goUsers('pharmacy')} />
                <StatTile label="المختبرات" value={dashboard?.labs || 0} icon="flask" color="#8B5CF6" onPress={() => can('users_feature') ? goHomepage('lab') : goUsers('lab')} />
                <StatTile label="مراكز الأشعة" value={dashboard?.radiology || 0} icon="radioactive" color="#7C3AED" onPress={() => can('users_feature') ? goHomepage('radiology') : goUsers('radiology')} />
                <StatTile label="المستودعات" value={dashboard?.warehouses || 0} icon="warehouse" color="#EC4899" onPress={() => goUsers('warehouse')} />
                <StatTile label="السكرتارية" value={dashboard?.secretaries || 0} icon="account-tie" color="#0EA5E9" onPress={() => goUsers('secretary')} />
                <StatTile label="المدراء" value={dashboard?.admins || 0} icon="shield-account" color={ADMIN_THEME.primaryDark} onPress={() => goUsers('admin')} />
            </View>

            <AdminSectionTitle title="عمليات المنصة" />
            <View style={styles.statGrid}>
                <StatTile label="طلبات الأدوية" value={dashboard?.total_orders || 0} icon="cart-outline" color="#EC4899" />
                <StatTile label="الوصفات" value={dashboard?.total_prescriptions || 0} icon="file-document-outline" color="#8B5CF6" />
                <StatTile label="حجوزات الخدمات" value={dashboard?.total_service_bookings || 0} icon="clipboard-list-outline" color="#F97316" />
                <StatTile label="سجلات طبية" value={dashboard?.total_medical_records || 0} icon="folder-account-outline" color={ADMIN_THEME.accent} />
            </View>

            {dashboard?.daily_appointments ? <ChartBlock data={dashboard.daily_appointments} /> : null}

            {dashboard?.recent_activity?.length > 0 ? (
                <AdminCard>
                    <AdminSectionTitle
                        title="آخر النشاطات"
                        action={
                            <TouchableOpacity onPress={() => router.push('/(admin)/logs' as any)}>
                                <Text style={styles.linkText}>عرض الكل</Text>
                            </TouchableOpacity>
                        }
                    />
                    {dashboard.recent_activity.slice(0, 5).map((log: any, i: number) => (
                        <View key={i} style={[styles.activityRow, i > 0 && styles.activityBorder]}>
                            <Text style={styles.activityTime}>
                                {new Date(log.timestamp).toLocaleString('ar-SY', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                            </Text>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.activityAction}>{log.action}</Text>
                                <Text style={styles.activityUser}>{log.user_id}</Text>
                            </View>
                        </View>
                    ))}
                </AdminCard>
            ) : null}

            <AdminCard>
                <AdminSectionTitle title="صحة النظام" />
                <View style={styles.healthRow}>
                    <Text style={styles.healthVal}>{dashboard?.inactive_users || 0}</Text>
                    <Text style={styles.healthLabel}>حسابات معطلة</Text>
                </View>
                <View style={styles.healthRow}>
                    <Text style={styles.healthVal}>{dashboard?.unverified_users || 0}</Text>
                    <Text style={styles.healthLabel}>حسابات غير موثقة</Text>
                </View>
            </AdminCard>
        </AdminShell>
    );
}

const styles = StyleSheet.create({
    alert: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: ADMIN_THEME.warningBg,
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    alertText: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#92400E', textAlign: 'right' },
    alertSub: { fontFamily: 'Cairo_500Medium', fontSize: 12, color: '#B45309', textAlign: 'right', marginTop: 2 },
    quickRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 8 },
    quickCard: {
        flex: 1,
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 14,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: ADMIN_THEME.borderLight,
    },
    quickIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8, position: 'relative' },
    quickBadge: {
        position: 'absolute', top: -4, left: -4,
        backgroundColor: ADMIN_THEME.danger, borderRadius: 9,
        minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center',
    },
    quickBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Cairo_700Bold' },
    quickLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, color: ADMIN_THEME.textSecondary, textAlign: 'center' },
    statGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
    statTile: {
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: ADMIN_THEME.borderLight,
    },
    statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    statValue: { fontFamily: 'Cairo_800ExtraBold', fontSize: 22, color: ADMIN_THEME.text },
    statLabel: { fontFamily: 'Cairo_500Medium', fontSize: 11, color: ADMIN_THEME.textMuted, textAlign: 'center', marginTop: 2 },
    chartRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end', height: 110, paddingTop: 8 },
    barWrap: { alignItems: 'center', flex: 1 },
    barCount: { fontFamily: 'Cairo_600SemiBold', fontSize: 10, color: ADMIN_THEME.textMuted, marginBottom: 4 },
    barTrack: { width: 12, height: 72, backgroundColor: ADMIN_THEME.borderLight, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill: { width: '100%', borderRadius: 6 },
    barDay: { fontFamily: 'Cairo_400Regular', fontSize: 10, color: ADMIN_THEME.textMuted, marginTop: 6 },
    linkText: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: ADMIN_THEME.accent },
    activityRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10, gap: 12 },
    activityBorder: { borderTopWidth: 1, borderTopColor: ADMIN_THEME.borderLight },
    activityAction: { fontFamily: 'Cairo_700Bold', fontSize: 13, color: ADMIN_THEME.text, textAlign: 'right' },
    activityUser: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: ADMIN_THEME.textMuted, textAlign: 'right', marginTop: 2 },
    activityTime: { fontFamily: 'Cairo_500Medium', fontSize: 11, color: ADMIN_THEME.textMuted, minWidth: 72 },
    healthRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: ADMIN_THEME.borderLight },
    healthLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: ADMIN_THEME.textSecondary },
    healthVal: { fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: ADMIN_THEME.primary },
});
