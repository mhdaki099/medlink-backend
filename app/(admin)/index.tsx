import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

const { width } = Dimensions.get('window');

// Premium Color Palette
const PREMIUM_COLORS = {
    primary: '#2563EB',
    secondary: '#10B981',
    gradientStart: '#1E3A8A',
    gradientEnd: '#3B82F6',
    white: '#FFFFFF',
    text: '#1F2937',
    textMuted: '#6B7280',
    background: '#F3F4F6',
    cardLight: 'rgba(255, 255, 255, 0.95)',
    shadow: '#000000',
    stats: {
        patients: '#3B82F6',
        doctors: '#10B981',
        pharmacies: '#F59E0B',
        labs: '#8B5CF6',
        warehouses: '#EC4899',
        appointments: '#6366F1'
    }
};

const CustomChart = ({ data }: { data: Record<string, number> }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    }, [data]);

    const entries = Object.entries(data || {}).slice(-7); // Last 7 days
    if (entries.length === 0) return <Text style={styles.noDataText}>لا توجد بيانات متاحة لعرض المخطط</Text>;

    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    return (
        <Animated.View style={[styles.chartContainer, { opacity: fadeAnim }]}>
            <Text style={styles.chartTitle}>المواعيد في آخر 7 أيام 📊</Text>
            <View style={styles.barsArea}>
                {entries.map(([date, count], index) => {
                    const heightPercent = (count / maxVal) * 100;
                    const dateObj = new Date(date);
                    const dayLabel = dateObj.toLocaleDateString('ar-SY', { weekday: 'short' });

                    return (
                        <View key={index} style={styles.barColumn}>
                            <Text style={styles.barValue}>{count}</Text>
                            <View style={styles.barBackground}>
                                <LinearGradient
                                    colors={[PREMIUM_COLORS.secondary, PREMIUM_COLORS.primary]}
                                    style={[styles.barFill, { height: `${heightPercent}%` }]}
                                    start={{ x: 0, y: 1 }}
                                    end={{ x: 0, y: 0 }}
                                />
                            </View>
                            <Text style={styles.barLabel}>{dayLabel}</Text>
                        </View>
                    );
                })}
            </View>
        </Animated.View>
    );
};


export default function AdminDashboard() {
    const { logout } = useAuth();
    const router = useRouter();
    const [dashboard, setDashboard] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    const loadData = async () => {
        try {
            const d = await api.getAdminDashboard();
            setDashboard(d);

            // Trigger entry animations
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 600, useNativeDriver: true })
            ]).start();

        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const statBoxes = [
        { label: 'إجمالي المستخدمين', val: dashboard?.total_users || 0, icon: 'account-group', color: PREMIUM_COLORS.primary, role: null },
        { label: 'المرضى', val: dashboard?.patients || 0, icon: 'account-heart', color: PREMIUM_COLORS.stats.patients, role: 'patient' },
        { label: 'الأطباء', val: dashboard?.doctors || 0, icon: 'doctor', color: PREMIUM_COLORS.stats.doctors, role: 'doctor' },
        { label: 'الصيدليات', val: dashboard?.pharmacies || 0, icon: 'pill', color: PREMIUM_COLORS.stats.pharmacies, role: 'pharmacy' },
        { label: 'المختبرات', val: dashboard?.labs || 0, icon: 'flask', color: PREMIUM_COLORS.stats.labs, role: 'lab' },
        { label: 'مراكز الأشعة', val: dashboard?.radiology || 0, icon: 'radioactive', color: '#7C3AED', role: 'radiology' },
        { label: 'المستودعات', val: dashboard?.warehouses || 0, icon: 'warehouse', color: PREMIUM_COLORS.stats.warehouses, role: 'warehouse' },
        { label: 'السكرتارية', val: dashboard?.secretaries || 0, icon: 'account-tie', color: '#0EA5E9', role: 'secretary' },
        { label: 'المواعيد', val: dashboard?.total_appointments || 0, icon: 'calendar-check', color: PREMIUM_COLORS.stats.appointments, role: null },
        { label: 'مواعيد اليوم', val: dashboard?.today_appointments || 0, icon: 'calendar-today', color: '#14B8A6', role: null },
        { label: 'طلبات التسجيل', val: dashboard?.pending_registrations || 0, icon: 'account-clock', color: '#F59E0B', role: 'pending' },
        { label: 'الطلبات / الأدوية', val: dashboard?.total_orders || 0, icon: 'cart', color: '#EC4899', role: null },
        { label: 'الوصفات', val: dashboard?.total_prescriptions || 0, icon: 'file-document', color: '#8B5CF6', role: null },
        { label: 'حجوزات الخدمات', val: dashboard?.total_service_bookings || 0, icon: 'clipboard-list', color: '#F97316', role: null },
    ];

    const quickActions = [
        { label: 'إدارة المستخدمين', icon: 'account-cog', route: '/(admin)/users', color: PREMIUM_COLORS.primary },
        { label: 'طلبات جديدة', icon: 'account-plus', route: '/(admin)/new-accounts', color: '#F59E0B', badge: dashboard?.pending_registrations },
        { label: 'سجل النشاط', icon: 'history', route: '/(admin)/logs', color: '#6366F1' },
    ];

    return (
        <View style={styles.root}>
            {/* Header Area with Smooth Curve */}
            <View style={styles.headerWrapper}>
                <LinearGradient
                    colors={[PREMIUM_COLORS.gradientStart, PREMIUM_COLORS.gradientEnd]}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="logout" size={18} color={PREMIUM_COLORS.white} />
                        <Text style={styles.logoutText}>تسجيل خروج</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTitles}>
                        <Text style={styles.headerTitle}>لوحة القيادة</Text>
                        <Text style={styles.headerSubTitle}>الإدارة المركزية | MedLink Syria</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={PREMIUM_COLORS.primary} />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={PREMIUM_COLORS.primary} style={{ marginTop: 100 }} />
                ) : (
                    <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY }] }]}>

                        {/* Platform alerts */}
                        {(dashboard?.pending_registrations > 0 || dashboard?.unverified_users > 0) ? (
                            <View style={styles.alertBanner}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#B45309" />
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    {dashboard?.pending_registrations > 0 ? (
                                        <Text style={styles.alertText}>
                                            {dashboard.pending_registrations} طلب تسجيل بانتظار الموافقة
                                        </Text>
                                    ) : null}
                                    {dashboard?.unverified_users > 0 ? (
                                        <Text style={styles.alertText}>
                                            {dashboard.unverified_users} مستخدم غير موثق
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        ) : null}

                        {/* Quick actions */}
                        <View style={styles.quickActionsRow}>
                            {quickActions.map((action, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={styles.quickActionCard}
                                    onPress={() => router.push(action.route as any)}
                                >
                                    <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
                                        <MaterialCommunityIcons name={action.icon as any} size={22} color={action.color} />
                                        {action.badge > 0 ? (
                                            <View style={styles.quickBadge}>
                                                <Text style={styles.quickBadgeText}>{action.badge}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Quick Stats Grid */}
                        <Text style={styles.sectionTitle}>إحصائيات المنصة</Text>
                        <View style={styles.statsGrid}>
                            {statBoxes.map((stat, i) => {
                                const isClickable = !!stat.role;
                                return (
                                    <TouchableOpacity 
                                        key={i} 
                                        style={styles.statCard}
                                        activeOpacity={isClickable ? 0.7 : 1}
                                        onPress={() => {
                                            if (stat.role === 'pending') {
                                                router.push('/(admin)/new-accounts' as any);
                                            } else if (stat.role) {
                                                router.push({ pathname: '/(admin)/users', params: { role: stat.role } } as any);
                                            }
                                        }}
                                    >
                                        <View style={[styles.iconBox, { backgroundColor: stat.color + '15' }]}>
                                            <MaterialCommunityIcons name={stat.icon as any} size={28} color={stat.color} />
                                        </View>
                                        <Text style={styles.statValue}>{stat.val}</Text>
                                        <Text style={styles.statLabel}>{stat.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Chart Area */}
                        {dashboard?.daily_appointments ? (
                            <CustomChart data={dashboard.daily_appointments} />
                        ) : null}

                        {/* Platform summary */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>ملخص المنصة</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryVal}>{dashboard?.total_medical_records || 0}</Text>
                                <Text style={styles.summaryLabel}>سجلات طبية</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryVal}>{dashboard?.inactive_users || 0}</Text>
                                <Text style={styles.summaryLabel}>حسابات معطلة</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryVal}>{dashboard?.admins || 0}</Text>
                                <Text style={styles.summaryLabel}>مدراء النظام</Text>
                            </View>
                        </View>

                        {/* Recent Activity Log */}
                        {dashboard?.recent_activity?.length > 0 && (
                            <View style={styles.activitySection}>
                                <Text style={styles.sectionTitle}>أحدث النشاطات ⚡</Text>
                                {dashboard.recent_activity.slice(0, 6).map((log: any, i: number) => (
                                    <View key={i} style={styles.activityCard}>
                                        <View style={styles.activityLeft}>
                                            <MaterialCommunityIcons name="history" size={20} color={PREMIUM_COLORS.textMuted} />
                                            <Text style={styles.activityTime}>{new Date(log.timestamp).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</Text>
                                        </View>
                                        <View style={styles.activityRight}>
                                            <Text style={styles.activityAction}>{log.action}</Text>
                                            <Text style={styles.activityUser}>المستخدم: {log.user_id}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </Animated.View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: PREMIUM_COLORS.background,
    },
    headerWrapper: {
        height: 180,
        width: '100%',
        position: 'relative',
        zIndex: 1,
    },
    headerGradient: {
        ...StyleSheet.absoluteFillObject,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        transform: [{ scaleX: 1.05 }],
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    logoutText: {
        color: PREMIUM_COLORS.white,
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 13,
        marginLeft: 4,
    },
    headerTitles: {
        alignItems: 'flex-end',
    },
    headerTitle: {
        color: PREMIUM_COLORS.white,
        fontFamily: 'Cairo_800ExtraBold',
        fontSize: 26,
    },
    headerSubTitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontFamily: 'Cairo_400Regular',
        fontSize: 13,
    },
    scrollContainer: {
        flex: 1,
        marginTop: -60, // Overlap the header
        zIndex: 10,
    },
    content: {
        paddingHorizontal: 16,
    },
    statsGrid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        width: (width - 44) / 2, // 2 columns exactly
        backgroundColor: PREMIUM_COLORS.cardLight,
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        shadowColor: PREMIUM_COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    statValue: {
        fontFamily: 'Cairo_800ExtraBold',
        fontSize: 24,
        color: PREMIUM_COLORS.text,
    },
    statLabel: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 12,
        color: PREMIUM_COLORS.textMuted,
        textAlign: 'center',
        marginTop: 4,
    },
    chartContainer: {
        backgroundColor: PREMIUM_COLORS.cardLight,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: PREMIUM_COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    chartTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 16,
        color: PREMIUM_COLORS.text,
        textAlign: 'right',
        marginBottom: 20,
    },
    noDataText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 14,
        color: PREMIUM_COLORS.textMuted,
        textAlign: 'center',
        marginVertical: 40,
    },
    barsArea: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 150,
        paddingHorizontal: 10,
    },
    barColumn: {
        alignItems: 'center',
        width: 30,
    },
    barValue: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 10,
        color: PREMIUM_COLORS.textMuted,
        marginBottom: 4,
    },
    barBackground: {
        width: 14,
        height: 100,
        backgroundColor: '#E5E7EB',
        borderRadius: 7,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    barFill: {
        width: '100%',
        borderRadius: 7,
    },
    barLabel: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 10,
        color: PREMIUM_COLORS.textMuted,
        marginTop: 6,
    },
    activitySection: {
        marginTop: 10,
    },
    sectionTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 18,
        color: PREMIUM_COLORS.text,
        textAlign: 'right',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    activityCard: {
        backgroundColor: PREMIUM_COLORS.cardLight,
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: PREMIUM_COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    activityLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityTime: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 12,
        color: PREMIUM_COLORS.textMuted,
        marginLeft: 6,
    },
    activityRight: {
        alignItems: 'flex-end',
    },
    activityAction: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 14,
        color: PREMIUM_COLORS.text,
    },
    activityUser: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 11,
        color: PREMIUM_COLORS.primary,
        marginTop: 2,
    },
    alertBanner: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
    },
    alertText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 13,
        color: '#92400E',
        textAlign: 'right',
    },
    quickActionsRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 18,
    },
    quickActionCard: {
        flex: 1,
        backgroundColor: PREMIUM_COLORS.cardLight,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        elevation: 2,
    },
    quickActionIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        position: 'relative',
    },
    quickBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    quickBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Cairo_700Bold' },
    quickActionLabel: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 11,
        color: PREMIUM_COLORS.text,
        textAlign: 'center',
    },
    summaryCard: {
        backgroundColor: PREMIUM_COLORS.cardLight,
        borderRadius: 20,
        padding: 18,
        marginBottom: 20,
        elevation: 2,
    },
    summaryTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 16,
        color: PREMIUM_COLORS.text,
        textAlign: 'right',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    summaryLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: PREMIUM_COLORS.textMuted },
    summaryVal: { fontFamily: 'Cairo_800ExtraBold', fontSize: 16, color: PREMIUM_COLORS.primary },
});
