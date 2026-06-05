import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useProviderTabBarClearance } from '../constants/layout';
import { FONTS } from '../constants/typography';

type Props = {
    title: string;
    icon: string;
    accent?: string;
};

export default function ProviderProfileScreen({ title, icon, accent = '#1E88E5' }: Props) {
    const { user, logout } = useAuth();
    const bottomPad = useProviderTabBarClearance();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: bottomPad }}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient colors={[accent, '#43A047']} style={styles.header}>
                <View style={styles.avatar}>
                    <MaterialCommunityIcons name={icon as any} size={36} color={accent} />
                </View>
                <Text style={styles.name}>{user?.name || title}</Text>
                <Text style={styles.role}>{title}</Text>
            </LinearGradient>

            <View style={styles.card}>
                {[
                    { label: 'البريد', value: user?.email, icon: 'email-outline' },
                    { label: 'الهاتف', value: user?.phone, icon: 'phone-outline' },
                    { label: 'المدينة', value: user?.city, icon: 'map-marker-outline' },
                    { label: 'العنوان', value: user?.clinic_address || user?.address, icon: 'home-outline' },
                ].map(row => row.value ? (
                    <View key={row.label} style={styles.row}>
                        <Text style={styles.rowVal}>{row.value}</Text>
                        <View style={styles.rowLabelWrap}>
                            <Text style={styles.rowLabel}>{row.label}</Text>
                            <MaterialCommunityIcons name={row.icon as any} size={16} color="#64748B" />
                        </View>
                    </View>
                ) : null)}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F6FA' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 48,
        paddingBottom: 32,
        paddingHorizontal: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    name: { fontSize: 22, fontFamily: FONTS.bold, color: '#FFF' },
    role: { fontSize: 13, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    card: {
        margin: 16,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    row: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    rowLabelWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    rowLabel: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#64748B' },
    rowVal: { fontSize: 14, fontFamily: FONTS.regular, color: '#1E293B', flex: 1, textAlign: 'left' },
    logoutBtn: {
        marginHorizontal: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FEE2E2',
        borderRadius: 14,
        paddingVertical: 14,
    },
    logoutText: { fontSize: 15, fontFamily: FONTS.bold, color: '#EF4444' },
});
