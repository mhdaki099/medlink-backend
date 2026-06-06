import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { isSlotBookedForDate } from '../utils/appointmentTime';

const MONTHS_AR = [
    'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
    'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
];

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const DEFAULT_TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

function generateDaysForMonth(month: number, year: number) {
    const days: { dayName: string; date: string; fullDate: string }[] = [];
    const cursor = new Date(year, month, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (cursor.getMonth() === month) {
        const d = new Date(cursor);
        d.setHours(0, 0, 0, 0);
        if (d >= today) {
            days.push({
                dayName: DAY_NAMES[cursor.getDay()],
                date: cursor.getDate().toString().padStart(2, '0'),
                fullDate: cursor.toISOString().split('T')[0],
            });
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

type Props = {
    doctorId: string;
    date: string;
    time: string;
    onDateChange: (date: string) => void;
    onTimeChange: (time: string) => void;
};

export default function AppointmentDateTimePicker({
    doctorId,
    date,
    time,
    onDateChange,
    onTimeChange,
}: Props) {
    const now = new Date();
    const [currentMonth, setCurrentMonth] = useState(now.getMonth());
    const [currentYear, setCurrentYear] = useState(now.getFullYear());
    const [calendarDays, setCalendarDays] = useState(generateDaysForMonth(now.getMonth(), now.getFullYear()));
    const [availability, setAvailability] = useState<any>({ time_slots: [], booked_slots: [], day_off: false });
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        setCalendarDays(generateDaysForMonth(currentMonth, currentYear));
    }, [currentMonth, currentYear]);

    useEffect(() => {
        if (!doctorId || !date) return;
        setLoadingSlots(true);
        api.getDoctorAvailability(doctorId, date)
            .then((av) => {
                setAvailability(av);
                if (av.day_off) {
                    onTimeChange('');
                    Alert.alert('تنبيه', 'لا توجد ساعات عمل في هذا اليوم');
                    return;
                }
                if (time && isSlotBookedForDate(av.booked_slots, date, time)) {
                    onTimeChange('');
                }
            })
            .catch((e: any) => Alert.alert('خطأ', e.message || 'تعذر تحميل الأوقات'))
            .finally(() => setLoadingSlots(false));
    }, [doctorId, date]);

    const timeSlots = availability.time_slots?.length
        ? availability.time_slots
        : (date ? DEFAULT_TIME_SLOTS : []);

    const handleSelectTime = (slot: string) => {
        if (isSlotBookedForDate(availability.booked_slots, date, slot)) {
            Alert.alert('محجوز', 'هذا الموعد محجوز بالفعل — اختر وقتاً آخر');
            return;
        }
        onTimeChange(slot);
    };

    return (
        <View>
            <Text style={styles.label}>اختر التاريخ</Text>
            <View style={styles.monthRow}>
                <TouchableOpacity
                    onPress={() => {
                        if (currentMonth === 0) {
                            setCurrentMonth(11);
                            setCurrentYear(currentYear - 1);
                        } else setCurrentMonth(currentMonth - 1);
                    }}
                >
                    <Ionicons name="chevron-forward" size={20} color="#1E88E5" />
                </TouchableOpacity>
                <Text style={styles.monthText}>{MONTHS_AR[currentMonth]} {currentYear}</Text>
                <TouchableOpacity
                    onPress={() => {
                        if (currentMonth === 11) {
                            setCurrentMonth(0);
                            setCurrentYear(currentYear + 1);
                        } else setCurrentMonth(currentMonth + 1);
                    }}
                >
                    <Ionicons name="chevron-back" size={20} color="#1E88E5" />
                </TouchableOpacity>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.calendarScroll}
            >
                {calendarDays.map((d) => {
                    const selected = date === d.fullDate;
                    return (
                        <TouchableOpacity
                            key={d.fullDate}
                            style={[styles.dayCard, selected && styles.dayCardActive]}
                            onPress={() => {
                                onDateChange(d.fullDate);
                                if (d.fullDate !== date) onTimeChange('');
                            }}
                        >
                            <Text style={[styles.dayName, selected && styles.dayNameActive]}>{d.dayName}</Text>
                            <View style={[styles.dateCircle, selected && styles.dateCircleActive]}>
                                <Text style={[styles.dateNum, selected && styles.dateNumActive]}>{d.date}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {!date ? (
                <Text style={styles.hint}>اختر يوماً من التقويم أولاً</Text>
            ) : (
                <>
                    <Text style={[styles.label, { marginTop: 16 }]}>اختر الوقت</Text>
                    {loadingSlots ? (
                        <ActivityIndicator color="#1E88E5" style={{ marginVertical: 16 }} />
                    ) : availability.day_off ? (
                        <Text style={styles.dayOff}>الطبيب غير متاح في هذا اليوم</Text>
                    ) : (
                        <View style={styles.slotsGrid}>
                            {timeSlots.map((slot: string) => {
                                const booked = isSlotBookedForDate(availability.booked_slots, date, slot);
                                const selected = time === slot && !booked;
                                return (
                                    <TouchableOpacity
                                        key={slot}
                                        style={[
                                            styles.slotBtn,
                                            selected && styles.slotBtnActive,
                                            booked && styles.slotBtnBooked,
                                        ]}
                                        onPress={() => handleSelectTime(slot)}
                                        activeOpacity={booked ? 1 : 0.8}
                                    >
                                        <Text style={[
                                            styles.slotText,
                                            selected && styles.slotTextActive,
                                            booked && styles.slotTextBooked,
                                        ]}>
                                            {slot}
                                        </Text>
                                        {booked ? (
                                            <Text style={styles.busyLabel}>محجوز</Text>
                                        ) : null}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    label: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right', marginBottom: 10 },
    monthRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    monthText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    calendarScroll: { paddingVertical: 4, gap: 10, flexDirection: 'row-reverse' },
    dayCard: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, borderRadius: 14, minWidth: 56 },
    dayCardActive: { backgroundColor: '#E0F2FE' },
    dayName: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginBottom: 6 },
    dayNameActive: { color: '#1E88E5' },
    dateCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    dateCircleActive: { backgroundColor: '#1E88E5' },
    dateNum: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#475569' },
    dateNumActive: { color: '#FFF' },
    hint: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#94A3B8', textAlign: 'center', marginTop: 8 },
    dayOff: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#DC2626', textAlign: 'right', marginVertical: 8 },
    slotsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
    slotBtn: {
        minWidth: 88,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    slotBtnActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    slotBtnBooked: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB', opacity: 0.85 },
    slotText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#374151' },
    slotTextActive: { color: '#FFF' },
    slotTextBooked: { color: '#9CA3AF', textDecorationLine: 'line-through' },
    busyLabel: { fontSize: 9, fontFamily: 'Cairo_700Bold', color: '#EF4444', marginTop: 2 },
});
