import React, { useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_BAR_BASE_HEIGHT = 80;
const FAB_SIZE = 58;
const TAB_WIDTH = width / 3;

const TABS = [
  { name: 'patients', icon: 'account-group', label: 'المرضى' },
  { name: 'index', icon: 'home', label: 'الرئيسية' },
  { name: 'profile', icon: 'account', label: 'البروفايل' },
];

const PATIENTS_TAB_ROUTES = new Set([
  'patients',
  'appointments',
  'new-appointment',
  'new-prescription',
  'consultation-report',
]);

/** Full-screen flows — hide tab bar so buttons are not covered */
const HIDE_TAB_BAR_ROUTES = new Set([
  'consultation-report',
  'new-appointment',
  'new-prescription',
  'notifications',
]);

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const routeName = state.routes[state.index]?.name;

  if (HIDE_TAB_BAR_ROUTES.has(routeName)) {
    return null;
  }

  const activeIndexRaw = TABS.findIndex(t => {
    if (routeName === t.name) return true;
    if (t.name === 'patients' && PATIENTS_TAB_ROUTES.has(routeName)) return true;
    if (t.name === 'index' && routeName === 'notifications') return true;
    return false;
  });
  const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : 1;

  const targetX = (2 - activeIndex) * TAB_WIDTH;
  const translateX = useRef(new Animated.Value(targetX)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: targetX,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();

    Animated.sequence([
      Animated.timing(fabScale, { toValue: 1.15, duration: 140, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  }, [activeIndex, targetX]);

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
        <Animated.View style={[styles.cutoutSlider, { transform: [{ translateX }] }]}>
          <Svg width={TAB_WIDTH} height={TAB_BAR_HEIGHT + 20} style={{ marginTop: -10 }}>
            <Path
              d={`
                M 0 10
                H ${(TAB_WIDTH - cutoutWidth) / 2}
                C ${(TAB_WIDTH - cutoutWidth) / 2 + 10} 10 ${(TAB_WIDTH - cutoutWidth) / 2 + 5} 40 ${TAB_WIDTH / 2} 40
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
              onPress={() => !isFocused && navigation.navigate(tab.name)}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              {!isFocused && (
                <>
                  <MaterialCommunityIcons name={tab.icon as any} size={22} color="#94A3B8" />
                  <Text style={styles.tabLabel}>{tab.label}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ translateX: fabX }, { scale: fabScale }] },
        ]}
      >
        <LinearGradient
          colors={['#1E88E5', '#43A047']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name={TABS[activeIndex]?.icon as any} size={24} color="#FFF" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

export default function DoctorLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="patients" options={{ title: 'المرضى' }} />
      <Tabs.Screen name="profile" options={{ title: 'البروفايل' }} />
      <Tabs.Screen name="appointments" options={{ href: null }} />
      <Tabs.Screen name="new-appointment" options={{ href: null }} />
      <Tabs.Screen name="new-prescription" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="consultation-report" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    width,
    backgroundColor: 'transparent',
    zIndex: 100,
    elevation: 24,
  },
  backgroundContainer: {
    position: 'absolute',
    bottom: 0,
    width,
    height: '100%',
    backgroundColor: '#FFFFFF',
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
    width,
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
    top: -24,
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
});
