import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Animated,
    Platform,
    StatusBar,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Card dimensions for the "Stacked" look
const CARD_WIDTH = width * 0.72;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

const ROLES = [
    { id: 'patient', label: 'مريض', icon: 'account-heart', desc: 'احجز المواعيد وادِر سجلاتك الصحية بسهولة وأمان.' },
    { id: 'doctor', label: 'طبيب', icon: 'stethoscope', desc: 'أدر عيادتك وتواصل مع مرضاك بكفاءة عالية.' },
    { id: 'pharmacy', label: 'صيدلية', icon: 'pill', desc: 'استلم الوصفات الطبية ونظم مخزونك الدوائي بدقة.' },
    { id: 'lab', label: 'مختبر', icon: 'flask-outline', desc: 'ارفع نتائج التحاليل الطبية ونسق مع المرضى لحظياً.' },
    { id: 'warehouse', label: 'مستودع', icon: 'truck-fast', desc: 'أشرف على التوريد والخدمات اللوجستية للمخزون الطبي.' },
    { id: 'admin', label: 'مسؤول', icon: 'shield-account', desc: 'تحكم في إعدادات النظام وراقب الأداء العام للمنصة.' },
] as const;

export default function RolesScreen() {
    const router = useRouter();
    const scrollX = useRef(new Animated.Value(0)).current;
    const logoAnim = useRef(new Animated.Value(0)).current;
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        // Floating logo animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(logoAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(logoAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const onScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true }
    );

    const onMomentumScrollEnd = (event: any) => {
        const slideSize = CARD_WIDTH;
        const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
        setActiveIdx(index);
    };

    const handleSelect = (roleId: string) => {
        router.push({ pathname: '/(auth)/login', params: { role: roleId } });
    };

    const logoTranslateY = logoAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -10],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#1E88E5', '#43A047']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Header with Animated Logo */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="chevron-left" size={32} color="#FFFFFF" />
                </TouchableOpacity>

                <Animated.View style={[styles.logoContainer, { transform: [{ translateY: logoTranslateY }] }]}>
                    <Image
                        source={require('../assets/Logo Design.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                </Animated.View>

                <View style={styles.titleStack}>
                    <Text style={styles.headerTitle}>اختر نوع حسابك</Text>
                    <Text style={styles.headerSubtitle}>[ {activeIdx + 1} من {ROLES.length} ]</Text>
                </View>
            </View>

            {/* Main Stack Container */}
            <View style={styles.carouselWrapper}>
                <Animated.FlatList
                    data={ROLES}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.flatListPadding}
                    snapToInterval={CARD_WIDTH}
                    decelerationRate="fast"
                    onScroll={onScroll}
                    onMomentumScrollEnd={onMomentumScrollEnd}
                    scrollEventThrottle={16}
                    renderItem={({ item, index }) => {
                        const inputRange = [
                            (index - 1) * CARD_WIDTH,
                            index * CARD_WIDTH,
                            (index + 1) * CARD_WIDTH,
                        ];

                        const scale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.88, 1, 0.88],
                            extrapolate: 'clamp',
                        });

                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.6, 1, 0.6],
                            extrapolate: 'clamp',
                        });

                        const rotate = scrollX.interpolate({
                            inputRange,
                            outputRange: ['-5deg', '0deg', '5deg'],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View
                                style={[
                                    styles.cardFrame,
                                    { opacity, transform: [{ scale }, { rotate }] },
                                ]}
                            >
                                <View style={styles.card}>
                                    <LinearGradient
                                        colors={['#1E88E5', '#43A047']}
                                        style={styles.iconCircle}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    >
                                        <MaterialCommunityIcons name={item.icon as any} size={64} color="#FFFFFF" />
                                    </LinearGradient>
                                    <Text style={styles.roleLabel}>{item.label}</Text>
                                    <View style={styles.divider} />
                                    <Text style={styles.roleDesc}>{item.desc}</Text>

                                    <TouchableOpacity
                                        style={styles.cardAction}
                                        activeOpacity={0.8}
                                        onPress={() => handleSelect(item.id)}
                                    >
                                        <LinearGradient
                                            colors={['#1E88E5', '#43A047']}
                                            style={styles.btnGradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <Text style={styles.actionText}>اختيار هـذا الحساب</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        );
                    }}
                />
            </View>

            {/* Footer Branding or Indicator */}
            <View style={styles.footer}>
                <View style={styles.dotsRow}>
                    {ROLES.map((_, i) => (
                        <View key={i} style={[styles.dot, activeIdx === i && styles.activeDot]} />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'web' ? 40 : 60,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 24,
        zIndex: 100,
    },
    backBtn: {
        position: 'absolute',
        left: 24,
        top: Platform.OS === 'web' ? 40 : 60,
    },
    logoContainer: {
        width: 140,
        height: 70,
        marginBottom: 10,
    },
    logoImage: {
        width: '100%',
        height: '100%',
        tintColor: '#FFFFFF',
    },
    titleStack: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Cairo_700Bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'Cairo_400Regular',
        marginTop: 2,
    },
    carouselWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    flatListPadding: {
        paddingHorizontal: (width - CARD_WIDTH) / 2,
        alignItems: 'center',
    },
    cardFrame: {
        width: CARD_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#FFFFFF',
        width: CARD_WIDTH * 0.95,
        height: CARD_HEIGHT,
        borderRadius: 40,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.25,
        shadowRadius: 35,
        elevation: 20,
    },
    iconCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1E88E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    roleLabel: {
        fontSize: 32,
        fontFamily: 'Cairo_700Bold',
        color: '#111827',
    },
    divider: {
        width: 30,
        height: 3,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
    },
    roleDesc: {
        fontSize: 14,
        fontFamily: 'Cairo_400Regular',
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    cardAction: {
        width: '100%',
        height: 54,
        borderRadius: 27,
        overflow: 'hidden',
    },
    btnGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontSize: 16,
        fontFamily: 'Cairo_700Bold',
        color: '#FFFFFF',
    },
    footer: {
        paddingBottom: Platform.OS === 'ios' ? 50 : 30,
        alignItems: 'center',
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginHorizontal: 5,
    },
    activeDot: {
        backgroundColor: '#FFFFFF',
        width: 24,
    },
});
