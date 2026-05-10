import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Platform
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';

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
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadNotifs(); }, [user]);

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.card, !item.is_read && styles.unreadCard]}>
            <View style={[styles.iconBox, { backgroundColor: item.type === 'prescription' ? '#E0F2FE' : '#F0FDF4' }]}>
                <MaterialCommunityIcons 
                    name={item.type === 'prescription' ? 'pill' : 'bell-outline'} 
                    size={22} 
                    color={item.type === 'prescription' ? '#0284C7' : '#16A34A'} 
                />
            </View>
            <View style={styles.info}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.msg}>{item.message}</Text>
                <Text style={styles.time}>{item.created_at.split('T')[0]}</Text>
            </View>
            {!item.is_read && <View style={styles.dot} />}
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>التنبيهات</Text>
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
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20 },
    card: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 12, flexDirection: 'row-reverse', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    unreadCard: { borderWidth: 1, borderColor: '#E0F2FE', backgroundColor: '#F8FBFF' },
    iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
    info: { flex: 1, alignItems: 'flex-end' },
    title: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    msg: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', marginTop: 4, textAlign: 'right' },
    time: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#94A3B8', marginTop: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1E88E5', marginRight: 10 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTxt: { fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 15 }
});
