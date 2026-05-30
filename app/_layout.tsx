import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Platform, Text, TextInput } from 'react-native';
import { useFonts, Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen auto-hide until fonts are loaded
SplashScreen.preventAutoHideAsync();

// Apply default font family to React Native Text components globally
const applyGlobalFont = () => {
    // @ts-ignore
    if (Text.defaultProps == null) Text.defaultProps = {};
    // @ts-ignore
    Text.defaultProps.style = [{ fontFamily: 'Cairo_400Regular' }];

    // @ts-ignore
    if (TextInput.defaultProps == null) TextInput.defaultProps = {};
    // @ts-ignore
    TextInput.defaultProps.style = [{ fontFamily: 'Cairo_400Regular' }];
};

applyGlobalFont();

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
            // Logged in but still on login/register? 
            // We'll let them decide to go to their role dashboard
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
