import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
    primary: '#E65100',
    primaryDark: '#BF360C',
    accent: '#FF8A65',
    bg: '#FFFFFF',
    muted: '#9CA3AF',
};

export default function WarehouseLayout() {
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
                name="inventory"
                options={{
                    title: 'المخزون',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            {focused ? (
                                <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.activeIcon}>
                                    <MaterialCommunityIcons name="package-variant" size={22} color="#FFF" />
                                </LinearGradient>
                            ) : (
                                <MaterialCommunityIcons name="package-variant-closed" size={24} color={color} />
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
                                    <MaterialCommunityIcons name="truck-delivery" size={22} color="#FFF" />
                                </LinearGradient>
                            ) : (
                                <MaterialCommunityIcons name="truck-delivery-outline" size={24} color={color} />
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
        shadowColor: '#E65100',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});
