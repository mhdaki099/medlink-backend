import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Platform, Alert, Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function MedicineDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [medicine, setMedicine] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.getMedicineDetails(id as string);
                setMedicine(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const getImg = (path: string) => {
        if (!path) return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    const handleAddToCart = async () => {
        if (!user?.id) { Alert.alert('تنبيه', 'يجب تسجيل الدخول أولاً'); return; }
        setAddingToCart(true);
        try {
            await api.addToCart(id as string, user.id);
            Alert.alert('✅ تمت الإضافة', 'تم إضافة الدواء إلى سلة المشتريات');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setAddingToCart(false);
        }
    };

    const handleToggleFavorite = async () => {
        if (!user?.id) return;
        try {
            const res = await api.toggleMedicineFavorite(id as string, user.id);
            setIsFavorite(res.is_favorite);
        } catch (e) { console.error(e); }
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#1E88E5" />
        </View>
    );

    if (!medicine) return (
        <View style={styles.center}>
            <Text style={styles.errorText}>الدواء غير موجود</Text>
        </View>
    );

    const sections = [
        { title: 'المادة الفعالة', content: medicine.active_ingredients, icon: 'molecule', color: '#1E88E5' },
        { title: 'الاستخدامات', content: medicine.usage_info, icon: 'information-outline', color: '#43A047' },
        { title: 'الآثار الجانبية', content: medicine.side_effects, icon: 'alert-circle-outline', color: '#F59E0B' },
        { title: 'التحذيرات', content: medicine.warnings, icon: 'shield-alert-outline', color: '#EF4444' },
        { title: 'موانع الاستخدام', content: medicine.contraindications, icon: 'cancel', color: '#7C3AED' },
    ].filter(s => s.content);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleToggleFavorite} style={styles.favBtn}>
                        <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
                <View style={styles.headerContent}>
                    <Image source={{ uri: getImg(medicine.image) }} style={styles.medImage} resizeMode="contain" />
                    <Text style={styles.medName}>{medicine.name}</Text>
                    {medicine.name_en && <Text style={styles.medNameEn}>{medicine.name_en}</Text>}
                    {medicine.dosage && <Text style={styles.medDosage}>{medicine.dosage}</Text>}
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Quick Info */}
                <View style={styles.quickInfoRow}>
                    <View style={styles.quickInfoCard}>
                        <MaterialCommunityIcons name="currency-usd" size={20} color="#1E88E5" />
                        <Text style={styles.quickInfoVal}>{medicine.price?.toLocaleString()} ل.س</Text>
                        <Text style={styles.quickInfoLabel}>السعر</Text>
                    </View>
                    <View style={styles.quickInfoCard}>
                        <MaterialCommunityIcons name="pill" size={20} color="#43A047" />
                        <Text style={styles.quickInfoVal}>{medicine.stock_status === 'in_stock' ? 'متوفر' : 'غير متوفر'}</Text>
                        <Text style={styles.quickInfoLabel}>التوفر</Text>
                    </View>
                    <View style={styles.quickInfoCard}>
                        <MaterialCommunityIcons name="hospital-building" size={20} color="#8E24AA" />
                        <Text style={styles.quickInfoVal} numberOfLines={1}>{medicine.pharmacy?.name || medicine.pharmacy_name || 'صيدلية'}</Text>
                        <Text style={styles.quickInfoLabel}>الصيدلية</Text>
                    </View>
                    {medicine.requires_prescription && (
                        <View style={[styles.quickInfoCard, { backgroundColor: '#FEF2F2' }]}>
                            <MaterialCommunityIcons name="prescription" size={20} color="#EF4444" />
                            <Text style={[styles.quickInfoVal, { color: '#EF4444', fontSize: 11 }]}>يحتاج وصفة</Text>
                            <Text style={styles.quickInfoLabel}>الوصفة</Text>
                        </View>
                    )}
                </View>

                {/* Manufacturer */}
                {medicine.manufacturer && (
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="factory" size={18} color="#64748B" />
                        <Text style={styles.infoText}>الشركة المصنعة: {medicine.manufacturer}</Text>
                    </View>
                )}

                {/* Detail Sections */}
                {sections.map((sec) => (
                    <View key={sec.title} style={styles.section}>
                        <View style={[styles.sectionHeader, { borderLeftColor: sec.color }]}>
                            <MaterialCommunityIcons name={sec.icon as any} size={20} color={sec.color} />
                            <Text style={[styles.sectionTitle, { color: sec.color }]}>{sec.title}</Text>
                        </View>
                        <Text style={styles.sectionContent}>{sec.content}</Text>
                    </View>
                ))}

                {sections.length === 0 && (
                    <View style={styles.noInfoBox}>
                        <MaterialCommunityIcons name="information-off-outline" size={40} color="#D1D5DB" />
                        <Text style={styles.noInfoText}>لا تتوفر معلومات تفصيلية لهذا الدواء حالياً</Text>
                    </View>
                )}
            </ScrollView>

            {/* Add to Cart Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.cartBtn, addingToCart && { opacity: 0.7 }]}
                    onPress={handleAddToCart}
                    disabled={addingToCart || medicine.stock_status === 'out_of_stock'}
                >
                    <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.cartBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        {addingToCart ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="cart-plus" size={22} color="#FFF" />
                                <Text style={styles.cartBtnText}>
                                    {medicine.stock_status === 'out_of_stock' ? 'غير متوفر' : 'إضافة إلى السلة'}
                                </Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontFamily: 'Cairo_400Regular', color: '#64748B', fontSize: 16 },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
    },
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    favBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerContent: { alignItems: 'center' },
    medImage: { width: 120, height: 120, marginBottom: 12 },
    medName: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF', textAlign: 'center' },
    medNameEn: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
    medDosage: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    quickInfoRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    quickInfoCard: { flex: 1, minWidth: 70, backgroundColor: '#FFF', borderRadius: 16, padding: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    quickInfoVal: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#1E293B', marginTop: 4, textAlign: 'center' },
    quickInfoLabel: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#94A3B8', marginTop: 2 },
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 12 },
    infoText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    section: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
    sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderLeftWidth: 3, paddingLeft: 8, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold' },
    sectionContent: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#374151', lineHeight: 24, textAlign: 'right' },
    noInfoBox: { alignItems: 'center', marginTop: 40, gap: 12 },
    noInfoText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#94A3B8', textAlign: 'center' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    cartBtn: { height: 56, borderRadius: 28, overflow: 'hidden' },
    cartBtnGrad: { flex: 1, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 10 },
    cartBtnText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
