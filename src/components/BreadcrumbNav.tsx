import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Crumb = { label: string; route?: string };

export default function BreadcrumbNav({ items, onBack }: { items: Crumb[]; onBack?: () => void }) {
    const router = useRouter();
    return (
        <View style={styles.row}>
            <TouchableOpacity
                style={styles.backBtn}
                onPress={onBack || (() => router.back())}
            >
                <Ionicons name="chevron-forward" size={22} color="#1E88E5" />
                <Text style={styles.backText}>رجوع</Text>
            </TouchableOpacity>
            <View style={styles.trail}>
                {items.map((item, idx) => (
                    <View key={idx} style={styles.crumbWrap}>
                        {idx > 0 && <Ionicons name="chevron-back" size={12} color="#94A3B8" />}
                        <TouchableOpacity
                            disabled={!item.route}
                            onPress={() => item.route && router.push(item.route as any)}
                        >
                            <Text style={[styles.crumb, idx === items.length - 1 && styles.crumbActive]}>{item.label}</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
    backBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    backText: { fontFamily: 'Cairo_700Bold', fontSize: 13, color: '#1E88E5' },
    trail: { flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: 4, flex: 1, justifyContent: 'flex-start', marginRight: 12 },
    crumbWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    crumb: { fontFamily: 'Cairo_400Regular', fontSize: 11, color: '#94A3B8' },
    crumbActive: { fontFamily: 'Cairo_700Bold', color: '#1E293B' },
});
