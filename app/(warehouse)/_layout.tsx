import { Tabs } from 'expo-router';
import ProviderTabBar, { ProviderTab } from '../../src/components/ProviderTabBar';

const TABS: ProviderTab[] = [
  { name: 'orders', icon: 'truck-delivery', label: 'الطلبات', path: '/(warehouse)/orders' },
  { name: 'index', icon: 'home', label: 'الرئيسية', path: '/(warehouse)/' },
  { name: 'profile', icon: 'account', label: 'البروفايل', path: '/(warehouse)/profile' },
];

const HIDE_TAB_BAR_ROUTES = new Set(['inventory', 'promoters']);

export default function WarehouseLayout() {
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
      <Tabs.Screen name="orders" options={{ title: 'الطلبات' }} />
      <Tabs.Screen name="profile" options={{ title: 'البروفايل' }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="promoters" options={{ href: null }} />
    </Tabs>
  );
}
