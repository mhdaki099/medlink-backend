import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const QUICK_LOGINS = [
    { email: 'ahmed@medlink.sy', role: 'patient', label: 'مريض' },
    { email: 'dr.karim@medlink.sy', role: 'doctor', label: 'طبيب' },
    { email: 'pharma.nour@medlink.sy', role: 'pharmacy', label: 'صيدلية' },
    { email: 'lab.fadi@medlink.sy', role: 'lab', label: 'مختبر' },
    { email: 'wh.main@medlink.sy', role: 'warehouse', label: 'مستودع' },
    { email: 'admin@medlink.sy', role: 'admin', label: 'المدير' },
    { email: 'sec.amal@medlink.sy', role: 'secretary', label: 'سكرتاريا' },
];

export default function LoginScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { login, isLoading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureText, setSecureText] = useState(true);

    const logoAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Floating logo animation with scaling
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(logoAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(logoAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
                ]),
            ])
        ).start();
    }, []);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            window.alert(`${title}\n\n${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            showAlert('تنبيه', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
            return;
        }
        try {
            const loggedInUser = await login(email, password) as any;
            if (loggedInUser && loggedInUser.role) {
                router.replace(`/(${loggedInUser.role})` as any);
            } else {
                router.replace('/(patient)' as any);
            }
        } catch (e: any) {
            showAlert('خطأ في الدخول', 'البيانات غير صحيحة، يرجى المحاولة مرة أخرى');
        }
    };

    const quickLogin = async (ql: typeof QUICK_LOGINS[0]) => {
        try {
            await login(ql.email, '123456');
            router.replace(`/(${ql.role})` as any);
        } catch (e: any) {
            showAlert('خطأ', 'فشل تسجيل الدخول السريع');
        }
    };

    const logoTranslateY = logoAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20],
    });
    const logoScale = logoAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.05],
    });

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#FFFFFF' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.container}
                bounces={false}
                showsVerticalScrollIndicator={false}
            >
                {/* Wavy/Curved Header Section */}
                <View style={styles.headerWrapper}>
                    <LinearGradient
                        colors={['#1E88E5', '#43A047']}
                        style={styles.headerGradient}
                    />

                    {/* Interior Blobs for richer look */}
                    <View style={styles.blob1} />
                    <View style={styles.blob2} />

                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="chevron-left" size={32} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerContent}>
                        <Animated.View style={[styles.logoContainer, { transform: [{ translateY: logoTranslateY }, { scale: logoScale }] }]}>
                            <Image
                                source={require('../../assets/Logo Design.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                        </Animated.View>
                        <Text style={styles.headerText}>تسجيل الدخول</Text>
                    </View>
                </View>

                {/* Main Content Body */}
                <View style={styles.content}>
                    <View style={styles.titleSection}>
                        <Text style={styles.titleText}>مرحباً بك مجدداً </Text>
                        <Text style={styles.subtitleText}>هلا فيك، يرجى تسجيل الدخول للمتابعة</Text>
                    </View>

                    {/* Quick Login Chips */}
                    <View style={styles.quickSection}>
                        <Text style={styles.quickLabel}>دخول سريع للتجريب:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
                            {QUICK_LOGINS.map((ql) => (
                                <TouchableOpacity
                                    key={ql.email}
                                    style={styles.quickChip}
                                    onPress={() => quickLogin(ql)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.quickChipText}>{ql.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Form Section */}
                    <View style={styles.form}>
                        {/* Email Input */}
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="البريد الإلكتروني"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="lock-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="كلمة المرور"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={secureText}
                            />
                            <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeBtn}>
                                <MaterialCommunityIcons
                                    name={secureText ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color="#9CA3AF"
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.forgotBtn}>
                            <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={[styles.loginBtn, isLoading && { opacity: 0.8 }]}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#1E88E5', '#43A047']}
                                style={styles.loginGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.loginText}>دخول</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Register Redirect */}
                        <TouchableOpacity
                            onPress={() => router.push('/(auth)/register')}
                            style={styles.registerLink}
                        >
                            <Text style={styles.registerText}>
                                ليس لديك حساب؟ <Text style={styles.registerHighlight}>إنشاء حساب</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerWrapper: {
        height: height * 0.35,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    headerGradient: {
        ...StyleSheet.absoluteFillObject,
        borderBottomLeftRadius: 120, // Asymmetric curve
        borderBottomRightRadius: 20,
        transform: [{ scaleX: 1.1 }],
    },
    blob1: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        top: -100,
        right: -50,
    },
    blob2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        bottom: -50,
        left: -80,
    },
    backBtn: {
        position: 'absolute',
        left: 24,
        top: Platform.OS === 'web' ? 40 : 60,
        zIndex: 10,
    },
    headerContent: {
        alignItems: 'center',
        marginTop: 20,
    },
    logoContainer: {
        width: 180,
        height: 90,
        marginBottom: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        tintColor: '#FFFFFF',
    },
    headerText: {
        fontSize: 34,
        fontFamily: 'Cairo_700Bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        paddingHorizontal: 30,
        paddingTop: 30,
        paddingBottom: 60,
    },
    titleSection: {
        marginBottom: 30,
        alignItems: 'center',
    },
    titleText: {
        fontSize: 26,
        fontFamily: 'Cairo_700Bold',
        color: '#111827',
        textAlign: 'center',
    },
    subtitleText: {
        fontSize: 15,
        fontFamily: 'Cairo_400Regular',
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 5,
    },
    quickSection: {
        marginBottom: 25,
    },
    quickLabel: {
        fontSize: 14,
        fontFamily: 'Cairo_700Bold',
        color: '#1E88E5',
        textAlign: 'right',
        marginBottom: 12,
    },
    quickScroll: {
        flexDirection: 'row',
    },
    quickChip: {
        backgroundColor: '#F0F8F5',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    quickChipText: {
        fontSize: 14,
        fontFamily: 'Cairo_700Bold',
        color: '#1E88E5',
    },
    form: {
        marginTop: 10,
    },
    inputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 60,
        marginBottom: 20,
    },
    inputIcon: {
        marginLeft: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Cairo_400Regular',
        color: '#111827',
        textAlign: 'right',
    },
    eyeBtn: {
        padding: 8,
    },
    forgotBtn: {
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    forgotText: {
        fontSize: 14,
        fontFamily: 'Cairo_700Bold',
        color: '#1E88E5',
    },
    loginBtn: {
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        shadowColor: '#1E88E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
        marginBottom: 25,
    },
    loginGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        fontSize: 18,
        fontFamily: 'Cairo_700Bold',
        color: '#FFFFFF',
    },
    registerLink: {
        alignItems: 'center',
    },
    registerText: {
        fontSize: 15,
        fontFamily: 'Cairo_400Regular',
        color: '#6B7280',
    },
    registerHighlight: {
        color: '#1E88E5',
        fontFamily: 'Cairo_700Bold',
    },
});
