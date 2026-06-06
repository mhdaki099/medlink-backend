import { Tabs } from 'expo-router';
import ProviderTabBar, { ProviderTab } from '../../src/components/ProviderTabBar';

const TABS: ProviderTab[] = [
  { name: 'orders', icon: 'cart', label: 'الطلبات', path: '/(pharmacy)/orders' },
  { name: 'index', icon: 'home', label: 'الرئيسية', path: '/(pharmacy)/' },
  { name: 'profile', icon: 'account', label: 'البروفايل', path: '/(pharmacy)/profile' },
];

const HIDE_TAB_BAR_ROUTES = new Set(['medicines', 'prescriptions', 'warehouse', 'warehouse-orders']);

export default function PharmacyLayout() {
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
      <Tabs.Screen name="medicines" options={{ href: null }} />
      <Tabs.Screen name="prescriptions" options={{ href: null }} />
      <Tabs.Screen name="warehouse" options={{ href: null }} />
      <Tabs.Screen name="warehouse-orders" options={{ href: null }} />
    </Tabs>
  );
}
