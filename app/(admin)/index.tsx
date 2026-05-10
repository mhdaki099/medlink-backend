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
        { label: 'إجمالي المستخدمين', val: dashboard?.total_users || 0, icon: 'account-group', color: PREMIUM_COLORS.primary },
        { label: 'المرضى', val: dashboard?.patients || 0, icon: 'account-heart', color: PREMIUM_COLORS.stats.patients },
        { label: 'الأطباء', val: dashboard?.doctors || 0, icon: 'doctor', color: PREMIUM_COLORS.stats.doctors },
        { label: 'الصيدليات', val: dashboard?.pharmacies || 0, icon: 'pill', color: PREMIUM_COLORS.stats.pharmacies },
        { label: 'المختبرات', val: dashboard?.labs || 0, icon: 'flask', color: PREMIUM_COLORS.stats.labs },
        { label: 'المستودعات', val: dashboard?.warehouses || 0, icon: 'warehouse', color: PREMIUM_COLORS.stats.warehouses },
        { label: 'المواعيد', val: dashboard?.total_appointments || 0, icon: 'calendar-check', color: PREMIUM_COLORS.stats.appointments },
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

                        {/* Quick Stats Grid */}
                        <View style={styles.statsGrid}>
                            {statBoxes.map((stat, i) => {
                                const isClickable = ['المرضى', 'الأطباء', 'الصيدليات', 'المختبرات', 'المستودعات'].includes(stat.label);
                                const roleMap: Record<string, string> = {
                                    'المرضى': 'patient', 'الأطباء': 'doctor', 'الصيدليات': 'pharmacy',
                                    'المختبرات': 'lab', 'المستودعات': 'warehouse'
                                };
                                
                                return (
                                    <TouchableOpacity 
                                        key={i} 
                                        style={styles.statCard}
                                        activeOpacity={isClickable ? 0.7 : 1}
                                        onPress={() => {
                                            if (isClickable) {
                                                const role = roleMap[stat.label];
                                                // @ts-ignore
                                                router.push({ pathname: '/(admin)/users', params: { role } });
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
                        {dashboard?.daily_appointments && (
                            <CustomChart data={dashboard.daily_appointments} />
                        )}

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
        flexDirection: 'row',
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
        flexDirection: 'row',
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
    }
});
