import { Tabs } from 'expo-router';
import ProviderTabBar, { ProviderTab } from '../../src/components/ProviderTabBar';

const TABS: ProviderTab[] = [
  { name: 'bookings', icon: 'calendar-check', label: 'الحجوزات', path: '/(lab)/bookings' },
  { name: 'index', icon: 'home', label: 'الرئيسية', path: '/(lab)/' },
  { name: 'tests', icon: 'clipboard-list-outline', label: 'الخدمات', path: '/(lab)/tests' },
];

const HIDE_TAB_BAR_ROUTES = new Set(['results']);

export default function LabLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <ProviderTabBar {...props} tabs={TABS} hideRoutes={HIDE_TAB_BAR_ROUTES} />
      )}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="bookings" options={{ title: 'الحجوزات' }} />
      <Tabs.Screen name="tests" options={{ title: 'الخدمات' }} />
      <Tabs.Screen name="results" options={{ href: null }} />
    </Tabs>
  );
}
