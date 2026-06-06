import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_THEME, ADMIN_TAB_BAR_HEIGHT } from '../../src/constants/adminTheme';
import { useAdminPermissions } from '../../src/hooks/useAdminPermissions';
import { useEffect } from 'react';

function tabHref(ready: boolean, allowed: boolean) {
    if (!ready) return undefined;
    return allowed ? undefined : null;
}

export default function AdminLayout() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { can, isSuperAdmin, isReady } = useAdminPermissions();
    const tabBottom = Math.max(insets.bottom, 12);

    useEffect(() => {
        if (!isReady) return;
        if (!can('dashboard_view') && can('users_view')) router.replace('/(admin)/users');
        else if (!can('dashboard_view') && can('registrations_view')) router.replace('/(admin)/new-accounts');
        else if (!can('dashboard_view') && can('logs_view')) router.replace('/(admin)/logs');
    }, [isReady]);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: ADMIN_THEME.accent,
                tabBarInactiveTintColor: ADMIN_THEME.textMuted,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: tabBottom,
                    left: 12,
                    right: 12,
                    height: ADMIN_TAB_BAR_HEIGHT,
                    backgroundColor: ADMIN_THEME.surface,
                    borderRadius: 18,
                    borderTopWidth: 0,
                    paddingTop: 6,
                    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
                    zIndex: 999,
                    ...Platform.select({
                        ios: {
                            shadowColor: ADMIN_THEME.shadow,
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.15,
                            shadowRadius: 12,
                        },
                        android: { elevation: 24 },
                    }),
                },
                tabBarLabelStyle: { fontFamily: 'Cairo_700Bold', fontSize: 9, marginTop: 2 },
                tabBarItemStyle: { paddingVertical: 2 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'الرئيسية',
                    href: tabHref(isReady, can('dashboard_view')),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons name={focused ? 'view-dashboard' : 'view-dashboard-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: 'المستخدمين',
                    href: tabHref(isReady, can('users_view')),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons name={focused ? 'account-group' : 'account-group-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="new-accounts"
                options={{
                    title: 'الطلبات',
                    href: tabHref(isReady, can('registrations_view')),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons name={focused ? 'account-clock' : 'account-clock-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="sub-admins"
                options={{
                    title: 'المدراء',
                    href: tabHref(isReady, isSuperAdmin),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons name={focused ? 'shield-account' : 'shield-account-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="logs"
                options={{
                    title: 'السجل',
                    href: tabHref(isReady, can('logs_view')),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons name="history" size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen name="homepage" options={{ href: null }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconWrap: { width: 34, height: 26, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    iconWrapActive: { backgroundColor: ADMIN_THEME.infoBg },
});
