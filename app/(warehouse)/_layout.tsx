import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme';
import { Text } from 'react-native';

export default function WarehouseLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.warehouse,
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
            <Tabs.Screen name="inventory" options={{ title: 'المخزون', tabBarIcon: () => <Text style={{ fontSize: 22 }}>📦</Text> }} />
            <Tabs.Screen name="orders" options={{ title: 'الطلبات', tabBarIcon: () => <Text style={{ fontSize: 22 }}>🛒</Text> }} />
        </Tabs>
    );
}
