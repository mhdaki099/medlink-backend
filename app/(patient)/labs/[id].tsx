import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../../src/services/api';

export default function LabProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [lab, setLab] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [labData, testsData] = await Promise.all([
                    api.getLab(id as string),
                    api.getLabTests(id as string)
                ]);
                setLab(labData);
                setTests(testsData);
            } catch (e) {
                console.warn(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const getPhotoUrl = (path: string) => {
        if (!path) return 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    if (loading) {
        return <View style={styles.loaderArea}><ActivityIndicator size="large" color="#43A047" /></View>;
    }

    if (!lab) {
        return <View style={styles.loaderArea}><Text>المختبر غير موجود</Text></View>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.topImageContainer}>
                <Image 
                    source={{ 
                        uri: getPhotoUrl(lab.photo),
                        headers: { 'Bypass-Tunnel-Reminder': 'true' }
                    }} 
                    style={styles.coverImage} 
                />
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.coverOverlay}
                />
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.favBtn}>
                        <Ionicons name="heart-outline" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.titleArea}>
                    <Text style={styles.labTitle}>{lab.name}</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={16} color="#43A047" />
                        <Text style={styles.locationText}>{lab.address || lab.city}</Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.infoRow}>
                    <View style={styles.infoCard}>
                        <Ionicons name="time-outline" size={22} color="#1E88E5" />
                        <Text style={styles.infoText}>{lab.open_hours || '08:00 - 20:00'}</Text>
                        <Text style={styles.infoLabel}>أوقات العمل</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Ionicons name="call-outline" size={22} color="#43A047" />
                        <Text style={styles.infoText}>{lab.phone}</Text>
                        <Text style={styles.infoLabel}>رقم التواصل</Text>
                    </View>
                </View>

                <View style={styles.testsSection}>
                    <Text style={styles.sectionTitle}>التحاليل المتوفرة</Text>

                    {tests.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="flask-empty-outline" size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>لا توجد تحاليل مدرجة حالياً</Text>
                        </View>
                    ) : (
                        tests.map((test, idx) => (
                            <View key={test.id || idx} style={styles.testCard}>
                                <View style={styles.testHeaderRow}>
                                    <Text style={styles.testName}>{test.name}</Text>
                                    <Text style={styles.testPrice}>{test.price?.toLocaleString()} ل.س</Text>
                                </View>
                                <Text style={styles.testDesc}>{test.description}</Text>
                                <View style={styles.testMeta}>
                                    <View style={styles.metaBadge}>
                                        <Ionicons name="time-outline" size={14} color="#1E88E5" />
                                        <Text style={styles.metaBadgeText}>{test.duration_hours} ساعات</Text>
                                    </View>
                                    {test.preparation && (
                                        <View style={[styles.metaBadge, { backgroundColor: '#FFF9C4' }]}>
                                            <Ionicons name="information-circle-outline" size={14} color="#F57F17" />
                                            <Text style={[styles.metaBadgeText, { color: '#F57F17' }]}>{test.preparation}</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity style={styles.bookBtn}>
                                    <Text style={styles.bookBtnText}>حجز التحليل</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    loaderArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topImageContainer: { width: '100%', height: 260, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverOverlay: { position: 'absolute', width: '100%', height: '100%' },
    topBar: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 35, width: '100%', flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    favBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    titleArea: { position: 'absolute', bottom: 20, right: 20, left: 20, alignItems: 'flex-end' },
    labTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#FFF', marginBottom: 5 },
    locationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    locationText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#E0E0E0' },
    contentScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 15, marginBottom: 25 },
    infoCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    infoText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#111827', marginTop: 8 },
    infoLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    testsSection: { flex: 1 },
    sectionTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right', marginBottom: 15 },
    empty: { alignItems: 'center', marginTop: 40, gap: 10 },
    emptyText: { fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    testCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    testHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    testName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 10 },
    testPrice: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#43A047' },
    testDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right', marginBottom: 12 },
    testMeta: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    metaBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    metaBadgeText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    bookBtn: { width: '100%', height: 42, borderRadius: 10, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center' },
    bookBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Cairo_700Bold' },
});
