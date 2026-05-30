import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

const TYPE_ICONS: Record<string, string> = {
    appointment: 'calendar-clock',
    appointment_confirmed: 'calendar-check',
    appointment_rejected: 'calendar-remove',
    reschedule_request: 'calendar-edit',
    cancel_request: 'calendar-remove',
    prescription: 'pill',
    prescription_substitution: 'pill-off',
    manual_appointment: 'account-clock',
};

export default function DoctorNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        if (!user?.id) return;
        try {
            const data = await api.getUserNotifications(user.id);
            setNotifications(data);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user]);

    const markRead = async (id: string) => {
        await api.markUserNotificationRead(id);
        load();
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <Text style={styles.title}>الإشعارات</Text>
            </LinearGradient>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                ListEmptyComponent={<Text style={styles.empty}>لا توجد إشعارات</Text>}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.card, !item.is_read && styles.unread]}
                        onPress={() => markRead(item.id)}
                    >
                        <View style={styles.iconBox}>
                            <MaterialCommunityIcons name={(TYPE_ICONS[item.type] || 'bell') as any} size={22} color="#1E88E5" />
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardMsg}>{item.message}</Text>
                            <Text style={styles.cardDate}>{item.created_at?.split('T')[0]}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 24, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    title: { fontFamily: 'Cairo_700Bold', fontSize: 22, color: '#FFF' },
    empty: { textAlign: 'center', marginTop: 60, fontFamily: 'Cairo_400Regular', color: '#94A3B8' },
    card: { flexDirection: 'row-reverse', backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    unread: { borderColor: '#BFDBFE', backgroundColor: '#F0F9FF' },
    iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    info: { flex: 1, alignItems: 'flex-end' },
    cardTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#1E293B' },
    cardMsg: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: '#64748B', textAlign: 'right', marginTop: 4 },
    cardDate: { fontFamily: 'Cairo_400Regular', fontSize: 10, color: '#94A3B8', marginTop: 6 },
});
