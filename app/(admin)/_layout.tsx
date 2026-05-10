import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';

const PREMIUM_COLORS = {
    primary: '#2563EB',
    textMuted: '#9CA3AF',
    white: '#FFFFFF',
    border: '#F3F4F6'
};

export default function AdminLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: PREMIUM_COLORS.primary,
                tabBarInactiveTintColor: PREMIUM_COLORS.textMuted,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 25,
                    left: 20,
                    right: 20,
                    backgroundColor: PREMIUM_COLORS.white,
                    borderRadius: 20,
                    height: 70,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.1,
                    shadowRadius: 15,
                    borderTopWidth: 0,
                    paddingBottom: Platform.OS === 'ios' ? 0 : 10,
                    paddingTop: 10,
                },
                tabBarLabelStyle: { 
                    fontFamily: 'Cairo_700Bold', 
                    fontSize: 10,
                    marginBottom: 5
                },
            }}
        >
            <Tabs.Screen 
                name="index" 
                options={{ 
                    title: 'لوحة القيادة', 
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} /> 
                }} 
            />
            <Tabs.Screen 
                name="users" 
                options={{ 
                    title: 'المستخدمين', 
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group-outline" size={size} color={color} /> 
                }} 
            />
            <Tabs.Screen 
                name="new-accounts" 
                options={{ 
                    title: 'طلبات جديدة', 
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-clock-outline" size={size} color={color} /> 
                }} 
            />
            <Tabs.Screen 
                name="logs" 
                options={{ 
                    title: 'النشاطات', 
                    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="history" size={size} color={color} /> 
                }} 
            />
        </Tabs>
    );
}
