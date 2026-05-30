import React from 'react';
import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from 'react-native';

export const ARABIC_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const ARABIC_MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];

export function generateMonthDays(month: number, year: number) {
    const days: { dayName: string; date: string; fullDate: string }[] = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        days.push({
            dayName: ARABIC_WEEKDAYS[date.getDay()],
            date: date.getDate().toString().padStart(2, '0'),
            fullDate: date.toISOString().split('T')[0],
        });
        date.setDate(date.getDate() + 1);
    }
    return days;
}

type Props = {
    month: number;
    year: number;
    selectedDate: string;
    onSelect: (fullDate: string) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
};

export default function ArabicCalendar({ month, year, selectedDate, onSelect, onPrevMonth, onNextMonth }: Props) {
    const days = generateMonthDays(month, year);
    return (
        <View style={styles.wrap}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onPrevMonth}><Text style={styles.nav}>◀</Text></TouchableOpacity>
                <Text style={styles.title}>{ARABIC_MONTHS[month]} {year}</Text>
                <TouchableOpacity onPress={onNextMonth}><Text style={styles.nav}>▶</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {days.map((d) => {
                    const active = selectedDate === d.fullDate;
                    return (
                        <TouchableOpacity key={d.fullDate} style={[styles.day, active && styles.dayActive]} onPress={() => onSelect(d.fullDate)}>
                            <Text style={[styles.dayName, active && styles.dayNameActive]}>{d.dayName.substring(0, 3)}</Text>
                            <Text style={[styles.dayNum, active && styles.dayNumActive]}>{d.date}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginBottom: 16 },
    header: { flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 12, paddingHorizontal: 20 },
    title: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E88E5' },
    nav: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E88E5', padding: 8 },
    scroll: { paddingHorizontal: 16, gap: 12, flexDirection: 'row-reverse' },
    day: { alignItems: 'center', padding: 10, borderRadius: 16, backgroundColor: '#FFF', minWidth: 56, borderWidth: 1, borderColor: '#F1F5F9' },
    dayActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    dayName: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, color: '#64748B', marginBottom: 4 },
    dayNameActive: { color: 'rgba(255,255,255,0.9)' },
    dayNum: { fontFamily: 'Cairo_700Bold', fontSize: 15, color: '#1E293B' },
    dayNumActive: { color: '#FFF' },
});
