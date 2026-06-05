import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../../src/services/api';

const { width } = Dimensions.get('window');

export default function PharmacyProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [pharmacy, setPharmacy] = useState<any>(null);
    const [medicines, setMedicines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [pharmData, medsData] = await Promise.all([
                    api.getPharmacy(id as string),
                    api.getPharmacyMedicines(id as string)
                ]);
                setPharmacy(pharmData);
                setMedicines(medsData);
            } catch (e) {
                console.warn(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const getPhotoUrl = (path: string) => {
        if (!path) return 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=400';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    if (loading) {
        return <View style={styles.loaderArea}><ActivityIndicator size="large" color="#43A047" /></View>;
    }

    if (!pharmacy) {
        return <View style={styles.loaderArea}><Text>الصيدلية غير موجودة</Text></View>;
    }

    return (
        <View style={styles.container}>
            {/* Top Image & Header */}
            <View style={styles.topImageContainer}>
                <Image 
                    source={{ 
                        uri: getPhotoUrl(pharmacy.photo),
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
                    <Text style={styles.pharmacyTitle}>{pharmacy.name}</Text>
                    <View style={styles.locationRow}>
                        <Ionicons name="location" size={16} color="#43A047" />
                        <Text style={styles.locationText}>{pharmacy.address || pharmacy.city}</Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                {/* Info Cards */}
                <View style={styles.infoRow}>
                    <View style={styles.infoCard}>
                        <Ionicons name="time-outline" size={22} color="#1E88E5" />
                        <Text style={styles.infoText}>{pharmacy.open_hours || '08:00 - 23:00'}</Text>
                        <Text style={styles.infoLabel}>أوقات العمل</Text>
                    </View>
                    <View style={styles.infoCard}>
                        <Ionicons name="call-outline" size={22} color="#43A047" />
                        <Text style={styles.infoText}>{pharmacy.phone}</Text>
                        <Text style={styles.infoLabel}>رقم التواصل</Text>
                    </View>
                </View>

                {/* Medicines List */}
                <View style={styles.medsSection}>
                    <Text style={styles.sectionTitle}>الأدوية المتوفرة</Text>

                    {medicines.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="pill-off" size={40} color="#D1D5DB" />
                            <Text style={styles.emptyText}>لا توجد أدوية مدرجة حالياً</Text>
                        </View>
                    ) : (
                        medicines.map((med, idx) => {
                            const isListed = med.stock_status === 'in_stock' && (med.quantity || 0) > 0;
                            const statusLabel = med.stock_status === 'coming_soon' ? 'قريباً' : isListed ? 'متوفر' : 'نَفِد';
                            return (
                            <View key={med.id || idx} style={styles.medCard}>
                                <View style={styles.medImageWrap}>
                                    <Image 
                                        source={{ 
                                            uri: getPhotoUrl(med.image),
                                            headers: { 'Bypass-Tunnel-Reminder': 'true' }
                                        }} 
                                        style={styles.medImage} 
                                    />
                                </View>
                                <View style={styles.medInfo}>
                                    <View style={styles.medHeaderRow}>
                                        <Text style={styles.medName}>{med.name}</Text>
                                        <View style={[styles.stockBadge, isListed ? styles.inStock : styles.outOfStock]}>
                                            <Text style={[styles.stockText, isListed ? styles.inStockText : styles.outOfStockText]}>
                                                {statusLabel}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.medCat}>{med.category}</Text>
                                    <View style={styles.medFooter}>
                                        <Text style={styles.medPrice}>{med.price?.toLocaleString()} ل.س</Text>
                                        <TouchableOpacity style={styles.addBtn} disabled={!isListed}>
                                            <Ionicons name="add" size={20} color={isListed ? "#FFF" : "#9CA3AF"} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                            );
                        })
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
    topImageContainer: { width: '100%', height: 280, position: 'relative' },
    coverImage: { width: '100%', height: '100%' },
    coverOverlay: { position: 'absolute', width: '100%', height: '100%' },
    topBar: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 35, width: '100%', flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    favBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    titleArea: { position: 'absolute', bottom: 20, right: 20, left: 20, alignItems: 'flex-end' },
    pharmacyTitle: { fontSize: 26, fontFamily: 'Cairo_700Bold', color: '#FFF', marginBottom: 5 },
    locationRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
    locationText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#E0E0E0' },
    contentScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', gap: 15, marginBottom: 25 },
    infoCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    infoText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#111827', marginTop: 8 },
    infoLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    medsSection: { flex: 1 },
    sectionTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'right', marginBottom: 15 },
    empty: { alignItems: 'center', marginTop: 40, gap: 10 },
    emptyText: { fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    medCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 12, flexDirection: 'row-reverse', marginBottom: 15, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2 },
    medImageWrap: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F8FAFF', overflow: 'hidden' },
    medImage: { width: '100%', height: '100%' },
    medInfo: { flex: 1, marginRight: 15, justifyContent: 'space-between' },
    medHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
    medName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 10 },
    stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    inStock: { backgroundColor: '#E8F5E9' },
    outOfStock: { backgroundColor: '#FEE2E2' },
    stockText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
    inStockText: { color: '#43A047' },
    outOfStockText: { color: '#EF4444' },
    medCat: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right' },
    medFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    medPrice: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#43A047', justifyContent: 'center', alignItems: 'center' }
});
