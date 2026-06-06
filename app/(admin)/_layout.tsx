import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_THEME, ADMIN_TAB_BAR_HEIGHT } from '../../src/constants/adminTheme';
import { useAdminPermissions } from '../../src/hooks/useAdminPermissions';
import { useEffect } from 'react';

export default function AdminLayout() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { can, isSuperAdmin } = useAdminPermissions();

    useEffect(() => {
        if (!can('dashboard_view') && can('users_view')) router.replace('/(admin)/users');
        else if (!can('dashboard_view') && can('registrations_view')) router.replace('/(admin)/new-accounts');
        else if (!can('dashboard_view') && can('logs_view')) router.replace('/(admin)/logs');
    }, []);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: ADMIN_THEME.accent,
                tabBarInactiveTintColor: ADMIN_THEME.textMuted,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: Math.max(insets.bottom, 12),
                    left: 16,
                    right: 16,
                    height: ADMIN_TAB_BAR_HEIGHT,
                    backgroundColor: ADMIN_THEME.surface,
                    borderRadius: 20,
                    borderTopWidth: 0,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
                    ...Platform.select({
                        ios: { shadowColor: ADMIN_THEME.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
                        android: { elevation: 12 },
                    }),
                },
                tabBarLabelStyle: { fontFamily: 'Cairo_700Bold', fontSize: 10, marginTop: 2 },
                tabBarItemStyle: { paddingVertical: 4 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'الرئيسية',
                    href: can('dashboard_view') ? undefined : null,
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
                    href: can('users_view') ? undefined : null,
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
                    href: can('registrations_view') ? undefined : null,
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
                    href: isSuperAdmin ? undefined : null,
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
                    href: can('logs_view') ? undefined : null,
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons name="history" size={22} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconWrap: { width: 36, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    iconWrapActive: { backgroundColor: ADMIN_THEME.infoBg },
});
