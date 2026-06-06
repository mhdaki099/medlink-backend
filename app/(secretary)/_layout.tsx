import React from 'react';
import { Tabs } from 'expo-router';
import ProviderTabBar, { ProviderTab } from '../../src/components/ProviderTabBar';

const TABS: ProviderTab[] = [
    { name: 'patients', icon: 'account-group', label: 'المرضى', path: '/(secretary)/patients' },
    { name: 'index', icon: 'calendar-clock', label: 'المواعيد', path: '/(secretary)/' },
    { name: 'profile', icon: 'account', label: 'الحساب', path: '/(secretary)/profile' },
];

const HIDE_TAB_BAR_ROUTES = new Set(['new-appointment', 'consultation-report']);

const ACTIVE_ROUTE_MAP: Record<string, string> = {
    appointments: 'index',
    'new-appointment': 'index',
};

export default function SecretaryLayout() {
    return (
        <Tabs
            tabBar={(props) => (
                <ProviderTabBar
                    {...props}
                    tabs={TABS}
                    hideRoutes={HIDE_TAB_BAR_ROUTES}
                    activeRouteMap={ACTIVE_ROUTE_MAP}
                />
            )}
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'المواعيد' }} />
            <Tabs.Screen name="patients" options={{ title: 'المرضى' }} />
            <Tabs.Screen name="profile" options={{ title: 'الحساب' }} />
            <Tabs.Screen name="appointments" options={{ href: null }} />
            <Tabs.Screen name="new-appointment" options={{ href: null }} />
            <Tabs.Screen name="consultation-report" options={{ href: null }} />
        </Tabs>
    );
}
