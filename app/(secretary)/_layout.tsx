import React, { useRef, useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const TAB_BAR_BASE_HEIGHT = 80; 
const FAB_SIZE = 58; 
const TAB_WIDTH = width / 2; // Only 2 tabs for secretary

const TABS = [
  { name: 'appointments', icon: 'calendar-clock', label: 'المواعيد', path: '/(secretary)/appointments' },
  { name: 'index', icon: 'view-dashboard', label: 'الرئيسية', path: '/(secretary)/' },
];

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const TAB_BAR_HEIGHT = TAB_BAR_BASE_HEIGHT + insets.bottom;

  const activeIndexRaw = TABS.findIndex(t => state.routes[state.index].name === t.name);
  const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : 1;
  const routeName = state.routes[state.index]?.name;

  const goToTab = (tab: (typeof TABS)[number]) => {
    if (routeName === tab.name) return;
    try {
      router.replace(tab.path as any);
    } catch {
      navigation.navigate(tab.name);
    }
  };

  // RTL Logic: (1 - activeIndex)
  const targetX = (1 - activeIndex) * TAB_WIDTH;
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
      Animated.timing(fabScale, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();
  }, [activeIndex]);

  const cutoutWidth = 70;
  
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
              onPress={() => goToTab(tab)}
              style={styles.tabButton}
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

      <Animated.View style={[
        styles.fabContainer, 
        { 
          transform: [
            { translateX: translateX.interpolate({
                inputRange: [0, TAB_WIDTH],
                outputRange: [ (TAB_WIDTH - FAB_SIZE) / 2, TAB_WIDTH + (TAB_WIDTH - FAB_SIZE) / 2]
            })},
            { scale: fabScale }
          ]
        }
      ]}>
        <LinearGradient
          colors={['#1E88E5', '#43A047']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name={TABS[activeIndex]?.icon as any} size={24} color="#FFF" />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

export default function SecretaryLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="appointments" options={{ title: 'المواعيد' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: { position: 'absolute', bottom: 0, width: width, zIndex: 100, elevation: 24 },
  backgroundContainer: { position: 'absolute', bottom: 0, width: width, height: TAB_BAR_BASE_HEIGHT, backgroundColor: '#FFFFFF' },
  whiteFill: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FFFFFF', zIndex: -1 },
  cutoutSlider: { position: 'absolute', top: -1, width: TAB_WIDTH, height: TAB_BAR_BASE_HEIGHT + 1, zIndex: 1 },
  tabItemsWrapper: { flexDirection: 'row-reverse', height: TAB_BAR_BASE_HEIGHT, width: width, alignItems: 'center', zIndex: 10 },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: '#94A3B8', marginTop: 4 },
  fabContainer: { position: 'absolute', top: -23, zIndex: 20, width: FAB_SIZE, height: FAB_SIZE },
  fabGradient: { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8 },
});
