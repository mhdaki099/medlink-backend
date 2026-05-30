import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, RefreshControl, Dimensions, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../src/contexts/AuthContext';
import { api, BASE_URL } from '../../src/services/api';
import BreadcrumbNav from '../../src/components/BreadcrumbNav';

const { width } = Dimensions.get('window');

interface MyDoctor {
    id: string;
    name: string;
    specialization: string;
    photo: string;
    rating: number;
    total_reviews: number;
    appointment_count: number;
    last_visit: string;
    provided_prescriptions: number;
    clinic_name?: string;
    experience_years?: number;
}

export default function MyDoctorsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [myDoctors, setMyDoctors] = useState<MyDoctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadMyDoctors = async () => {
        if (!user?.id) return;
        try {
            const data = await api.getMyDoctors(user.id);
            setMyDoctors(data || []);
        } catch (e) {
            console.warn('Failed to load my doctors:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadMyDoctors();
    }, [user]);

    const getPhotoUrl = (path?: string) => {
        if (!path) return 'https://i.pravatar.cc/300?img=60';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'غير محدد';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const renderDoctorCard = (doctor: MyDoctor, index: number) => (
        <Animated.View
            key={doctor.id}
            entering={FadeInDown.delay(index * 100).springify()}
        >
            <TouchableOpacity
                style={styles.doctorCard}
                activeOpacity={0.9}
                onPress={() => router.push(`/(patient)/doctors/${doctor.id}` as any)}
            >
                <View style={styles.cardHeader}>
                    <Image
                        source={{ uri: getPhotoUrl(doctor.photo) }}
                        style={styles.doctorPhoto}
                    />
                    <View style={styles.doctorInfo}>
                        <Text style={styles.doctorName}>{doctor.name}</Text>
                        <Text style={styles.specialization}>{doctor.specialization}</Text>
                        {doctor.clinic_name && (
                            <Text style={styles.clinicName}>{doctor.clinic_name}</Text>
                        )}
                    </View>
                    <View style={styles.ratingContainer}>
                        <MaterialCommunityIcons name="star" size={16} color="#FFB800" />
                        <Text style={styles.ratingText}>{doctor.rating?.toFixed(1) || '0.0'}</Text>
                        <Text style={styles.reviewsText}>({doctor.total_reviews || 0})</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="calendar-check" size={18} color="#1E88E5" />
                        <Text style={styles.statValue}>{doctor.appointment_count}</Text>
                        <Text style={styles.statLabel}>موعد</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="medical-bag" size={18} color="#43A047" />
                        <Text style={styles.statValue}>{doctor.provided_prescriptions}</Text>
                        <Text style={styles.statLabel}>وصفة</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="clock-outline" size={18} color="#FF9500" />
                        <Text style={styles.statValue}>{formatDate(doctor.last_visit)}</Text>
                        <Text style={styles.statLabel}>آخر زيارة</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.bookAgainBtn}
                        onPress={() => router.push(`/(patient)/doctors/${doctor.id}` as any)}
                    >
                        <MaterialCommunityIcons name="calendar-plus" size={18} color="#FFF" />
                        <Text style={styles.bookAgainText}>حجز موعد</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.prescriptionBtn}
                        onPress={() => router.push('/(patient)/my-prescriptions' as any)}
                    >
                        <MaterialCommunityIcons name="prescription" size={18} color="#43A047" />
                        <Text style={styles.prescriptionText}>الوصفات</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>أطبائي</Text>
                    <View style={{ width: 28 }} />
                </LinearGradient>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1E88E5" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>أطبائي</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <BreadcrumbNav items={[
                { label: 'الرئيسية', route: '/(patient)' },
                { label: 'خدماتي', route: '/(patient)/services' },
                { label: 'أطبائي' }
            ]} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadMyDoctors(); }}
                        colors={['#1E88E5']}
                    />
                }
            >
                {myDoctors.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="doctor" size={80} color="#E2E8F0" />
                        <Text style={styles.emptyTitle}>لا يوجد أطباء</Text>
                        <Text style={styles.emptySubtitle}>
                            سيظهر هنا الأطباء الذين زرت向他们 وحصلت منهم على خدمات طبية
                        </Text>
                        <TouchableOpacity
                            style={styles.findDoctorBtn}
                            onPress={() => router.push('/(patient)/doctors' as any)}
                        >
                            <Text style={styles.findDoctorText}>ابحث عن طبيب</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{myDoctors.length}</Text>
                                <Text style={styles.summaryLabel}>طبيب</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>
                                    {myDoctors.reduce((sum, d) => sum + (d.appointment_count || 0), 0)}
                                </Text>
                                <Text style={styles.summaryLabel}>إجمالي المواعيد</Text>
                            </View>
                        </View>

                        {myDoctors.map((doctor, index) => renderDoctorCard(doctor, index))}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F7FD',
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 20,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 20,
        color: '#FFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    summaryCard: {
        flexDirection: 'row-reverse',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryValue: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 28,
        color: '#1E88E5',
    },
    summaryLabel: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 16,
    },
    doctorCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
    },
    doctorPhoto: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 3,
        borderColor: '#1E88E5',
    },
    doctorInfo: {
        flex: 1,
        marginRight: 12,
        alignItems: 'flex-end',
    },
    doctorName: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 18,
        color: '#1E293B',
    },
    specialization: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 14,
        color: '#1E88E5',
        marginTop: 2,
    },
    clinicName: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    ratingContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 14,
        color: '#1E293B',
    },
    reviewsText: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 11,
        color: '#94A3B8',
    },
    statsRow: {
        flexDirection: 'row-reverse',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 14,
        color: '#1E293B',
    },
    statLabel: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 11,
        color: '#94A3B8',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E2E8F0',
    },
    actionRow: {
        flexDirection: 'row-reverse',
        marginTop: 16,
        gap: 12,
    },
    bookAgainBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#1E88E5',
        paddingVertical: 12,
        borderRadius: 12,
    },
    bookAgainText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 14,
        color: '#FFF',
    },
    prescriptionBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#F0FDF4',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#43A04730',
    },
    prescriptionText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 14,
        color: '#43A047',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 22,
        color: '#1E293B',
        marginTop: 20,
    },
    emptySubtitle: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
    findDoctorBtn: {
        marginTop: 24,
        backgroundColor: '#1E88E5',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    findDoctorText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 15,
        color: '#FFF',
    },
});