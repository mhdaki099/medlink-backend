import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const TABS = [
  { name: 'orders', icon: 'truck-delivery', label: 'الطلبات', path: '/(warehouse)/orders' },
  { name: 'index', icon: 'home', label: 'الرئيسية', path: '/(warehouse)/' },
  { name: 'profile', icon: 'account', label: 'البروفايل', path: '/(warehouse)/profile' },
];

const HIDE_TAB_BAR_ROUTES = new Set(['inventory']);

const TAB_WIDTH = width / 3;
const TAB_BAR_BASE_HEIGHT = 70;
const FAB_SIZE = 56;

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const routeName = state.routes[state.index]?.name;

  if (HIDE_TAB_BAR_ROUTES.has(routeName)) {
    return null;
  }

  const activeIndexRaw = TABS.findIndex(t => routeName === t.name);
  const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : 1;
  const targetX = (2 - activeIndex) * TAB_WIDTH;

  const goToTab = (tab: (typeof TABS)[number]) => {
    if (routeName === tab.name) return;
    try {
      router.replace(tab.path as any);
    } catch {
      navigation.navigate(tab.name);
    }
  };

  return (
    <View style={[styles.container, { height: TAB_BAR_HEIGHT }]}>
      <View style={[styles.background, { paddingBottom: insets.bottom }]}>
        <View style={[styles.cutout, { transform: [{ translateX: targetX }] }]}>
          <View style={styles.cutoutCircle} />
        </View>
      </View>

      <View style={[styles.tabs, { paddingBottom: insets.bottom }]}>
        {TABS.map((tab, index) => {
          const isFocused = activeIndex === index;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabButton}
              onPress={() => goToTab(tab)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={tab.icon as any}
                size={22}
                color={isFocused ? '#1E88E5' : '#94A3B8'}
              />
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.fabContainer, { transform: [{ translateX: targetX }] }]}>
        <LinearGradient
          colors={['#1E88E5', '#43A047']}
          style={styles.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name={TABS[activeIndex]?.icon as any} size={24} color="#FFF" />
        </LinearGradient>
      </View>
    </View>
  );
}

export default function WarehouseLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="orders" options={{ title: 'الطلبات' }} />
      <Tabs.Screen name="profile" options={{ title: 'البروفايل' }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 24,
  },
  background: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  cutout: {
    position: 'absolute',
    top: -25,
    width: TAB_WIDTH,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cutoutCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FAFBFF',
  },
  tabs: {
    flexDirection: 'row-reverse',
    height: TAB_BAR_BASE_HEIGHT,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontFamily: 'Cairo_700Bold',
    color: '#94A3B8',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#1E88E5',
  },
  fabContainer: {
    position: 'absolute',
    top: -25,
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
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
