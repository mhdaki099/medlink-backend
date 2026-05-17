import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, TextInput, ActivityIndicator, RefreshControl, Dimensions, Platform,
    Pressable
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import Animated, { 
    FadeInUp, FadeInRight, FadeInDown, FadeOutDown, 
    useAnimatedStyle, withSpring, useSharedValue, withTiming, runOnJS
} from 'react-native-reanimated';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

// We use the Logo Design asset
const LOGO_IMG = require('../../assets/Logo Design.png');

const SLIDER_WIDTH = width - 80;
const KNOB_SIZE = 50;

export default function PharmaciesScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [medicines, setMedicines] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [cart, setCart] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<any[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCat, setSelectedCat] = useState('الكل');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCart, setShowCart] = useState(false);
    
    const patientId = user?.id || "guest"; // Use real user ID

    // Slider Shared Values
    const sliderPos = useSharedValue(0);

    const loadData = async () => {
        try {
            const [meds, cats, favMeds, cartItems] = await Promise.all([
                api.getAllMedicines(),
                api.get<string[]>('/pharmacies/medicines/categories'),
                api.get<any[]>(`/pharmacies/medicines/favorites/${patientId}`),
                api.getCart(patientId)
            ]);
            setMedicines(meds);
            setFiltered(meds);
            setCategories(['الكل', ...cats]);
            setFavorites(new Set(favMeds.map(f => f.id)));
            setCart(cartItems);
        } catch (e) {
            console.warn(e);
        } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        let result = medicines;
        if (selectedCat !== 'الكل') {
            result = result.filter(m => m.category === selectedCat);
        }
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(m =>
                m.name?.toLowerCase().includes(q) ||
                m.name_en?.toLowerCase().includes(q) ||
                m.category?.toLowerCase().includes(q)
            );
        }
        setFiltered(result);
    }, [search, selectedCat, medicines]);

    const toggleFavorite = async (medId: string) => {
        try {
            const res = await api.toggleMedicineFavorite(medId, patientId);
            const newFavs = new Set(favorites);
            if (res.is_favorite) newFavs.add(medId);
            else newFavs.delete(medId);
            setFavorites(newFavs);
        } catch (e) {
            console.warn("Fav error:", e);
        }
    };

    const addToCart = async (medId: string) => {
        try {
            await api.addToCart(medId, patientId);
            const cartItems = await api.getCart(patientId);
            setCart([...cartItems]); // Force re-render with new array
        } catch (e) {
            console.warn("Cart error:", e);
        }
    };

    const updateCartQty = async (medId: string, action: 'add' | 'decrease') => {
        try {
            if (action === 'add') await api.addToCart(medId, patientId);
            else await api.decreaseCartItem(medId, patientId);
            const cartItems = await api.getCart(patientId);
            setCart([...cartItems]); // Use spread to ensure reference change
        } catch (e) { console.warn(e); }
    };

    const removeFromCart = async (medId: string) => {
        try {
            await api.removeFromCart(medId, patientId);
            const cartItems = await api.getCart(patientId);
            setCart([...cartItems]);
        } catch (e) { console.warn(e); }
    };

    const getImg = (path: string) => {
        if (!path) return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80';
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/api$/, '')}${path}`;
    };

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

    const handleCheckout = async () => {
        try {
            // Group cart items by pharmacy
            const grouped: Record<string, any[]> = {};
            for (const item of cart) {
                const pid = item.pharmacy_id || 'unknown';
                if (!grouped[pid]) grouped[pid] = [];
                grouped[pid].push(item);
            }
            // Create order per pharmacy
            for (const [pharmacyId, items] of Object.entries(grouped)) {
                const total = items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0);
                await api.createOrder({
                    patient_id: patientId,
                    pharmacy_id: pharmacyId,
                    items: items.map((i: any) => ({ medicine_id: i.id, qty: i.quantity, price: i.price })),
                    total,
                    delivery_address: '',
                });
            }
            // Clear cart
            for (const item of cart) {
                await api.removeFromCart(item.id, patientId);
            }
            setCart([]);
            setShowCart(false);
            alert('تم إرسال طلبك بنجاح! سيتم مراجعته من الصيدلية ✅');
        } catch (e: any) {
            alert('خطأ في إرسال الطلب: ' + (e.message || ''));
        }
    };

    const sliderKnobStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: sliderPos.value }]
    }));

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                {/* Clean Header */}
                <View style={styles.topHeader}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="chevron-forward" size={24} color="#1E88E5" />
                        </TouchableOpacity>

                        <Animated.View entering={FadeInUp.delay(200)} style={styles.logoContainer}>
                            <Image source={LOGO_IMG} style={styles.logo} resizeMode="contain" />
                            <Text style={styles.headerTitle}>المنتجات الطبية</Text>
                        </Animated.View>

                        <TouchableOpacity style={styles.cartBtn} onPress={() => setShowCart(true)}>
                            <Ionicons name="cart-outline" size={24} color="#1E88E5" />
                            {cartCount > 0 && (
                                <View style={styles.cartBadge}>
                                    <Text style={styles.cartBadgeText}>{cartCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBox}>
                        <TextInput
                            style={styles.search}
                            placeholder="ابحث عن دواء، مسكن، فيتامين..."
                            value={search}
                            onChangeText={setSearch}
                            textAlign="right"
                            placeholderTextColor="#9CA3AF"
                        />
                        <Ionicons name="search" size={20} color="#9CA3AF" />
                    </View>
                </View>

                {/* Category Filter */}
                <View style={{ height: 60, marginTop: 5 }}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, alignItems: 'center' }}
                    >
                        {categories.map((cat, idx) => (
                            <Animated.View key={cat} entering={FadeInRight.delay(idx * 100)}>
                                <TouchableOpacity
                                    onPress={() => setSelectedCat(cat)}
                                    style={[styles.catChip, selectedCat === cat && styles.catChipActive]}
                                >
                                    <Text style={[styles.catLabel, selectedCat === cat && { color: '#FFF' }]}>{cat}</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </ScrollView>
                </View>

                {/* Medicines List */}
                <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
                >
                    {loading ? (
                        <ActivityIndicator color="#1E88E5" style={{ marginTop: 40 }} size="large" />
                    ) : filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="pill-off" size={60} color="#D1D5DB" />
                            <Text style={styles.emptyText}>لم نجد نتائج مطابقة لبحثك</Text>
                        </View>
                    ) : (
                        <View style={styles.grid}>
                            {filtered.map((med, idx) => (
                                <Animated.View
                                    key={med.id}
                                    entering={FadeInUp.delay(idx * 50)}
                                    style={styles.medCardWrapper}
                                >
                                    <TouchableOpacity
                                        style={styles.medCard}
                                        activeOpacity={1}
                                    >
                                        <View style={styles.cardTop}>
                                            <View style={styles.imageContainer}>
                                                <Image
                                                    source={{ uri: getImg(med.image) }}
                                                    style={styles.medImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                            <TouchableOpacity
                                                style={styles.favBtn}
                                                onPress={() => toggleFavorite(med.id)}
                                            >
                                                <Ionicons
                                                    name={favorites.has(med.id) ? "heart" : "heart-outline"}
                                                    size={18}
                                                    color={favorites.has(med.id) ? "#EF4444" : "#111827"}
                                                />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.cardContent}>
                                            <View style={styles.infoCol}>
                                                <Text style={styles.medNameText} numberOfLines={1}>{med.name}</Text>
                                                <Text style={styles.medDosageText}>{med.dosage || '500 mg'}</Text>
                                                <Text style={styles.pharmacyNameText} numberOfLines={1}>{med.pharmacy_name || 'صيدلية الشفاء'}</Text>
                                            </View>

                                            <View style={styles.bottomRow}>
                                                <View style={styles.priceContainer}>
                                                    <Text style={styles.priceVal}>{med.price?.toLocaleString()} ل.س</Text>
                                                    {med.old_price && (
                                                        <Text style={styles.oldPriceVal}>{med.old_price?.toLocaleString()} ل.س</Text>
                                                    )}
                                                </View>
                                                <TouchableOpacity 
                                                    style={styles.actionBtn}
                                                    onPress={() => addToCart(med.id)}
                                                >
                                                    <Ionicons name="add" size={20} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* Shopping Cart Slider (Slide-up Sheet) */}
                {showCart && (
                    <View style={styles.cartOverlay}>
                        <Pressable style={styles.dismissArea} onPress={() => setShowCart(false)} />
                        <Animated.View 
                            entering={FadeInDown.springify().damping(15)} 
                            exiting={FadeOutDown}
                            style={styles.cartSheet}
                        >
                            <View style={styles.sheetHeader}>
                                <View style={styles.sheetHandle} />
                                <View style={styles.sheetTitleRow}>
                                    <TouchableOpacity onPress={() => setShowCart(false)}>
                                        <Ionicons name="close" size={24} color="#111827" />
                                    </TouchableOpacity>
                                    <Text style={styles.sheetTitle}>سلة المشتريات</Text>
                                </View>
                            </View>

                            <ScrollView style={styles.cartList} showsVerticalScrollIndicator={false}>
                                {cart.length === 0 ? (
                                    <View style={styles.emptyCart}>
                                        <Ionicons name="cart-outline" size={80} color="#E5E7EB" />
                                        <Text style={styles.emptyCartText}>السلة فارغة حالياً</Text>
                                    </View>
                                ) : (
                                    cart.map((item) => (
                                        <View key={item.id} style={styles.cartItem}>
                                            <Image source={{ uri: getImg(item.image) }} style={styles.cartItemImg} />
                                            <View style={styles.cartItemInfo}>
                                                <Text style={styles.cartItemName}>{item.name}</Text>
                                                <Text style={styles.cartItemPharmacy}>{item.pharmacy_name}</Text>
                                                <Text style={styles.cartItemPrice}>{item.price?.toLocaleString()} ل.س</Text>
                                            </View>
                                            <View style={styles.qtyControls}>
                                                <TouchableOpacity 
                                                    style={styles.qtyBtn}
                                                    onPress={() => updateCartQty(item.id, 'add')}
                                                >
                                                    <Ionicons name="add" size={18} color="#1E88E5" />
                                                </TouchableOpacity>
                                                <Text style={styles.qtyText}>{item.quantity}</Text>
                                                <TouchableOpacity 
                                                    style={styles.qtyBtn}
                                                    onPress={() => updateCartQty(item.id, 'decrease')}
                                                >
                                                    <Ionicons name="remove" size={18} color="#64748B" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>

                            {cart.length > 0 && (
                                <View style={styles.cartFooter}>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalPrice}>{cartTotal.toLocaleString()} ل.س</Text>
                                        <Text style={styles.totalLabel}>الإجمالي</Text>
                                    </View>
                                    
                                    {/* Submit Order Button (Req #10 - replaces broken slider) */}
                                    <TouchableOpacity
                                        style={styles.submitOrderBtn}
                                        onPress={handleCheckout}
                                    >
                                        <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                                        <Text style={styles.submitOrderText}>إرسال الطلب</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Animated.View>
                    </View>
                )}
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    topHeader: {
        paddingTop: Platform.OS === 'ios' ? 50 : 35,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#FFF',
    },
    headerRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 1
    },
    logo: {
        width: 100, 
        height: 32, 
    },
    cartBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    cartBadge: {
        position: 'absolute',
        top: -5,
        left: -5,
        backgroundColor: '#EF4444',
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    cartBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontFamily: 'Cairo_700Bold',
    },
    headerTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    searchBox: {
        backgroundColor: '#F3F4F6',
        borderRadius: 15,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        gap: 10,
    },
    search: {
        flex: 1,
        height: '100%',
        fontSize: 14,
        fontFamily: 'Cairo_400Regular',
        color: '#111827',
    },
    catChip: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 15,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    catChipActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    catLabel: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    list: { flex: 1 },
    grid: {
        flexDirection: 'row-reverse',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 5
    },
    medCardWrapper: {
        width: (width - 48) / 2.13,
        marginBottom: 20,
        overflow: 'visible',
    },
    medCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 0,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        marginTop: 15,
    },
    cardTop: {
        height: 100,
        width: '100%',
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'visible',
    },
    imageContainer: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: -25,
        left: -15,
        zIndex: 100,
    },
    medImage: {
        width: '100%', 
        height: '160%', 
        transform: [{ rotate: '-15deg' }] 
    },
    favBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
        zIndex: 110,
    },
    cardContent: {
        padding: 10,
    },
    infoCol: {
        alignItems: 'flex-end',
    },
    medNameText: {
        fontSize: 14,
        fontFamily: 'Cairo_700Bold',
        color: '#1E293B',
        textAlign: 'right'
    },
    medDosageText: {
        fontSize: 12,
        fontFamily: 'Cairo_400Regular',
        color: '#64748B',
        textAlign: 'right'
    },
    pharmacyNameText: {
        fontSize: 10,
        fontFamily: 'Cairo_400Regular',
        color: '#94A3B8',
        marginTop: 2,
        textAlign: 'right'
    },
    bottomRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    priceVal: {
        fontSize: 13,
        fontFamily: 'Cairo_700Bold',
        color: '#111827'
    },
    oldPriceVal: {
        fontSize: 10,
        fontFamily: 'Cairo_400Regular',
        color: '#94A3B8',
        textDecorationLine: 'line-through'
    },
    actionBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#1E88E5', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: { alignItems: 'center', marginTop: 80, gap: 15 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#94A3B8' },

    // --- Cart Styles ---
    cartOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
    },
    dismissArea: { flex: 1 },
    cartSheet: {
        height: SCREEN_HEIGHT * 0.8, // Increased height to accommodate bottom padding
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 20,
        paddingBottom: 110, // HUGE padding to completely clear the bottom navigation bar
    },
    sheetHeader: {
        alignItems: 'center',
        marginBottom: 15,
    },
    sheetHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginBottom: 15,
    },
    sheetTitleRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
    },
    sheetTitle: {
        fontSize: 20,
        fontFamily: 'Cairo_700Bold',
        color: '#111827',
    },
    cartList: { flex: 1, marginTop: 10 },
    cartItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 15,
        padding: 12,
        marginBottom: 12,
    },
    cartItemImg: {
        width: 50,
        height: 50,
        borderRadius: 10,
    },
    cartItemInfo: {
        flex: 1,
        marginHorizontal: 15,
        alignItems: 'flex-end',
    },
    cartItemName: {
        fontSize: 14,
        fontFamily: 'Cairo_700Bold',
        color: '#111827',
    },
    cartItemPharmacy: {
        fontSize: 10,
        fontFamily: 'Cairo_400Regular',
        color: '#64748B',
    },
    cartItemPrice: {
        fontSize: 12,
        fontFamily: 'Cairo_700Bold',
        color: '#1E88E5',
    },
    qtyControls: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 10,
        padding: 4,
        gap: 10,
    },
    qtyBtn: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    qtyText: {
        fontSize: 14,
        fontFamily: 'Cairo_700Bold',
        color: '#111827',
    },
    cartFooter: {
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 15,
        gap: 10,
        marginBottom: 20, 
    },
    totalRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    totalLabel: {
        fontSize: 16,
        fontFamily: 'Cairo_600SemiBold',
        color: '#111827',
    },
    totalPrice: {
        fontSize: 18, // Bit smaller to fit
        fontFamily: 'Cairo_700Bold',
        color: '#1E88E5',
    },
    
    // --- Slider Button ---
    sliderWrapper: {
        width: '100%',
        height: 60,
        backgroundColor: '#F3F4F6',
        borderRadius: 30,
        position: 'relative',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    sliderTrack: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 40,
    },
    sliderText: {
        fontSize: 11,
        fontFamily: 'Cairo_700Bold',
        color: '#94A3B8',
        textAlign: 'center',
    },
    sliderKnob: {
        width: SLIDER_WIDTH / 4,
        height: 52,
        backgroundColor: '#111827',
        borderRadius: 26,
        position: 'absolute',
        right: 4, 
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitOrderBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#43A047',
        borderRadius: 30,
        height: 56,
        gap: 8,
        marginTop: 8,
    },
    submitOrderText: {
        fontSize: 16,
        fontFamily: 'Cairo_700Bold',
        color: '#FFF',
    },

    emptyCart: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 60,
        gap: 15,
    },
    emptyCartText: {
        fontSize: 16,
        fontFamily: 'Cairo_400Regular',
        color: '#64748B',
    },
});
