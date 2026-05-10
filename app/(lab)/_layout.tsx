import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme';
import { Text } from 'react-native';

export default function LabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.lab,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 0,
                    elevation: 12,
                    height: 64,
                    paddingBottom: 8,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'الرئيسية', tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text> }} />
            <Tabs.Screen name="bookings" options={{ title: 'الحجوزات', tabBarIcon: () => <Text style={{ fontSize: 22 }}>📅</Text> }} />
            <Tabs.Screen name="tests" options={{ title: 'الفحوصات', tabBarIcon: () => <Text style={{ fontSize: 22 }}>🧪</Text> }} />
            <Tabs.Screen name="results" options={{ title: 'النتائج', tabBarIcon: () => <Text style={{ fontSize: 22 }}>📋</Text> }} />
        </Tabs>
    );
}
