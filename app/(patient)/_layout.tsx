import React, { useRef, useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_BAR_BASE_HEIGHT = 85;
const FAB_SIZE = 60;
const TAB_WIDTH = width / 3;

// Define the 3 core tabs in order
const TABS = [
  { name: 'services', icon: 'view-grid', label: 'خدماتي', path: '/(patient)/services' },
  { name: 'index', icon: 'home', label: 'الرئيسية', path: '/(patient)/' },
  { name: 'profile', icon: 'account', label: 'البروفايل', path: '/(patient)/profile' },
];

/** Secondary screens that belong under the "services" tab highlight */
const SERVICE_TAB_ROUTES = new Set([
  'services',
  'doctors',
  'pharmacies',
  'records',
  'appointments',
  'labs',
  'radiology',
  'history',
  'notifications',
  'my-doctors',
  'my-prescriptions',
  'lab-centers',
  'radiology-centers',
  'medicines',
]);

const AnimatedPath = Animated.createAnimatedComponent(Path);

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = TAB_BAR_BASE_HEIGHT + insets.bottom;

  const routeName = state.routes[state.index]?.name;

  const activeIndexRaw = TABS.findIndex(t => {
    if (routeName === t.name) return true;
    if (t.name === 'services' && SERVICE_TAB_ROUTES.has(routeName)) return true;
    return false;
  });
  const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : 0;

  const goToTab = (tab: (typeof TABS)[number]) => {
    if (routeName === tab.name) return;
    try {
      router.replace(tab.path as any);
    } catch {
      navigation.navigate(tab.name);
    }
  };

  // RTL Logic: (2 - activeIndex) because of row-reverse with 3 tabs
  const targetX = (2 - activeIndex) * TAB_WIDTH;
  const translateX = useRef(new Animated.Value(targetX)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate the sliding position
    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();

    // Scale up FAB effect on change
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();
  }, [activeIndex]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulseValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const cutoutWidth = 72;
  const fabX = translateX.interpolate({
    inputRange: [0, TAB_WIDTH, TAB_WIDTH * 2],
    outputRange: [
      (TAB_WIDTH - FAB_SIZE) / 2,
      TAB_WIDTH + (TAB_WIDTH - FAB_SIZE) / 2,
      TAB_WIDTH * 2 + (TAB_WIDTH - FAB_SIZE) / 2,
    ],
  });

  return (
    <View style={[styles.tabBarWrapper, { height: TAB_BAR_HEIGHT }]}>
      <View style={styles.backgroundContainer}>
        <Animated.View style={[
          styles.cutoutSlider, 
          { transform: [{ translateX }] }
        ]}>
          <Svg width={TAB_WIDTH} height={TAB_BAR_HEIGHT + 20} style={{ marginTop: -10 }}>
            <Path 
              d={`
                M 0 10 
                H ${(TAB_WIDTH - cutoutWidth) / 2} 
                C ${(TAB_WIDTH - cutoutWidth) / 2 + 10} 10 ${(TAB_WIDTH - cutoutWidth) / 2 + 5} 42 ${TAB_WIDTH / 2} 42 
                S ${(TAB_WIDTH + cutoutWidth) / 2 - 10} 10 ${(TAB_WIDTH + cutoutWidth) / 2} 10 
                H ${TAB_WIDTH} 
                V ${TAB_BAR_HEIGHT + 20} 
                H 0 
                Z
              `} 
              fill="#FAFBFF" 
            />
          </Svg>
        </Animated.View>
        <View style={styles.whiteFill} />
      </View>

      <View style={[styles.tabItemsWrapper, { paddingBottom: insets.bottom }]}>
        {TABS.map((tab, index) => {
          const isFocused = activeIndex === index;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => goToTab(tab)}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {!isFocused && (
                <>
                  <MaterialCommunityIcons name={tab.icon as any} size={20} color="#94A3B8" />
                  <Text style={styles.tabLabel}>{tab.label}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Animated.View style={[
        styles.fabContainer,
        { transform: [{ translateX: fabX }, { scale: fabScale }] },
      ]}>
        <LinearGradient
          colors={['#1E88E5', '#43A047']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name={TABS[activeIndex]?.icon as any} size={26} color="#FFF" />
          <Animated.View style={[
            styles.fabPulse,
            {
              transform: [{ scale: pulseValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
              opacity: pulseValue.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] })
            }
          ]} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

export default function PatientLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="services" options={{ title: 'خدماتي' }} />
      <Tabs.Screen name="profile" options={{ title: 'البروفايل' }} />
      <Tabs.Screen name="labs" options={{ href: null }} />
      <Tabs.Screen name="pharmacies" options={{ href: null }} />
      <Tabs.Screen name="doctors" options={{ href: null }} />
      <Tabs.Screen name="records" options={{ href: null }} />
      <Tabs.Screen name="appointments" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="radiology" options={{ href: null }} />
      <Tabs.Screen name="my-doctors" options={{ href: null }} />
      <Tabs.Screen name="my-prescriptions" options={{ href: null }} />
      <Tabs.Screen name="lab-centers" options={{ href: null }} />
      <Tabs.Screen name="radiology-centers" options={{ href: null }} />
      <Tabs.Screen name="medicines" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    width: width,
    backgroundColor: 'transparent',
    zIndex: 100,
    elevation: 24,
  },
  backgroundContainer: {
    position: 'absolute',
    bottom: 0,
    width: width,
    height: '100%',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
  },
  whiteFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: -1,
  },
  cutoutSlider: {
    position: 'absolute',
    top: -1,
    width: TAB_WIDTH,
    zIndex: 1,
  },
  tabItemsWrapper: {
    flexDirection: 'row-reverse',
    height: TAB_BAR_BASE_HEIGHT,
    width: width,
    alignItems: 'center',
    zIndex: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Cairo_700Bold',
    color: '#94A3B8',
    marginTop: 4,
  },
  fabContainer: {
    position: 'absolute',
    top: -25,
    zIndex: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  fabGradient: {
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
  fabPulse: {
    position: 'absolute',
    width: FAB_SIZE + 10,
    height: FAB_SIZE + 10,
    borderRadius: (FAB_SIZE + 10) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(67, 160, 71, 0.4)',
  }
});
