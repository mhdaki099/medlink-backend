import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_THEME, ADMIN_TAB_BAR_HEIGHT } from '../../src/constants/adminTheme';

export default function AdminLayout() {
    const insets = useSafeAreaInsets();

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
                        ios: {
                            shadowColor: ADMIN_THEME.shadow,
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.12,
                            shadowRadius: 16,
                        },
                        android: { elevation: 12 },
                    }),
                },
                tabBarLabelStyle: {
                    fontFamily: 'Cairo_700Bold',
                    fontSize: 10,
                    marginTop: 2,
                },
                tabBarItemStyle: { paddingVertical: 4 },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'الرئيسية',
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
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons name={focused ? 'account-clock' : 'account-clock-outline'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="logs"
                options={{
                    title: 'السجل',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                            <MaterialCommunityIcons name={focused ? 'history' : 'history'} size={22} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconWrap: {
        width: 36,
        height: 28,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapActive: {
        backgroundColor: ADMIN_THEME.infoBg,
    },
});
