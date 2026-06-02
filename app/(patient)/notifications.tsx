import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Platform, Alert
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
    prescription: { icon: 'pill', color: '#1E88E5', bg: '#E0F2FE' },
    appointment: { icon: 'calendar-check', color: '#43A047', bg: '#F0FDF4' },
    lab_result: { icon: 'flask-outline', color: '#8E24AA', bg: '#F3E8FF' },
    order: { icon: 'package-variant', color: '#E67E22', bg: '#FEF3C7' },
    default: { icon: 'bell-outline', color: '#1E88E5', bg: '#EFF6FF' },
};

export default function Notifications() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifs, setNotifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotifs = async () => {
        if (!user?.id) return;
        try {
            const data = await api.getNotifications(user.id);
            setNotifs(data);
        } catch (e: any) {
            console.error(e);
            Alert.alert('خطأ', e.message || 'تعذر تحميل التنبيهات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadNotifs(); }, [user]);

    const markRead = async (id: string) => {
        try {
            await api.markNotificationRead(id);
            setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) { console.warn(e); }
    };

    const unreadCount = notifs.filter(n => !n.is_read).length;

    const renderItem = ({ item }: { item: any }) => {
        const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.default;
        return (
            <TouchableOpacity 
                style={[styles.card, !item.is_read && styles.unreadCard]} 
                onPress={() => !item.is_read && markRead(item.id)}
                activeOpacity={0.85}
            >
                <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                    <MaterialCommunityIcons name={cfg.icon as any} size={22} color={cfg.color} />
                </View>
                <View style={styles.info}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.msg} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.time}>{item.created_at?.split('T')[0]}</Text>
                </View>
                {!item.is_read && <View style={[styles.dot, { backgroundColor: cfg.color }]} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>التنبيهات</Text>
                        {unreadCount > 0 && (
                            <Text style={styles.headerSub}>{unreadCount} غير مقروء</Text>
                        )}
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator color="#1E88E5" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={notifs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    onRefresh={loadNotifs}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="bell-off-outline" size={60} color="#E2E8F0" />
                            <Text style={styles.emptyTxt}>لا توجد تنبيهات جديدة</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 12, flexDirection: 'row-reverse', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    unreadCard: { borderWidth: 1.5, borderColor: '#BFDBFE', backgroundColor: '#F8FBFF' },
    iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
    info: { flex: 1, alignItems: 'flex-end' },
    title: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    msg: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', marginTop: 4, textAlign: 'right', lineHeight: 18 },
    time: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#94A3B8', marginTop: 8 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTxt: { fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 15 }
});
