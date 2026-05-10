import React, { useEffect, useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    Image, ActivityIndicator, RefreshControl, Dimensions, 
    Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function SecretaryDashboard() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        const docId = user?.supervisor_id;
        if (!docId) {
            setLoading(false);
            return;
        }
        try {
            const apts = await api.getAppointments({ doctor_id: docId });
            setAppointments(apts);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, [user]);

    const activeApts = appointments.filter(a => a.status === 'confirmed').length;
    const pendingApts = appointments.filter(a => a.status === 'pending').length;

    if (loading) return (
        <View style={styles.loading}>
            <ActivityIndicator size="large" color="#1E88E5" />
        </View>
    );

    return (
        <ScrollView 
            style={styles.container} 
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
            {/* Header */}
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={logout} style={styles.iconBtn}>
                        <Ionicons name="log-out-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Animated.View entering={ZoomIn} style={styles.logoContainer}>
                        <Image source={require('../../assets/Logo Design.png')} style={styles.logo} resizeMode="contain" />
                    </Animated.View>
                </View>

                <View style={styles.headerBottom}>
                    <View style={styles.welcomeText}>
                        <Text style={styles.welcomeSub}>سكرتارية العيادة</Text>
                        <Text style={styles.welcomeMain}>{user?.name}</Text>
                    </View>
                    <View style={styles.avatarPlaceholder}>
                         <Ionicons name="person" size={30} color="#1E88E5" />
                    </View>
                </View>
            </LinearGradient>

            {/* Stats */}
            <View style={styles.statsGrid}>
                <Animated.View entering={FadeInUp.delay(200)} style={[styles.statItem, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={styles.statVal}>{activeApts + pendingApts}</Text>
                    <Text style={styles.statLabel}>إجمالي المواعيد</Text>
                </Animated.View>
                <Animated.View entering={FadeInUp.delay(400)} style={[styles.statItem, { backgroundColor: '#F0FDF4' }]}>
                    <Text style={styles.statVal}>{pendingApts}</Text>
                    <Text style={styles.statLabel}>بانتظار التأكيد</Text>
                </Animated.View>
            </View>

            {/* Today's Schedule */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <TouchableOpacity onPress={() => router.push('/(secretary)/appointments')}>
                        <Text style={styles.viewAll}>عرض الكل</Text>
                    </TouchableOpacity>
                    <Text style={styles.sectionTitle}>مواعيد اليوم</Text>
                </View>

                {appointments.length === 0 ? (
                    <View style={styles.emptyApts}>
                        <MaterialCommunityIcons name="calendar-blank" size={40} color="#CBD5E1" />
                        <Text style={styles.emptyText}>لا يوجد مواعيد مقررة</Text>
                    </View>
                ) : (
                    appointments.slice(0, 5).map((apt, idx) => (
                        <Animated.View 
                            key={apt.id} 
                            entering={FadeInDown.delay(600 + (idx * 100))}
                            style={styles.aptCard}
                        >
                            <View style={styles.aptInfo}>
                                <Text style={styles.patientName}>{apt.patient?.name || 'مريض رقم ' + apt.id.slice(-4)}</Text>
                                <Text style={styles.aptTime}>{apt.time} — {apt.date}</Text>
                            </View>
                            <View style={[styles.statusTag, { backgroundColor: apt.status === 'confirmed' ? '#DCFCE7' : '#FEF9C3' }]}>
                                <Text style={[styles.statusText, { color: apt.status === 'confirmed' ? '#166534' : '#854D0E' }]}>
                                    {apt.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                                </Text>
                            </View>
                        </Animated.View>
                    ))
                )}
            </View>

            <View style={{ height: 100 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, elevation: 10, shadowColor: '#1E88E5', shadowOpacity: 0.3, shadowRadius: 15 },
    headerTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    logoContainer: { width: 120, height: 40, justifyContent: 'center', alignItems: 'center' },
    logo: { width: '100%', height: '100%', tintColor: '#FFF' },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerBottom: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    welcomeText: { alignItems: 'flex-end' },
    welcomeSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)' },
    welcomeMain: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF', marginTop: 2 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    
    statsGrid: { flexDirection: 'row-reverse', paddingHorizontal: 20, gap: 12, marginTop: -20 },
    statItem: { flex: 1, borderRadius: 20, padding: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, alignItems: 'center' },
    statVal: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    statLabel: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#64748B', marginTop: 2 },

    section: { paddingHorizontal: 20, marginTop: 30 },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    viewAll: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#1E88E5' },
    emptyApts: { alignItems: 'center', padding: 30, backgroundColor: '#F8FAFC', borderRadius: 20, borderStyle: 'dotted', borderWidth: 1, borderColor: '#CBD5E1' },
    emptyText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#94A3B8', marginTop: 10 },
    
    aptCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 18, padding: 15, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
    aptInfo: { flex: 1, alignItems: 'flex-end' },
    patientName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    aptTime: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#64748B', marginTop: 2 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
});
