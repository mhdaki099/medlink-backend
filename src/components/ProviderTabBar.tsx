import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROVIDER_TAB_BAR_BASE_HEIGHT } from '../constants/layout';

const { width } = Dimensions.get('window');
const FAB_SIZE = 56;

export type ProviderTab = {
    name: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    label: string;
    path: string;
};

type Props = {
    state: any;
    navigation: any;
    tabs: ProviderTab[];
    hideRoutes?: Set<string>;
    /** Map sub-routes to a parent tab highlight (e.g. inventory → index) */
    activeRouteMap?: Record<string, string>;
};

export default function ProviderTabBar({
    state,
    navigation,
    tabs,
    hideRoutes = new Set(),
    activeRouteMap = {},
}: Props) {
    const insets = useSafeAreaInsets();
    const tabCount = tabs.length;
    const tabWidth = width / tabCount;
    const barHeight = PROVIDER_TAB_BAR_BASE_HEIGHT + insets.bottom;
    const routeName = state.routes[state.index]?.name as string;

    if (hideRoutes.has(routeName)) {
        return null;
    }

    const mappedRoute = activeRouteMap[routeName] || routeName;
    const activeIndexRaw = tabs.findIndex(t => t.name === mappedRoute);
    const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : Math.floor(tabCount / 2);

    // RTL: first tab in array sits on the right → slide cutout/FAB from the right
    const slotX = (tabCount - 1 - activeIndex) * tabWidth;
    const fabLeft = slotX + (tabWidth - FAB_SIZE) / 2;

    const goToTab = (tab: ProviderTab) => {
        if (routeName === tab.name) return;
        try {
            router.replace(tab.path as any);
        } catch {
            navigation.navigate(tab.name);
        }
    };

    return (
        <View style={[styles.wrapper, { height: barHeight }]}>
            <View style={[styles.barBg, { paddingBottom: insets.bottom }]}>
                <View style={[styles.cutoutSlot, { width: tabWidth, transform: [{ translateX: slotX }] }]}>
                    <View style={styles.cutoutHole} />
                </View>
            </View>

            <View style={[styles.tabsRow, { paddingBottom: insets.bottom }]}>
                {tabs.map((tab, index) => {
                    const isFocused = activeIndex === index;
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.tabBtn}
                            onPress={() => goToTab(tab)}
                            activeOpacity={0.75}
                        >
                            {!isFocused && (
                                <>
                                    <MaterialCommunityIcons name={tab.icon} size={22} color="#94A3B8" />
                                    <Text style={styles.tabLabel}>{tab.label}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={[styles.fabWrap, { left: fabLeft }]}>
                <LinearGradient
                    colors={['#1E88E5', '#43A047']}
                    style={styles.fab}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name={tabs[activeIndex]?.icon} size={24} color="#FFF" />
                </LinearGradient>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        elevation: 24,
    },
    barBg: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#E8ECF0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
    },
    cutoutSlot: {
        position: 'absolute',
        top: -28,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cutoutHole: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#FAFBFF',
        borderWidth: 1,
        borderColor: '#E8ECF0',
    },
    tabsRow: {
        flexDirection: 'row-reverse',
        height: PROVIDER_TAB_BAR_BASE_HEIGHT,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 6,
        minHeight: 48,
    },
    tabLabel: {
        fontSize: 11,
        fontFamily: 'Cairo_700Bold',
        color: '#94A3B8',
        marginTop: 2,
    },
    fabWrap: {
        position: 'absolute',
        top: -28,
        width: FAB_SIZE,
        height: FAB_SIZE,
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1E88E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 10,
    },
});
