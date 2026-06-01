import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity,
    ScrollView, ActivityIndicator, Dimensions, Platform, Alert, TextInput, PanResponder, Animated as RNAnimated
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import ProviderStatsBar from '../../../src/components/ProviderStatsBar';

const { width, height } = Dimensions.get('window');

// Slider Width Constants
const SLIDER_WIDTH = width - 40;
const BUTTON_SIZE = 60;
const SWIPE_RANGE = SLIDER_WIDTH - BUTTON_SIZE - 10;

// Helper to generate days for a given month/year
const generateDaysForMonth = (month: number, year: number) => {
    const days = [];
    const date = new Date(year, month, 1);
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    while (date.getMonth() === month) {
        days.push({
            dayName: dayNames[date.getDay()],
            date: date.getDate().toString().padStart(2, '0'),
            fullDate: date.toISOString().split('T')[0]
        });
        date.setDate(date.getDate() + 1);
    }
    return days;
};

const MONTHS_AR = [
    'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
];

const TIME_SLOTS = [
    '09:00 AM', '09:30 AM', '10:15 AM',
    '11:00 AM', '01:00 PM', '02:15 PM',
    '02:30 PM', '04:30 PM', '05:30 PM'
];

export default function DoctorProfile() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    
    const [doctor, setDoctor] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const now = new Date();
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());
    const [currentYear, setCurrentYear] = useState(now.getFullYear());
    const [calendarDays, setCalendarDays] = useState(generateDaysForMonth(now.getMonth(), now.getFullYear()));
    
    const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [availability, setAvailability] = useState<any>({ time_slots: TIME_SLOTS, booked_slots: [] });
    const [conditionDescription, setConditionDescription] = useState('');
    
    const [booking, setBooking] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);

    // Slider Animation State
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [data, av] = await Promise.all([
                    api.getDoctor(id as string, user?.id),
                    api.getDoctorAvailability(id as string).catch(() => null),
                ]);
                setDoctor(data);
                setIsFavorite(data.is_favorite || false);
                if (av) setAvailability(av);
                setAnalytics({
                    favorites_count: data.favorites_count,
                    weekly_bookings: data.weekly_bookings,
                    monthly_bookings: data.monthly_bookings,
                });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id, user]);

    useEffect(() => {
        setCalendarDays(generateDaysForMonth(currentMonth, currentYear));
    }, [currentMonth, currentYear]);

    const resetBtn = () => {
        setIsConfirmed(false);
    };

    const toggleFavorite = async () => {
        if (!user) {
            Alert.alert('تنبيه', 'يجب تسجيل الدخول لإضافة المفضلة');
            return;
        }
        try {
            const res = await api.toggleDoctorFavorite(doctor.id, user.id);
            setIsFavorite(res.is_favorite);
        } catch (e) {
            console.error(e);
        }
    };

    const getPhotoUrl = (path: string) => {
        if (!path) return 'https://i.pravatar.cc/300';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    const handleBook = async () => {
        if (!selectedTime) {
            Alert.alert('تنبيه', 'الرجاء اختيار وقت الموعد');
            resetBtn();
            return;
        }
        if (!conditionDescription.trim()) {
            Alert.alert('تنبيه', 'الرجاء وصف حالتك الصحية أو سبب الزيارة');
            resetBtn();
            return;
        }
        if (!user) {
            Alert.alert('تنبيه', 'يجب تسجيل الدخول للحجز');
            resetBtn();
            return;
        }

        setBooking(true);
        try {
            await api.createAppointment({
                doctor_id: doctor.id,
                patient_id: user.id,
                date: selectedDate,
                time: selectedTime,
                price: doctor.price_per_session || 0,
                reason: conditionDescription,
                notes: 'حجز جديد من التطبيق'
            });
            Alert.alert('نجاح', 'تم إرسال طلب الحجز بنجاح بانتظار موافقة الطبيب', [
                { text: 'حسناً', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل الحجز');
            resetBtn();
        } finally {
            setBooking(false);
        }
    };

    const handleReviewSubmit = async () => {
        if (!user) {
            Alert.alert('تنبيه', 'يجب تسجيل الدخول لإضافة تقييم');
            return;
        }
        if (rating === 0) {
            Alert.alert('تنبيه', 'الرجاء اختيار التقييم أولاً');
            return;
        }
        setIsSubmittingReview(true);
        try {
            await api.addDoctorReview(doctor.id, { patient_id: user.id, rating, comment });
            Alert.alert('نجاح', 'شكراً لتقييمك!');
            setRating(0);
            setComment('');
            const data = await api.getDoctor(id as string, user?.id);
            setDoctor(data);
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل إرسال التقييم');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
        </View>
    );

    if (!doctor) return <Text style={{ marginTop: 100, textAlign: 'center' }}>Doctor not found</Text>;

    return (
        <View style={styles.container}>
            {/* Header Area */}
            <View style={styles.headerBg}>
                <View style={styles.headerNav}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.navTitle}>تفاصيل الطبيب</Text>
                    <TouchableOpacity 
                        style={styles.navBtn}
                        onPress={toggleFavorite}
                    >
                        <Ionicons 
                            name={isFavorite ? "heart" : "heart-outline"} 
                            size={24} 
                            color={isFavorite ? "#EF4444" : "#111827"} 
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.heroSection}>
                    <View style={styles.heroTextCol}>
                        <Text style={styles.docNameTitle}>{doctor.name}</Text>
                        <Text style={styles.docSpecTitle}>{doctor.specialization}</Text>
                        <View style={styles.priceRow}>
                            <Text style={styles.priceVal}>{doctor.price_per_session?.toLocaleString()} ل.س</Text>
                            <Text style={styles.priceLabel}>/ كشفية</Text>
                        </View>
                        {doctor.clinic_address && (
                            <View style={styles.locationRow}>
                                <Ionicons name="location" size={14} color="#6B7280" />
                                <Text style={styles.locationText}>{doctor.clinic_address}</Text>
                            </View>
                        )}
                    </View>
                    <Image
                        source={{ 
                            uri: getPhotoUrl(doctor.photo),
                            headers: { 'Bypass-Tunnel-Reminder': 'true' }
                        }}
                        style={styles.heroPhoto}
                        resizeMode="cover"
                    />
                </View>
            </View>

            {/* Content Area */}
            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                <ProviderStatsBar stats={analytics} rating={doctor.rating} />
                {/* Stats */}
                <View style={styles.statsContainer}>
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(240, 244, 248, 0.95)']}
                        style={styles.statsInner}
                        start={{x:0,y:0}} end={{x:1,y:1}}
                    >
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>+{doctor.experience_years || 10}</Text>
                            <Text style={styles.statLabel}>سنوات خبرة</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>+{doctor.total_sessions || '30k'}</Text>
                            <Text style={styles.statLabel}>مريض</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>+{doctor.total_reviews || '10k'}</Text>
                            <Text style={styles.statLabel}>مراجعة</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statVal}>{doctor.rating ? doctor.rating.toFixed(1) : '4.9'}</Text>
                            <Text style={styles.statLabel}>التقييم</Text>
                        </View>
                    </LinearGradient>
                </View>

                <Text style={styles.bookingHeroText}>احجز موعد مع الدكتور</Text>

                {/* Calendar */}
                <View style={styles.sectionBox}>
                    <View style={styles.monthSelectorRow}>
                        <TouchableOpacity onPress={() => {
                            if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
                            else { setCurrentMonth(currentMonth - 1); }
                        }}>
                            <Ionicons name="chevron-forward" size={20} color="#1E88E5" />
                        </TouchableOpacity>
                        <Text style={styles.monthYearText}>{MONTHS_AR[currentMonth]} {currentYear}</Text>
                        <TouchableOpacity onPress={() => {
                            if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
                            else { setCurrentMonth(currentMonth + 1); }
                        }}>
                            <Ionicons name="chevron-back" size={20} color="#1E88E5" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScrollContent}>
                        {calendarDays.map((d, i) => {
                            const isSelected = selectedDate === d.fullDate;
                            return (
                                <TouchableOpacity 
                                    key={i} 
                                    style={[styles.dayCard, isSelected && styles.dayCardActive]}
                                    onPress={() => setSelectedDate(d.fullDate)}
                                >
                                    <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>{d.dayName}</Text>
                                    <View style={[styles.dateCircle, isSelected && styles.dateCircleActive]}>
                                        <Text style={[styles.dateText, isSelected && styles.dateTextActive]}>{d.date}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Time Slots */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>اختر الوقت</Text>
                    <View style={styles.timeGrid}>
                        {(availability.time_slots?.length ? availability.time_slots : TIME_SLOTS).map((time: string, idx: number) => {
                            const isSelected = selectedTime === time;
                            const isBooked = availability.booked_slots?.some((slot: any) => slot.date === selectedDate && slot.time === time);
                            return (
                                <TouchableOpacity 
                                    key={idx} 
                                    style={[styles.timeSlotBtn, isSelected && styles.timeSlotBtnActive, isBooked && styles.timeSlotBtnBooked]}
                                    onPress={() => isBooked ? Alert.alert('محجوز', 'هذا الموعد محجوز بالفعل') : setSelectedTime(time)}
                                >
                                    <Text style={[styles.timeSlotText, isSelected && styles.timeSlotTextActive, isBooked && styles.timeSlotTextBooked]}>{time}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Condition Description */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>وصف الحالة *</Text>
                    <View style={styles.conditionInputContainer}>
                        <TextInput
                            style={styles.conditionInput}
                            placeholder="صف حالتك الصحية أو سبب الزيارة بالتفصيل..."
                            placeholderTextColor="#9CA3AF"
                            value={conditionDescription}
                            onChangeText={setConditionDescription}
                            multiline
                            numberOfLines={4}
                            textAlign="right"
                            textAlignVertical="top"
                        />
                        <Text style={styles.conditionHint}>
                            💡 وصف دقيق للحالة يساعد الطبيب على تقديم الرعاية المناسبة
                        </Text>
                    </View>
                </View>

                {/* Rating Section */}
                <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>تقييم الطبيب</Text>
                    <View style={styles.ratingCard}>
                        <Text style={styles.ratingPrompt}>كيف كانت تجربتك مع د. {doctor.name}؟</Text>
                        <View style={styles.starsRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                    <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color="#FBBF24" />
                                </TouchableOpacity>
                            ))}
                        </View>
                        {rating > 0 && (
                            <View style={styles.reviewInputBox}>
                                <TextInput
                                    style={styles.reviewInput}
                                    placeholder="اكتب تعليقك (اختياري)..."
                                    placeholderTextColor="#9CA3AF"
                                    value={comment}
                                    onChangeText={setComment}
                                    multiline
                                    textAlign="right"
                                />
                                <TouchableOpacity style={styles.submitReviewBtn} onPress={handleReviewSubmit} disabled={isSubmittingReview}>
                                    {isSubmittingReview ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitReviewBtnText}>إرسال التقييم</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
                
                <View style={{ height: 250 }} />
            </ScrollView>

            {/* Premium Press to Confirm Button */}
            <View style={styles.bottomBar}>
                <TouchableOpacity 
                    style={[styles.bookingBtn, !selectedTime && { opacity: 0.6, backgroundColor: '#94A3B8' }]}
                    onPress={handleBook}
                    disabled={booking || !selectedTime}
                >
                    <LinearGradient
                        colors={selectedTime ? ['#1E88E5', '#1565C0'] : ['#94A3B8', '#64748B']}
                        style={StyleSheet.absoluteFillObject}
                        start={{x:0,y:0}} end={{x:1,y:1}}
                    />
                    {booking ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <View style={styles.btnContent}>
                            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                            <Text style={styles.bookingBtnText}>
                                {selectedTime ? "تأكيد الحجز الآن" : "يرجى اختيار الوقت أولاً"}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerBg: { backgroundColor: '#F0F4F8', paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingBottom: 20 },
    headerNav: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
    navBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    navTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827' },
    heroSection: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 20, height: 160 },
    heroTextCol: { flex: 1, justifyContent: 'center', paddingLeft: 20 },
    docNameTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#111827', lineHeight: 30, textAlign: 'right' },
    docSpecTitle: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right' },
    priceRow: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4, marginTop: 10 },
    priceVal: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    priceLabel: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    locationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    locationText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right' },
    heroPhoto: { width: 140, height: 210, position: 'absolute', bottom: -50, left: 10, zIndex: 1 },
    contentScroll: { flex: 1, zIndex: 2, paddingTop: 30 },
    statsContainer: { paddingHorizontal: 20, marginBottom: 20 },
    statsInner: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 18, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
    statItem: { alignItems: 'center', flex: 1 },
    statVal: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827' },
    statLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#9CA3AF', marginTop: 2 },
    statDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
    bookingHeroText: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right', paddingHorizontal: 20, marginBottom: 15 },
    sectionBox: { marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', paddingHorizontal: 20, marginBottom: 15, textAlign: 'right' },
    monthSelectorRow: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 15, paddingHorizontal: 20 },
    monthYearText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    calendarScrollContent: { paddingHorizontal: 20, gap: 15, flexDirection: 'row-reverse' },
    dayCard: { alignItems: 'center', gap: 10 },
    dayCardActive: { transform: [{ scale: 1.05 }] },
    dayName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#6B7280' },
    dayNameActive: { color: '#111827' },
    dateCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
    dateCircleActive: { backgroundColor: '#1E88E5' },
    dateText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#4B5563' },
    dateTextActive: { color: '#FFF' },
    timeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, justifyContent: 'space-between' },
    timeSlotBtn: { width: '30%', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
    timeSlotBtnActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    timeSlotBtnBooked: { backgroundColor: '#111827', borderColor: '#111827', opacity: 0.55 },
    timeSlotText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#4B5563' },
    timeSlotTextActive: { color: '#FFF' },
    timeSlotTextBooked: { color: '#FFF' },
    conditionInputContainer: { marginHorizontal: 20 },
    conditionInput: { 
        backgroundColor: '#FFF', 
        borderRadius: 16, 
        padding: 16, 
        minHeight: 120, 
        fontFamily: 'Cairo_400Regular', 
        fontSize: 14, 
        color: '#111827', 
        borderWidth: 1.5, 
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 2
    },
    conditionHint: { 
        fontSize: 12, 
        fontFamily: 'Cairo_400Regular', 
        color: '#6B7280', 
        marginTop: 8, 
        textAlign: 'right',
        lineHeight: 18
    },
    ratingCard: { marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
    ratingPrompt: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#111827', marginBottom: 15 },
    starsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 15 },
    reviewInputBox: { width: '100%', marginTop: 10 },
    reviewInput: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 15, minHeight: 80, fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#F3F4F6', textAlignVertical: 'top' },
    submitReviewBtn: { backgroundColor: '#43A047', borderRadius: 12, paddingVertical: 12, marginTop: 15, alignItems: 'center' },
    submitReviewBtnText: { color: '#FFF', fontFamily: 'Cairo_700Bold', fontSize: 14 },
    
    /* Swipe Slider Styles */
    bottomBar: { 
        position: 'absolute', 
        bottom: 90, 
        left: 0, 
        right: 0, 
        backgroundColor: 'transparent',
        paddingHorizontal: 20, 
        zIndex: 1000
    },
    /* New Booking Button Styles */
    bookingBtn: {
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        shadowColor: '#1E88E5',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    btnContent: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    bookingBtnText: {
        color: '#FFF',
        fontFamily: 'Cairo_700Bold',
        fontSize: 18,
    }
});
