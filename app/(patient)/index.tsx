import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, ActivityIndicator, RefreshControl, Dimensions,
    TextInput, Platform, FlatList, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api, BASE_URL } from '../../src/services/api';

const { width } = Dimensions.get('window');

const getCatColor = (idx: number) => ['#1E88E5', '#43A047', '#FB8C00', '#E91E63', '#8E24AA', '#00ACC1'][idx % 6];

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const currentMonthYear = `${ARABIC_MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`;

/** 
 * Generates the next 6 working days (Sunday to Thursday) starting from today.
 * Javascript getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */
const generateWeekDays = () => {
    const days: { day: string; date: string }[] = [];
    const today = new Date();
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    let count = 0;
    let offset = 0;
    while (count < 6 && offset < 14) {
        const d = new Date(today);
        d.setDate(today.getDate() + offset);
        const dayIdx = d.getDay();

        // Include Sunday (0) through Thursday (4)
        if (dayIdx >= 0 && dayIdx <= 4) {
            days.push({
                day: dayNames[dayIdx].substring(0, 3),
                date: d.getDate().toString()
            });
            count++;
        }
        offset++;
    }
    return days;
};
const WEEK_DAYS = generateWeekDays();

export default function PatientHome() {
    const { user } = useAuth();
    const router = useRouter();
    const [allDoctors, setAllDoctors] = useState<any[]>([]);
    const [popularDoctors, setPopularDoctors] = useState<any[]>([]);
    const [popularPharmacies, setPopularPharmacies] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [selectedPresc, setSelectedPresc] = useState<any>(null);
    const [showPrescModal, setShowPrescModal] = useState(false);

    const load = async () => {
        try {
            if (user?.id) {
                const [docs, farms, specs, prescs] = await Promise.all([
                    api.getDoctors(),
                    api.getPharmacies(),
                    api.getSpecializations(),
                    api.getPatientPrescriptions(user.id)
                ]);
                setAllDoctors(docs);
                setPrescriptions(prescs);
                
                // Prioritize featured doctors, fallback to first 3
                const featuredDocs = docs.filter((d: any) => d.is_featured);
                setPopularDoctors(featuredDocs.length > 0 ? featuredDocs.slice(0, 3) : docs.slice(0, 3));
                
                // Prioritize featured pharmacies, fallback to first 4
                const featuredFarms = farms.filter((f: any) => f.is_featured);
                setPopularPharmacies(featuredFarms.length > 0 ? featuredFarms.slice(0, 4) : farms.slice(0, 4));
                
                setCategories(specs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        load();
    };

    useEffect(() => { load(); }, [user]);

    useEffect(() => {
        console.log("HOME SCREEN RENDERED - Verifying UI Reflection");
        load(); 
    }, []);

    useEffect(() => {
        if (!search) {
            // Re-apply featured filter when search is cleared
            const featuredDocs = allDoctors.filter((d: any) => d.is_featured);
            setPopularDoctors(featuredDocs.length > 0 ? featuredDocs.slice(0, 3) : allDoctors.slice(0, 3));
            return;
        }
        const q = search.toLowerCase();
        const filtered = allDoctors.filter(d =>
            d.name?.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q)
        ).slice(0, 3);
        setPopularDoctors(filtered);
    }, [search, allDoctors]);

    const getPhotoUrl = (path: string) => {
        if (!path) return 'https://i.pravatar.cc/300';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    const renderDoctorCard = ({ item }: { item: any }) => {
        const doctorName = item.name?.startsWith('د.') ? item.name : `د. ${item.name}`;

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={styles.doctorCardWrapper}
                onPress={() => router.push(`/(patient)/doctors/${item.id}` as any)}
            >
                <View style={styles.premiumDoctorCard}>
                    <LinearGradient
                        colors={['#FFFFFF', '#F8F9FF']}
                        style={styles.doctorCardContent}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    >
                        <View style={styles.cardOverlayContent}>
                            <View style={styles.doctorTopRow}>
                                <TouchableOpacity style={styles.favCircle}>
                                    <Ionicons name="heart-outline" size={20} color="#111827" />
                                </TouchableOpacity>
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>{item.rating || '4.8'}</Text>
                                    <Ionicons name="star" size={14} color="#FBBF24" />
                                </View>
                            </View>

                            <View style={styles.docTextInfo}>
                                <Text style={styles.docSpecLabel}>{item.specialization}</Text>
                                <Text style={styles.docNameLabel}>{doctorName}</Text>
                                <Text style={styles.docPriceLabel}>{item.price_per_session?.toLocaleString()} ل.س / جلسة</Text>
                            </View>

                        </View>
                    </LinearGradient>

                    <Image
                        source={{ 
                            uri: getPhotoUrl(item.photo),
                            headers: { 'Bypass-Tunnel-Reminder': 'true' }
                        }}
                        style={styles.docMainPhoto}
                        resizeMode="cover"
                    />

                    <LinearGradient
                        colors={['#1E88E5', '#43A047']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.availabilityBoxGradient}
                    >
                        <View style={styles.availabilityBoxInner}>
                            <View style={styles.availHeader}>
                                <View style={styles.availNav}>
                                    <Ionicons name="chevron-forward" size={14} color="#64748B" />
                                    <Text style={styles.availMonth}>{currentMonthYear}</Text>
                                    <Ionicons name="chevron-back" size={14} color="#64748B" />
                                </View>
                                <Text style={styles.availTitle}>المواعيد المتاحة • 8 فترات</Text>
                            </View>
                            <View style={styles.daysRow}>
                                {WEEK_DAYS.map((d, idx) => (
                                    <View key={idx} style={[styles.dayCircle, idx === 0 && styles.activeDayContainer]}>
                                        <Text style={[styles.dayLabel, idx === 0 && styles.activeDayText]}>{d.day}</Text>
                                        <View style={[styles.dateInner, idx === 0 && styles.activeDateInner]}>
                                            <Text style={[styles.dateLabel, idx === 0 && styles.activeDateText]}>{d.date}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </LinearGradient>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FAFBFF' }}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.headerRowMockup}>
                        <View style={styles.headerActionIcons}>
                            <TouchableOpacity 
                                style={styles.headerIconBtn}
                                onPress={() => router.push('/(patient)/notifications')}
                            >
                                <Ionicons name="notifications-outline" size={24} color="#111827" />
                                <View style={styles.notifDot} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/(patient)/profile')}>
                                <Ionicons name="person-outline" size={24} color="#111827" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.greetingTextColumn}>
                            <Text style={styles.greetingTitle}>مرحباً <Text style={{ color: '#1E88E5' }}>{user?.name?.split(' ')[0] || 'أحمد'}</Text> 👋</Text>
                            <Text style={styles.greetingSub}>كيف تشعر اليوم؟</Text>
                        </View>
                    </View>

                    {/* Categories */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesScroll}
                        style={styles.catScrollOuter}
                    >
                        {categories.map((cat, idx) => (
                            <TouchableOpacity
                                key={cat.id || idx}
                                style={styles.categoryCard}
                                activeOpacity={0.7}
                                onPress={() => router.push(`/(patient)/doctors?spec=${cat.name_en}` as any)}
                            >
                                <LinearGradient
                                    colors={['#1E88E5', '#43A047']}
                                    style={styles.categoryIconCircle}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <MaterialCommunityIcons
                                        name={cat.icon as any}
                                        size={26}
                                        color="#FFF"
                                    />
                                </LinearGradient>
                                <Text style={styles.categoryName}>{cat.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Recent Prescriptions */}
                    {prescriptions.length > 0 && (
                        <View style={{ marginTop: 24 }}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>آخر الوصفات الطبية</Text>
                                <TouchableOpacity onPress={() => router.push('/(patient)/records')}>
                                    <Text style={styles.seeAll}>عرض الكل</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {prescriptions.slice(0, 3).map((p, idx) => (
                                    <TouchableOpacity 
                                        key={p.id} 
                                        style={styles.prescCard}
                                        onPress={() => {
                                            setSelectedPresc(p);
                                            setShowPrescModal(true);
                                        }}
                                    >
                                        <View style={styles.prescIconBox}>
                                            <MaterialCommunityIcons name="pill" size={24} color="#5B8BE4" />
                                        </View>
                                        <Text style={styles.prescDocName}>د. {p.doctor?.name}</Text>
                                        <Text style={styles.prescDate}>{p.created_at.split('T')[0]}</Text>
                                        <View style={styles.medCountBadge}>
                                            <Text style={styles.medCountText}>{p.medications.length} أدوية</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}


                    {/* Top Doctors */}
                    <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                        <Text style={styles.sectionTitle}>أهم الأطباء</Text>
                        <TouchableOpacity onPress={() => router.push('/(patient)/doctors' as any)}>
                            <Text style={styles.seeAll}>عرض الكل</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator color="#1E88E5" style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={popularDoctors}
                            renderItem={renderDoctorCard}
                            keyExtractor={(item) => item.id.toString()}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={width - 70 + 20}
                            decelerationRate="fast"
                            contentContainerStyle={styles.doctorsSliderContent}
                            style={styles.doctorsSlider}
                        />
                    )}

                    {/* Top Pharmacies (Vertical) */}
                    <View style={[styles.sectionHeader, { marginTop: 24, marginBottom: 15 }]}>
                        <Text style={styles.sectionTitle}>صيدليات مناوبة</Text>
                        <TouchableOpacity onPress={() => router.push('/(patient)/pharmacies' as any)}>
                            <Text style={styles.seeAll}>عرض الكل</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.pharmacyVerticalList}>
                        {popularPharmacies.map((farm) => (
                            <TouchableOpacity 
                                key={farm.id} 
                                style={styles.modernFarmCard}
                                activeOpacity={0.9}
                                onPress={() => router.push(`/(patient)/pharmacies/${farm.id}` as any)}
                            >
                                <Ionicons name="chevron-back" size={20} color="#CBD5E1" />
                                
                                <View style={styles.farmInfo}>
                                    <View style={styles.farmNameRow}>
                                        <View style={styles.onlineDotSmall} />
                                        <Text style={styles.farmName}>{farm.name}</Text>
                                    </View>
                                    <Text style={styles.farmAddr} numberOfLines={1}>
                                        {farm.address || farm.city}
                                    </Text>
                                </View>

                                <View style={styles.modernFarmIconContainer}>
                                    <LinearGradient
                                        colors={['#E8F5E9', '#C8E6C9']}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                    <MaterialCommunityIcons name="medical-bag" size={26} color="#2E7D32" />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* Prescription Details Modal */}
            <Modal visible={showPrescModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.pModalContent}>
                        <View style={styles.pModalHeader}>
                            <TouchableOpacity onPress={() => setShowPrescModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                            <Text style={styles.pModalTitle}>تفاصيل الوصفة الطبية</Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.pDocInfo}>
                                <Text style={styles.pDocLabel}>بواسطة الدكتور:</Text>
                                <Text style={styles.pDocName}>د. {selectedPresc?.doctor?.name}</Text>
                                <Text style={styles.pDocSpec}>{selectedPresc?.doctor?.specialization}</Text>
                            </View>

                            <Text style={styles.pSectionTitle}>الأدوية الموصوفة</Text>
                            {selectedPresc?.medications.map((m: any, idx: number) => (
                                <View key={idx} style={styles.pMedCard}>
                                    <View style={styles.pMedIcon}>
                                        <MaterialCommunityIcons name="pill" size={20} color="#5B8BE4" />
                                    </View>
                                    <View style={styles.pMedInfo}>
                                        <Text style={styles.pMedName}>{m.name}</Text>
                                        <Text style={styles.pMedDosage}>{m.dosage} | {m.duration}</Text>
                                    </View>
                                </View>
                            ))}

                            {selectedPresc?.notes && (
                                <>
                                    <Text style={styles.pSectionTitle}>ملاحظات الدكتور</Text>
                                    <View style={styles.pNotesBox}>
                                        <Text style={styles.pNotesText}>{selectedPresc.notes}</Text>
                                    </View>
                                </>
                            )}
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.pCloseBtn}
                            onPress={() => setShowPrescModal(false)}
                        >
                            <Text style={styles.pCloseBtnText}>إغلاق</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
    /* Header (Mockup 3 Style) */
    headerRowMockup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25
    },
    headerActionIcons: { flexDirection: 'row', gap: 12 },
    greetingTextColumn: { alignItems: 'flex-end' },
    greetingTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#111827' },
    greetingSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#9CA3AF', marginTop: -2 },
    headerIconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    notifDot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E88E5', borderWidth: 1.5, borderColor: '#FFF' },
    /* Categories */
    catScrollOuter: { marginBottom: 20 },
    categoriesScroll: { gap: 12, paddingRight: 5 },
    categoryCard: { alignItems: 'center', gap: 8, width: 75 },
    categoryIconCircle: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#1E88E5', shadowOpacity: 0.2, shadowRadius: 8 },
    categoryName: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'center' },
    /* Sections */
    sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#111827' },
    seeAll: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#5C8DE5' },
    /* Premium Doctor Slider */
    doctorsSlider: { marginHorizontal: -20, marginTop: 10 },
    doctorsSliderContent: { paddingHorizontal: 20, paddingBottom: 15 },
    doctorCardWrapper: { width: width - 70, marginRight: 20 },
    premiumDoctorCard: { height: 380, borderRadius: 30, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, backgroundColor: '#FFF' },
    doctorCardContent: { flex: 1, padding: 20, borderRadius: 30, overflow: 'hidden' },
    cardOverlayContent: { flex: 1, zIndex: 10 },
    doctorTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#EEF2FF' },
    ratingText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#43A047' },
    favCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8F9FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEF2FF' },
    docTextInfo: { marginTop: 10, alignItems: 'flex-end', paddingRight: 0 },
    docSpecLabel: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    docNameLabel: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#1E293B', marginTop: 2 },
    docPriceLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#5B8BE4', marginTop: 10 },
    docMainPhoto: { width: 220, height: 300, position: 'absolute', bottom: 10, left: -40, zIndex: 10 },
    /* Availability */
    availabilityBoxGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 1.5,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        zIndex: 100,
        elevation: 15,
        overflow: 'hidden'
    },
    availabilityBoxInner: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderBottomLeftRadius: 28.5,
        borderBottomRightRadius: 28.5,
        padding: 15
    },
    availHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    availTitle: { fontSize: 11, color: '#1E293B', fontFamily: 'Cairo_700Bold' },
    availNav: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    availMonth: { fontSize: 11, color: '#64748B', fontFamily: 'Cairo_400Regular' },
    daysRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
    dayCircle: { alignItems: 'center', gap: 6, width: 40, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFF' },
    dayLabel: { fontSize: 10, color: '#94A3B8', fontFamily: 'Cairo_400Regular' },
    dateInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    dateLabel: { fontSize: 12, color: '#1E293B', fontFamily: 'Cairo_700Bold' },
    activeDayContainer: { backgroundColor: '#5B8BE4', elevation: 4, shadowColor: '#5B8BE4', shadowOpacity: 0.3, shadowRadius: 5 },
    activeDayText: { color: 'rgba(255,255,255,0.9)', fontFamily: 'Cairo_700Bold' },
    activeDateInner: { backgroundColor: '#FFF', borderColor: '#FFF' },
    activeDateText: { color: '#5B8BE4' },
    /* Pharmacy Cards (Compact Vertical) */
    pharmacyVerticalList: { gap: 12, marginBottom: 20 },
    compactPharmacyCard: { width: '100%', height: 90, backgroundColor: '#FFF', borderRadius: 20, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, borderWidth: 1, borderColor: '#F8F9FF' },
    compactPharmacyInfo: { flex: 1, marginRight: 0, alignItems: 'flex-end' },
    compactPharmacyName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    compactPharmacyAddr: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#94A3B8', marginTop: 2 },
    pharmacySelectionCircle: { marginLeft: 0 },
    onlineBadgeSmall: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    onlineTextSmall: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#16A34A' },
    /* Modern Farm List */
    modernFarmCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 24, 
        padding: 14, 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        marginBottom: 12, 
        elevation: 3, 
        shadowColor: '#000', 
        shadowOpacity: 0.08, 
        shadowRadius: 12,
    },
    modernFarmIconContainer: { 
        width: 50, 
        height: 50, 
        borderRadius: 15, 
        backgroundColor: '#F8FAFC', 
        justifyContent: 'center', 
        alignItems: 'center', 
        overflow: 'hidden',
        marginLeft: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    farmInfo: { 
        flex: 1, 
        alignItems: 'flex-end',
    },
    farmNameRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
    },
    onlineDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22C55E'
    },
    farmName: { 
        fontSize: 16, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B' 
    },
    farmAddr: { 
        fontSize: 11, 
        fontFamily: 'Cairo_400Regular', 
        color: '#94A3B8', 
        marginTop: 0 
    },

    /* Prescription Home Styles */
    prescCard: { 
        width: 140, 
        backgroundColor: '#FFF', 
        borderRadius: 22, 
        padding: 15, 
        alignItems: 'center', 
        elevation: 3, 
        shadowColor: '#000', 
        shadowOpacity: 0.05, 
        shadowRadius: 10,
        marginBottom: 5
    },
    prescIconBox: { 
        width: 46, 
        height: 46, 
        borderRadius: 16, 
        backgroundColor: '#EEF2FF', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 10 
    },
    prescDocName: { 
        fontSize: 12, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B', 
        textAlign: 'center' 
    },
    prescDate: { 
        fontSize: 10, 
        fontFamily: 'Cairo_400Regular', 
        color: '#94A3B8', 
        marginTop: 2 
    },
    medCountBadge: { 
        marginTop: 8, 
        backgroundColor: '#F0FDF4', 
        paddingHorizontal: 8, 
        paddingVertical: 2, 
        borderRadius: 6 
    },
    medCountText: { 
        fontSize: 9, 
        fontFamily: 'Cairo_700Bold', 
        color: '#16A34A' 
    },

    /* Modal Styles */
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'flex-end' 
    },
    pModalContent: { 
        backgroundColor: '#FFF', 
        borderTopLeftRadius: 35, 
        borderTopRightRadius: 35, 
        height: '75%', 
        padding: 24 
    },
    pModalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 25 
    },
    pModalTitle: { 
        fontSize: 18, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B' 
    },
    pDocInfo: { 
        backgroundColor: '#F8F9FF', 
        borderRadius: 20, 
        padding: 20, 
        alignItems: 'flex-end', 
        marginBottom: 25 
    },
    pDocLabel: { 
        fontSize: 12, 
        fontFamily: 'Cairo_400Regular', 
        color: '#64748B' 
    },
    pDocName: { 
        fontSize: 18, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B', 
        marginTop: 4 
    },
    pDocSpec: { 
        fontSize: 13, 
        fontFamily: 'Cairo_600SemiBold', 
        color: '#1E88E5' 
    },
    pSectionTitle: { 
        fontSize: 15, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B', 
        textAlign: 'right', 
        marginBottom: 15 
    },
    pMedCard: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        backgroundColor: '#FFF', 
        borderRadius: 18, 
        padding: 15, 
        marginBottom: 12, 
        borderWidth: 1, 
        borderColor: '#F1F5F9' 
    },
    pMedIcon: { 
        width: 40, 
        height: 40, 
        borderRadius: 12, 
        backgroundColor: '#F0F7FF', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginLeft: 15 
    },
    pMedInfo: { flex: 1, alignItems: 'flex-end' },
    pMedName: { 
        fontSize: 15, 
        fontFamily: 'Cairo_700Bold', 
        color: '#1E293B' 
    },
    pMedDosage: { 
        fontSize: 12, 
        fontFamily: 'Cairo_400Regular', 
        color: '#64748B' 
    },
    pNotesBox: { 
        backgroundColor: '#F8FAFC', 
        borderRadius: 15, 
        padding: 15, 
        marginBottom: 20 
    },
    pNotesText: { 
        fontSize: 13, 
        fontFamily: 'Cairo_400Regular', 
        color: '#475569', 
        textAlign: 'right', 
        lineHeight: 20 
    },
    pCloseBtn: { 
        backgroundColor: '#1E88E5', 
        height: 52, 
        borderRadius: 15, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginTop: 10 
    },
    pCloseBtnText: { 
        fontSize: 15, 
        fontFamily: 'Cairo_700Bold', 
        color: '#FFF' 
    }
});
