import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, TextInput } from 'react-native';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';
import { setupCairoFont } from '../src/utils/setupCairoFont';
import { FONTS } from '../src/constants/typography';

// Prevent splash screen auto-hide until fonts are loaded
SplashScreen.preventAutoHideAsync();

// Apply default font family to React Native Text components globally
const applyGlobalFont = () => {
    // @ts-ignore
    if (Text.defaultProps == null) Text.defaultProps = {};
    // @ts-ignore
    Text.defaultProps.style = [{ fontFamily: FONTS.regular }];

    // @ts-ignore
    if (TextInput.defaultProps == null) TextInput.defaultProps = {};
    // @ts-ignore
    TextInput.defaultProps.style = [{ fontFamily: FONTS.regular }];
};

applyGlobalFont();
setupCairoFont();

function RootLayoutNavigator() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        if (isLoading) return;
        
        const inAuthGroup = segments[0] === '(auth)';
        const isPublicPage = segments[0] === undefined || segments[0] === 'roles';
        
        if (!user && !inAuthGroup && !isPublicPage) {
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            const role = user.role;
            const roleGroups: Record<string, string> = {
                patient: '(patient)',
                doctor: '(doctor)',
                pharmacy: '(pharmacy)',
                lab: '(lab)',
                radiology: '(lab)',
                warehouse: '(warehouse)',
                admin: '(admin)',
                secretary: '(secretary)',
            };
            const roleGroup = roleGroups[role] || '(patient)';
            router.replace(`/${roleGroup}` as any);
        }
    }, [user, isLoading, segments]);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/register" />
            <Stack.Screen name="(patient)" />
            <Stack.Screen name="(doctor)" />
            <Stack.Screen name="(pharmacy)" />
            <Stack.Screen name="(lab)" />
            <Stack.Screen name="(warehouse)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(secretary)" />
        </Stack>
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Cairo_400Regular,
        Cairo_600SemiBold,
        Cairo_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded) {
            setupCairoFont();
            SplashScreen.hideAsync();

            // For Web platform, enforce global CSS
            if (Platform.OS === 'web') {
                const style = document.createElement('style');
                style.type = 'text/css';
                style.appendChild(document.createTextNode(`
                    * {
                        font-family: 'Cairo_400Regular', 'Cairo', sans-serif !important;
                    }
                `));
                document.head.appendChild(style);
            }
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <AuthProvider>
            <StatusBar style="light" />
            <RootLayoutNavigator />
        </AuthProvider>
    );
}
