import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';

const LAB_PHOTOS = [
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400',
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400'
];

export default function LabsScreen() {
    const router = useRouter();
    const [labs, setLabs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        try {
            const data = await api.getLabs();
            setLabs(data);
        } catch (e) {
            console.warn(e);
        } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1E88E5', '#43A047']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Text style={styles.headerTitle}>المختبرات الطبية</Text>
            </LinearGradient>

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            >
                {loading ? (
                    <ActivityIndicator color="#1E88E5" style={{ marginTop: 40 }} size="large" />
                ) : labs.length === 0 ? (
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="flask-empty-outline" size={60} color="#D1D5DB" />
                        <Text style={styles.emptyText}>لم يتم العثور على مختبرات</Text>
                    </View>
                ) : (
                    labs.map((lab, idx) => (
                        <TouchableOpacity
                            key={lab.id}
                            style={styles.labCard}
                            activeOpacity={0.9}
                            onPress={() => router.push(`/(patient)/labs/${lab.id}` as any)}
                        >
                            <Image
                                source={{ uri: LAB_PHOTOS[idx % LAB_PHOTOS.length] }}
                                style={styles.labPhoto}
                            />
                            <View style={styles.labInfo}>
                                <Text style={styles.labName}>{lab.name}</Text>
                                <View style={styles.metaRow}>
                                    <View style={styles.metaItem}>
                                        <Text style={styles.metaText}>{lab.address || lab.city}</Text>
                                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                                    </View>
                                </View>
                                <View style={styles.metaRow}>
                                    <View style={styles.metaItem}>
                                        <Text style={styles.metaText}>{lab.open_hours || '08:00 - 20:00'}</Text>
                                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.orderBtn}>
                                    <LinearGradient
                                        colors={['#1E88E5', '#43A047']}
                                        style={styles.orderGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Text style={styles.orderBtnText}>عرض التحاليل</Text>
                                        <Ionicons name="flask-outline" size={18} color="#FFF" />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 25,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#fff' },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
    empty: { alignItems: 'center', marginTop: 60, gap: 10 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    labCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    labPhoto: { width: '100%', height: 150 },
    labInfo: { padding: 15 },
    labName: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right', marginBottom: 10 },
    metaRow: { gap: 6, marginBottom: 8 },
    metaItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    metaText: { fontSize: 13, color: '#6B7280', fontFamily: 'Cairo_400Regular', textAlign: 'right' },
    orderBtn: { height: 44, borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    orderGradient: {
        width: '100%',
        height: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10
    },
    orderBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Cairo_700Bold' },
});
