import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, TextInput, ActivityIndicator, RefreshControl, Dimensions, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api, BASE_URL } from '../../src/services/api';

const { width } = Dimensions.get('window');

export default function DoctorsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { spec } = useLocalSearchParams();
    
    const [doctors, setDoctors] = useState<any[]>([]);
    const [myDoctors, setMyDoctors] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [selectedSpec, setSelectedSpec] = useState(spec ? (spec as string) : 'all');
    const [search, setSearch] = useState('');
    
    // Appointment state
    const [upcomingAppointment, setUpcomingAppointment] = useState<any>(null);
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    const loadData = async (s?: string) => {
        try {
            const [docs, specs, apts, mine] = await Promise.all([
                api.getDoctors(s === 'all' ? undefined : s),
                api.getSpecializations(),
                user?.id ? api.getAppointments({ patient_id: user.id }) : Promise.resolve([]),
                user?.id ? api.getMyDoctors(user.id).catch(() => []) : Promise.resolve([])
            ]);
            
            setDoctors(docs);
            setFiltered(docs);
            setMyDoctors(mine || []);
            
            const allCat = { id: 'all', name: 'الكل', icon: 'apps', name_en: 'all' };
            setCategories([allCat, ...specs]);
            
            // Find next upcoming appointment
            if (apts && apts.length > 0) {
                const upcoming = apts.find((a: any) => ['confirmed', 'pending', 'patient_confirmation_pending'].includes(a.status));
                if (upcoming) {
                    // Fetch doctor details for this appointment to get photo and name
                    const docDetails = await api.getDoctor(upcoming.doctor_id).catch(() => null);
                    if (docDetails) {
                        setUpcomingAppointment({ ...upcoming, doctor: docDetails });
                    }
                } else {
                    setUpcomingAppointment(null);
                }
            }
        } catch (e) {
            console.warn('Failed to load doctors data:', e);
        } finally { 
            setLoading(false); 
            setRefreshing(false); 
        }
    };

    useEffect(() => {
        if (spec && typeof spec === 'string') {
            setSelectedSpec(spec);
        }
    }, [spec]);

    useEffect(() => {
        loadData(selectedSpec);
    }, [selectedSpec]);

    useEffect(() => {
        if (!search) { setFiltered(doctors); return; }
        const q = search.toLowerCase();
        setFiltered(doctors.filter((d: any) =>
            d.name?.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q) || d.name_en?.toLowerCase().includes(q)
        ));
    }, [search, doctors]);

    const getPhotoUrl = (path?: string) => {
        if (!path) return 'https://i.pravatar.cc/300';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    // Helper to format greeting based on time (Mock logic)
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'صباح الخير';
        if (hour < 18) return 'مساء الخير';
        return 'طاب مساؤك';
    };

    return (
        <View style={styles.container}>
            {/* Safe Area Padding */}
            <View style={{ paddingTop: Platform.OS === 'ios' ? 50 : 30 }} />

            <ScrollView
                style={{ flex: 1 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(selectedSpec); }} />}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* 1. Header Area */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View style={styles.userInfoBox}>
                            <Image 
                                source={{ 
                                    uri: getPhotoUrl(user?.photo),
                                    headers: { 'Bypass-Tunnel-Reminder': 'true' }
                                }} 
                                style={styles.userAvatar} 
                            />
                            <View style={styles.greetingTextCol}>
                                <Text style={styles.greetingText}>{getGreeting()}</Text>
                                <Text style={styles.userNameText}>{user?.name ? user.name.split(' ')[0] : 'ضيف'} 👋</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.bellBtn} onPress={() => router.back()}>
                            <View style={styles.bellBadge} />
                            <Ionicons name="notifications-outline" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ابحث عن أطباء..."
                            placeholderTextColor="#9CA3AF"
                            value={search}
                            onChangeText={setSearch}
                            textAlign="right"
                        />
                        <TouchableOpacity style={styles.filterBtn}>
                            <Ionicons name="options-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. Upcoming Appointment */}
                {upcomingAppointment && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>الموعد القادم</Text>
                            <TouchableOpacity onPress={() => router.push('/(patient)/appointments' as any)}>
                                <Text style={styles.seeAllText}>عرض الكل</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.upcomingCardWrapper}>
                            {/* Blue Card Background */}
                            <LinearGradient
                                colors={['#1E88E5', '#4A7CD5']}
                                style={styles.upcomingCard}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.upcomingTopInfo}>
                                    <View style={styles.upcomingDocCol}>
                                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                                            <MaterialCommunityIcons name="stethoscope" size={16} color="rgba(255,255,255,0.8)" />
                                            <Text style={styles.upcomingSpec}>{upcomingAppointment.doctor.specialization}</Text>
                                        </View>
                                        <Text style={styles.upcomingName}>{upcomingAppointment.doctor.name}</Text>
                                    </View>
                                </View>

                                {/* Date/Time Inner Box */}
                                <View style={styles.upcomingTimeBox}>
                                    <View style={styles.upcomingTimeRow}>
                                        <Ionicons name="calendar-outline" size={16} color="#FFF" />
                                        <Text style={styles.upcomingTimeText}>{upcomingAppointment.date}</Text>
                                    </View>
                                    <View style={styles.upcomingTimeRow}>
                                        <Ionicons name="time-outline" size={16} color="#FFF" />
                                        <Text style={styles.upcomingTimeText}>{upcomingAppointment.time}</Text>
                                    </View>
                                    <TouchableOpacity style={styles.upcomingArrowBtn} onPress={() => router.push(`/(patient)/doctors/${upcomingAppointment.doctor.id}` as any)}>
                                        <MaterialCommunityIcons name="arrow-top-left" size={20} color="#1E88E5" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.upcomingActionsRow}>
                                    <TouchableOpacity style={styles.cancelBtn}>
                                        <Text style={styles.cancelBtnText}>إلغاء</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.detailsBtn}>
                                        <Text style={styles.detailsBtnText}>التفاصيل</Text>
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                            
                            {/* Overflowing Doctor Image */}
                            <Image 
                                source={{ 
                                    uri: getPhotoUrl(upcomingAppointment.doctor.photo),
                                    headers: { 'Bypass-Tunnel-Reminder': 'true' }
                                }} 
                                style={styles.upcomingOverlayImg}
                                resizeMode="cover"
                            />
                        </View>
                    </View>
                )}

                {myDoctors.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>My Doctors</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12, flexDirection: 'row-reverse' }}>
                            {myDoctors.map((doctor: any) => (
                                <TouchableOpacity key={doctor.id} style={styles.myDoctorCard} onPress={() => router.push(`/(patient)/doctors/${doctor.id}` as any)}>
                                    <Text style={styles.myDoctorName} numberOfLines={1}>{doctor.name}</Text>
                                    <Text style={styles.myDoctorMeta}>{doctor.specialization || 'Doctor'}</Text>
                                    <Text style={styles.myDoctorMeta}>Last: {doctor.last_appointment_date || '-'}</Text>
                                    <View style={styles.rebookBtn}>
                                        <Text style={styles.rebookText}>Rebook</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* 3. Categories / Specializations */}
                <View style={[styles.sectionContainer, { marginTop: upcomingAppointment ? 10 : 20 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>التخصصات</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>عرض الكل</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingVertical: 10, flexDirection: 'row-reverse' }}
                    >
                        {categories.map((sp) => (
                            <TouchableOpacity
                                key={sp.id}
                                style={[styles.chipBox, selectedSpec === sp.name_en && styles.chipBoxActive]}
                                onPress={() => setSelectedSpec(sp.name_en)}
                            >
                                <Text style={[styles.chipText, selectedSpec === sp.name_en && styles.chipTextActive]}>
                                    {sp.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* 4. Doctors List (2-column layout) */}
                <View style={styles.listContainer}>
                    {loading ? (
                        <ActivityIndicator color="#1E88E5" style={{ marginTop: 40 }} size="large" />
                    ) : filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="account-search-outline" size={60} color="#D1D5DB" />
                            <Text style={styles.emptyText}>لا يوجد أطباء متوفرين</Text>
                        </View>
                    ) : (
                        <View style={styles.grid}>
                            {filtered.map((doctor) => (
                                <TouchableOpacity
                                    key={doctor.id}
                                    style={styles.gridDocCard}
                                    activeOpacity={0.9}
                                    onPress={() => router.push(`/(patient)/doctors/${doctor.id}` as any)}
                                >
                                    <View style={styles.gridImgBg}>
                                        <Image
                                            source={{ 
                                                uri: getPhotoUrl(doctor.photo),
                                                headers: { 'Bypass-Tunnel-Reminder': 'true' }
                                            }}
                                            style={styles.gridDocImg}
                                            resizeMode="cover"
                                        />
                                    </View>
                                    <Text style={styles.gridDocName} numberOfLines={1}>{doctor.name}</Text>
                                    <Text style={styles.gridDocSpec} numberOfLines={1}>{doctor.specialization}</Text>
                                    <View style={styles.gridDocPriceBox}>
                                        <Text style={styles.gridDocPriceTxt}>{doctor.price_per_session?.toLocaleString()} ل.س</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F4F8' }, // Light soft blue/grey background matching mockup
    /* 1. Header section */
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
    headerTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    userInfoBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB' },
    greetingTextCol: { alignItems: 'flex-end' },
    greetingText: { fontSize: 13, color: '#6B7280', fontFamily: 'Cairo_400Regular' },
    userNameText: { fontSize: 16, color: '#111827', fontFamily: 'Cairo_700Bold', marginTop: -4 },
    bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    bellBadge: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', zIndex: 1 },
    searchContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FFF', height: 50, borderRadius: 25, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
    searchInput: { flex: 1, height: '100%', fontFamily: 'Cairo_400Regular', fontSize: 14, marginHorizontal: 10, color: '#111827' },
    filterBtn: { borderRightWidth: 1, borderRightColor: '#E5E7EB', paddingRight: 10, marginLeft: 5 },
    
    /* 2. Upcoming Appointment */
    sectionContainer: { marginTop: 10 },
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827' },
    seeAllText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#1E88E5' },
    
    upcomingCardWrapper: { position: 'relative', marginHorizontal: 20, height: 180 },
    upcomingCard: { flex: 1, borderRadius: 24, padding: 20, overflow: 'hidden' },
    upcomingTopInfo: { alignItems: 'flex-end', zIndex: 2, paddingRight: 90 }, // Shift left (right in RTL) context
    upcomingDocCol: { alignItems: 'flex-end' },
    upcomingSpec: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Cairo_400Regular' },
    upcomingName: { color: '#FFF', fontSize: 20, fontFamily: 'Cairo_700Bold', marginTop: 2 },
    upcomingTimeBox: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 12, marginTop: 15, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
    upcomingTimeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    upcomingTimeText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
    upcomingArrowBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    upcomingActionsRow: { flexDirection: 'row-reverse', gap: 10, marginTop: 15, zIndex: 2 },
    cancelBtn: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    cancelBtnText: { color: '#1E88E5', fontFamily: 'Cairo_700Bold', fontSize: 14 },
    detailsBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    detailsBtnText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 14 },
    
    upcomingOverlayImg: { position: 'absolute', top: -15, right: 10, width: 110, height: 160, zIndex: 1, borderTopRightRadius: 24, borderTopLeftRadius: 24 }, // Extruding photo
    myDoctorCard: { width: 180, backgroundColor: '#FFF', borderRadius: 18, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, alignItems: 'flex-end' },
    myDoctorName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right' },
    myDoctorMeta: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right' },
    rebookBtn: { marginTop: 10, backgroundColor: '#1E88E5', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'stretch', alignItems: 'center' },
    rebookText: { color: '#FFF', fontSize: 12, fontFamily: 'Cairo_700Bold' },
    
    /* 3. Categories */
    chipBox: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    chipBoxActive: { backgroundColor: '#1E88E5' },
    chipText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#4B5563' },
    chipTextActive: { color: '#FFF' },
    
    /* 4. Doctors List Grid */
    listContainer: { paddingHorizontal: 20, marginTop: 10 },
    grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridDocCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 24, padding: 12, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, alignItems: 'center' },
    gridImgBg: { width: '100%', height: 110, backgroundColor: 'transparent', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
    gridDocImg: { width: '100%', height: '100%' },
    gridDocName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'center' },
    gridDocSpec: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'center', marginTop: -2 },
    gridDocPriceBox: { marginTop: 8, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    gridDocPriceTxt: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#059669' },
    
    empty: { alignItems: 'center', marginTop: 40, gap: 15 },
    emptyText: { fontSize: 16, fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
});
