import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LandingScreen() {
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            router.replace(`/(${user.role})` as any);
        }
    }, [user]);

    return (
        /* FIXED VIEW - NO SCROLL */
        <View style={styles.container}>
            <LinearGradient colors={['#F4F9FF', '#FAFCFF', '#FFFFFF']} style={StyleSheet.absoluteFillObject} />

            {/* Top Left Logo Area */}
            <View style={styles.topLeftLogo}>
                <Image
                    source={require('../assets/Logo Design.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                />
            </View>

            <View style={styles.content}>

                {/* ── Title Area ── */}
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>أدر </Text>
                        <Text style={styles.title}>صحتك</Text>
                    </View>
                    <View style={styles.titleRow}>
                        <Text style={styles.title}>بكل </Text>
                        <LinearGradient
                            colors={['#1E88E5', '#43A047']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.highlightBox}
                        >
                            <Text style={[styles.title, styles.highlightText]}>سهولة</Text>
                        </LinearGradient>
                    </View>
                </View>

                {/* ── Center Graphics Area ── */}
                <View style={styles.graphicsArea}>

                    {/* Background Doctor Photo */}
                    <Image
                        source={require('../assets/Dr Doctor Landing Page.png')}
                        style={styles.doctorImage}
                        resizeMode="contain"
                    />

                    {/* Static Card 2 (Blue) - NOW BEHIND */}
                    <View style={[styles.staticCard, styles.staticCardBlue]}>
                        <LinearGradient
                            colors={['#1E88E5', '#43A047']}
                            style={styles.cardBlueGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.whiteIconCircle}>
                                <Ionicons name="shield-checkmark" size={28} color="#43A047" />
                            </View>
                            <Text style={styles.cardBlueTitle}>وقاية</Text>
                            <Text style={styles.cardBlueDesc}>قلل المخاطر من خلال الفحوصات الطبية والكشف المبكر.</Text>
                        </LinearGradient>
                    </View>

                    {/* Static Card 1 (White) - NOW ON TOP */}
                    <View style={[styles.staticCard, styles.staticCardWhite]}>
                        <View style={styles.darkIconCircle}>
                            <Ionicons name="sparkles" size={24} color="#FFF" />
                        </View>
                        <Text style={styles.cardWhiteTitle}>تحسين</Text>
                        <Text style={styles.cardWhiteDesc}>ادعم صحتك بنمط أسلوب حياة سليم ومتابعة دورية.</Text>
                    </View>

                </View>

                {/* ── Bottom Section (Button) ── */}
                <View style={styles.bottomSection}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        activeOpacity={0.88}
                        onPress={() => router.push('/roles')}
                    >
                        <View style={styles.btnIconContainer}>
                            <Text style={styles.btnArrow}>←</Text>
                        </View>
                        <Text style={styles.actionBtnText}>تسجيل الدخول</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F9FF',
        overflow: 'hidden', // Forces no scroll
    },
    topLeftLogo: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 10 : 20,
        left: 10,
        zIndex: 50,
    },
    logoImage: {
        width: 150,
        height: 100,
    },
    content: {
        flex: 1,
        paddingTop: Platform.OS === 'web' ? 60 : 100,
        paddingBottom: Platform.OS === 'web' ? 40 : 60,
        justifyContent: 'space-between',
    },
    header: {
        paddingHorizontal: 24,
        alignItems: 'flex-end', // RTL
        zIndex: 10,
        marginTop: Platform.OS === 'web' ? 20 : 0,
    },
    titleRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
    },
    title: {
        fontSize: width > 500 ? 64 : 54,
        color: '#111827',
        fontFamily: 'Cairo_700Bold',
        letterSpacing: -1,
        textAlign: 'right',
        lineHeight: width > 500 ? 74 : 64,
    },
    highlightBox: {
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 1,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
    },
    highlightText: {
        color: '#FFFFFF',
        fontSize: width > 500 ? 60 : 50,
    },

    graphicsArea: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: height * 0.5,
    },

    /* CHANGE PHOTO SIZE HERE !! */
    doctorImage: {
        width: 580,
        height: 680,
        zIndex: 2,
        position: 'absolute',
        bottom: -100,
    },

    staticCard: {
        borderRadius: 28,
        padding: 20,
        width: 210,
        backgroundColor: '#FFFFFF',
        shadowColor: '#003366',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.12,
        shadowRadius: 30,
        elevation: 12,
        zIndex: 10,
        alignItems: 'flex-end',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    staticCardWhite: {
        position: 'absolute',
        left: width * 0.05,
        top: '22%',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        transform: [{ rotate: '-5deg' }],
        zIndex: 20, // Forces white to be on top
    },
    staticCardBlue: {
        position: 'absolute',
        right: width * 0.05,
        bottom: '18%',
        backgroundColor: '#1E88E5',
        transform: [{ rotate: '4deg' }],
        padding: 0,
        overflow: 'hidden',
        zIndex: 10, // Keeps blue behind
        borderWidth: 0,
    },

    cardBlueGradient: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: 'flex-end',
        width: '100%',
    },

    darkIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    whiteIconCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardIconText: { fontSize: 26, color: '#FFF' },
    cardIconTextBlue: { fontSize: 30, color: '#1E88E5' },

    cardWhiteTitle: { fontSize: 22, color: '#111827', fontFamily: 'Cairo_700Bold', marginBottom: 8 },
    cardWhiteDesc: { fontSize: 13, color: '#4B5563', fontFamily: 'Cairo_400Regular', textAlign: 'right', lineHeight: 20 },
    cardBlueTitle: { fontSize: 22, color: '#FFFFFF', fontFamily: 'Cairo_700Bold', marginBottom: 8 },
    cardBlueDesc: { fontSize: 13, color: 'rgba(255, 255, 255, 0.95)', fontFamily: 'Cairo_400Regular', textAlign: 'right', lineHeight: 20 },

    bottomSection: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 30,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        alignItems: 'center',
        zIndex: 100,
        elevation: 20,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#111827',
        borderRadius: 40,
        paddingVertical: 10,
        paddingHorizontal: 10,
        paddingRight: 32,
        width: '100%',
        maxWidth: 450,
        shadowColor: '#111827',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    btnIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#43A047',
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnArrow: { color: '#FFF', fontSize: 30, fontWeight: '700', paddingBottom: 10 },
    actionBtnText: {
        flex: 1,
        fontSize: 22,
        color: '#FFFFFF',
        fontFamily: 'Cairo_700Bold',
        textAlign: 'right',
        marginRight: 16,
    }
});
