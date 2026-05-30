import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Stats = {
    favorites_count?: number;
    weekly_bookings?: number;
    monthly_bookings?: number;
    rating?: number;
};

export default function ProviderStatsBar({ stats, rating }: { stats?: Stats; rating?: number }) {
    if (!stats && !rating) return null;
    const items = [
        { icon: 'heart', label: 'مفضلة', val: stats?.favorites_count ?? 0 },
        { icon: 'calendar-week', label: 'أسبوعي', val: stats?.weekly_bookings ?? 0 },
        { icon: 'calendar-month', label: 'شهري', val: stats?.monthly_bookings ?? 0 },
        { icon: 'star', label: 'تقييم', val: (rating ?? stats?.rating ?? 0).toString() },
    ];
    return (
        <View style={styles.bar}>
            {items.map((item) => (
                <View key={item.label} style={styles.item}>
                    <MaterialCommunityIcons name={item.icon as any} size={16} color="#1E88E5" />
                    <Text style={styles.val}>{item.val}</Text>
                    <Text style={styles.label}>{item.label}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: { flexDirection: 'row-reverse', justifyContent: 'space-around', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 12, marginHorizontal: 20, marginBottom: 16 },
    item: { alignItems: 'center', gap: 2 },
    val: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#1E293B' },
    label: { fontFamily: 'Cairo_400Regular', fontSize: 10, color: '#94A3B8' },
});
