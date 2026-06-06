import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { TAB_BAR_CLEARANCE } from '../../src/constants/layout';

export default function SecretaryProfile() {
    const { user, logout } = useAuth();
    const [supervisor, setSupervisor] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.supervisor_id) {
            setLoading(false);
            return;
        }
        api.getDoctor(user.supervisor_id)
            .then(setSupervisor)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [user?.supervisor_id]);

    const handleLogout = () => {
        Alert.alert('تسجيل الخروج', 'هل تريد الخروج من الحساب؟', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'خروج', style: 'destructive', onPress: logout },
        ]);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={36} color="#1E88E5" />
                </View>
                <Text style={styles.name}>{user?.name}</Text>
                <Text style={styles.role}>سكرتارية العيادة</Text>
            </LinearGradient>

            <Animated.View entering={FadeInUp.delay(150)} style={styles.card}>
                <Text style={styles.cardTitle}>الطبيب المشرف</Text>
                {loading ? (
                    <ActivityIndicator color="#1E88E5" style={{ marginVertical: 12 }} />
                ) : supervisor ? (
                    <>
                        <View style={styles.row}>
                            <Text style={styles.rowVal}>د. {supervisor.name}</Text>
                            <Ionicons name="medical" size={18} color="#64748B" />
                        </View>
                        {supervisor.specialization ? (
                            <View style={styles.row}>
                                <Text style={styles.rowVal}>{supervisor.specialization}</Text>
                                <Ionicons name="ribbon-outline" size={18} color="#64748B" />
                            </View>
                        ) : null}
                        {supervisor.clinic_name ? (
                            <View style={styles.row}>
                                <Text style={styles.rowVal}>{supervisor.clinic_name}</Text>
                                <Ionicons name="business-outline" size={18} color="#64748B" />
                            </View>
                        ) : null}
                    </>
                ) : (
                    <Text style={styles.muted}>لم يتم ربط حسابك بطبيب بعد</Text>
                )}
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(250)} style={styles.card}>
                <Text style={styles.cardTitle}>معلومات الحساب</Text>
                <View style={styles.row}>
                    <Text style={styles.rowVal}>{user?.email}</Text>
                    <Ionicons name="mail-outline" size={18} color="#64748B" />
                </View>
                {user?.phone ? (
                    <View style={styles.row}>
                        <Text style={styles.rowVal}>{user.phone}</Text>
                        <Ionicons name="call-outline" size={18} color="#64748B" />
                    </View>
                ) : null}
            </Animated.View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 32,
        alignItems: 'center',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    name: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    role: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    card: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    cardTitle: {
        fontSize: 15,
        fontFamily: 'Cairo_700Bold',
        color: '#1E293B',
        textAlign: 'right',
        marginBottom: 14,
    },
    row: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    rowVal: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#475569', flex: 1, textAlign: 'right', marginRight: 10 },
    muted: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#94A3B8', textAlign: 'right' },
    logoutBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: 24,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    logoutText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#EF4444' },
});
