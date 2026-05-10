import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    FadeInDown,
    FadeInRight,
    FadeIn
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const SERVICES = [
    {
        id: 'doctors',
        title: 'أطباء',
        sub: 'حجز مواعيد واستشارات طارئة',
        icon: 'stethoscope',
        route: '/(patient)/doctors',
        delay: 300
    },
    {
        id: 'medicines',
        title: 'أدوية',
        sub: 'طلب أدوية ووصفات إلكترونية',
        icon: 'pill',
        route: '/(patient)/pharmacies',
        delay: 450
    },
    {
        id: 'appointments',
        title: 'مواعيدي',
        sub: 'إدارة جميع الحجوزات القادمة',
        icon: 'calendar-month',
        route: '/(patient)/appointments',
        delay: 600
    },
    {
        id: 'records',
        title: 'سجل طبي',
        sub: 'نتائج التحاليل والملفات الطبية',
        icon: 'folder-heart-outline',
        route: '/(patient)/records',
        delay: 750
    }
];

export default function ServicesScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {/* Full Screen Gradient Background */}
            <LinearGradient
                colors={['#1E88E5', '#43A047']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Header / Logo Area (Static at top) */}
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </TouchableOpacity>

                {/* Logo with White Tint and Entrance Animation */}
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                    <Image
                        source={require('../../assets/Logo Design.png')}
                        style={[styles.logo, { tintColor: '#FFF' }]}
                        resizeMode="contain"
                    />
                </Animated.View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroWrapper}>
                    {/* EDIT HERE: heroCircle styles control the white background circle */}
                    <Animated.View
                        entering={FadeIn.delay(200).duration(1000)}
                        style={styles.heroCircle}
                    />

                    {/* EDIT HERE: heroDoctor styles control the doctor image position */}
                    <Animated.Image
                        entering={FadeInDown.delay(300).duration(1000)}
                        source={require('../../assets/doctors_sample/doctor female 4.png')}
                        style={styles.heroDoctor}
                        resizeMode="contain"
                    />

                    {/* Floating Doc Info Card */}
                    <Animated.View
                        entering={FadeInRight.delay(800).springify()}
                        style={styles.floatingTag}
                    >
                        <View style={styles.tagIndicator} />
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.tagName}>خدماتك</Text>
                            <Text style={styles.tagSub}>جمعنالك كلشي بمكان واحد</Text>
                        </View>
                    </Animated.View>

                    {/* Visual Decorative Dots */}
                    <View style={styles.dotContainer}>
                        <View style={styles.dot} />
                        <View style={[styles.dot, { height: 20, opacity: 1 }]} />
                        <View style={styles.dot} />
                        <View style={styles.dot} />
                    </View>
                </View>

                {/* Content Area */}
                <View style={styles.mainContent}>
                    <Animated.Text
                        entering={FadeInDown.delay(400)}
                        style={styles.mainTitle}
                    >
                        مرحباً بك في خدماتي
                    </Animated.Text>
                    <Animated.Text
                        entering={FadeInDown.delay(500)}
                        style={styles.mainSub}
                    >
                        نحن نؤمن بأن الرعاية الصحية تبدأ من هنا، اختر الخدمة التي تناسب احتياجاتك الحالية.
                    </Animated.Text>

                    <View style={styles.servicesGrid}>
                        {SERVICES.map((srv) => (
                            <Animated.View
                                key={srv.id}
                                entering={FadeInDown.delay(srv.delay).springify()}
                            >
                                <TouchableOpacity
                                    style={styles.serviceBtn}
                                    activeOpacity={0.9}
                                    onPress={() => router.push(srv.route as any)}
                                >
                                    <View style={styles.iconBox}>
                                        <MaterialCommunityIcons name={srv.icon as any} size={28} color="#1E88E5" />
                                    </View>
                                    <View style={styles.srvTextCol}>
                                        <Text style={styles.srvTitle}>{srv.title}</Text>
                                        <Text style={styles.srvSub} numberOfLines={1}>{srv.sub}</Text>
                                    </View>
                                    <Ionicons name="chevron-back" size={20} color="#CBD5E1" />
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerTop: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        height: 110,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
    },
    logo: {
        width: 175,
        height: 50,
    },
    heroWrapper: {
        height: height * 0.4,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative',
        zIndex: 1,
    },
    heroCircle: {
        position: 'absolute',
        top: -100,
        right: -width * 0.4,
        width: width * 1.15,
        height: width * 1.15,
        borderRadius: width * 0.6,
        backgroundColor: '#FFFFFF',
    },
    heroDoctor: {
        width: width,
        height: '110%',
        zIndex: 2,
        bottom: 0,
        marginLeft: -width * 0.15,
    },
    floatingTag: {
        position: 'absolute',
        bottom: '20%',
        right: 30,
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 8,
        zIndex: 10,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
    },
    tagIndicator: {
        width: 8,
        height: 35,
        borderRadius: 4,
        backgroundColor: '#E2E8F0',
    },
    tagName: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 15,
        color: '#1E293B',
    },
    tagSub: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 11,
        color: '#64748B',
    },
    dotContainer: {
        position: 'absolute',
        right: 25,
        top: height * 0.1,
        zIndex: 5,
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        opacity: 0.5,
    },
    mainContent: {
        flex: 1,
        paddingHorizontal: 25,
        paddingTop: 10,
        zIndex: 5,
    },
    mainTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 32,
        color: '#FFF',
        textAlign: 'right',
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    mainSub: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'right',
        lineHeight: 20,
        marginBottom: 20,
    },
    servicesGrid: {
        gap: 10,
    },
    serviceBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 14,
        borderRadius: 22,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    iconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 15,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    srvTextCol: {
        flex: 1,
        alignItems: 'flex-end',
    },
    srvTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 16,
        color: '#1E293B',
    },
    srvSub: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 11,
        color: '#94A3B8',
    }
});
