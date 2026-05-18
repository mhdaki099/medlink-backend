import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
    primary: '#1E88E5',
    primaryDark: '#1565C0',
    accent: '#43A047',
    bg: '#FFFFFF',
    muted: '#9CA3AF',
    border: '#F3F4F6',
};

export default function PharmacyLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.muted,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: Platform.OS === 'ios' ? 24 : 16,
                    left: 16,
                    right: 16,
                    backgroundColor: COLORS.bg,
                    borderRadius: 24,
                    height: 68,
                    elevation: 12,
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.15,
                    shadowRadius: 16,
                    borderTopWidth: 0,
                    paddingBottom: 0,
                    paddingTop: 0,
                },
                tabBarLabelStyle: {
                    fontFamily: 'Cairo_700Bold',
                    fontSize: 10,
                    marginBottom: Platform.OS === 'ios' ? 0 : 8,
                    marginTop: -2,
                },
                tabBarIconStyle: {
                    marginTop: Platform.OS === 'ios' ? 0 : 6,
                },
                tabBarItemStyle: {
                    paddingVertical: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'الرئيسية',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            {focused ? (
                                <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.activeIcon}>
                                    <MaterialCommunityIcons name="view-dashboard" size={22} color="#FFF" />
                                </LinearGradient>
                            ) : (
                                <MaterialCommunityIcons name="view-dashboard-outline" size={24} color={color} />
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="medicines"
                options={{
                    title: 'الأدوية',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            {focused ? (
                                <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.activeIcon}>
                                    <MaterialCommunityIcons name="pill" size={22} color="#FFF" />
                                </LinearGradient>
                            ) : (
                                <MaterialCommunityIcons name="pill" size={24} color={color} />
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'الطلبات',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            {focused ? (
                                <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.activeIcon}>
                                    <MaterialCommunityIcons name="clipboard-list" size={22} color="#FFF" />
                                </LinearGradient>
                            ) : (
                                <MaterialCommunityIcons name="clipboard-list-outline" size={24} color={color} />
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="warehouse"
                options={{
                    title: 'المستودع',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            {focused ? (
                                <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.activeIcon}>
                                    <MaterialCommunityIcons name="warehouse" size={22} color="#FFF" />
                                </LinearGradient>
                            ) : (
                                <MaterialCommunityIcons name="warehouse" size={24} color={color} />
                            )}
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    activeIconWrap: {
        marginTop: -4,
    },
    activeIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1E88E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
