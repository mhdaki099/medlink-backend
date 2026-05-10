import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Animated, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';

const PREMIUM_COLORS = {
    primary: '#2563EB',
    secondary: '#10B981',
    adminHeader: '#1E3A8A',
    background: '#F3F4F6',
    white: '#FFFFFF',
    text: '#1F2937',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    cardLight: 'rgba(255, 255, 255, 0.95)',
    shadow: '#000000',
    actions: {
        login: '#2563EB',
        register: '#10B981',
        create_appointment: '#8B5CF6',
        create_order: '#F59E0B',
        upload_result: '#EC4899',
        update_status: '#F97316',
        delete_user: '#EF4444'
    }
};

export default function AdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    const loadData = async () => {
        try { 
            const l = await api.getAuditLogs(); 
            setLogs(l); 
            
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true })
            ]).start();
        } 
        catch (e) { console.warn(e); } 
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { loadData(); }, []);

    const getActionColor = (action: string) => {
        const lowerAction = action?.toLowerCase() || '';
        if (lowerAction.includes('login') || lowerAction.includes('دخول')) return PREMIUM_COLORS.actions.login;
        if (lowerAction.includes('register') || lowerAction.includes('تسجيل')) return PREMIUM_COLORS.actions.register;
        if (lowerAction.includes('appointment') || lowerAction.includes('موعد')) return PREMIUM_COLORS.actions.create_appointment;
        if (lowerAction.includes('order') || lowerAction.includes('طلب')) return PREMIUM_COLORS.actions.create_order;
        if (lowerAction.includes('delete') || lowerAction.includes('حذف')) return PREMIUM_COLORS.actions.delete_user;
        if (lowerAction.includes('status') || lowerAction.includes('حالة')) return PREMIUM_COLORS.actions.update_status;
        return PREMIUM_COLORS.primary;
    };

    return (
        <View style={styles.root}>
            <View style={styles.headerWrapper}>
                <LinearGradient
                    colors={[PREMIUM_COLORS.adminHeader, PREMIUM_COLORS.primary]}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>سجل الأحداث</Text>
                    <View style={styles.badgeContainer}>
                        <MaterialCommunityIcons name="history" size={16} color={PREMIUM_COLORS.primary} />
                        <Text style={styles.badgeText}>{logs.length} حدث مسجل</Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator color={PREMIUM_COLORS.primary} style={{ marginTop: 60 }} size="large" />
            ) : (
                <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY }] }}>
                    <FlatList
                        data={logs}
                        keyExtractor={(item, i) => item.id || String(i)}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={PREMIUM_COLORS.primary} />}
                        renderItem={({ item: log }) => {
                            const actionColor = getActionColor(log.action);
                            return (
                                <View style={[styles.logCard, { borderRightColor: actionColor }]}>
                                    <View style={styles.logLeft}>
                                        <View style={[styles.iconBox, { backgroundColor: actionColor + '15' }]}>
                                            <MaterialCommunityIcons name="lightning-bolt" size={20} color={actionColor} />
                                        </View>
                                    </View>
                                    <View style={styles.logRight}>
                                        <View style={styles.logHeader}>
                                            <Text style={styles.logTime}>
                                                {new Date(log.timestamp).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })} - {new Date(log.timestamp).toLocaleDateString('ar-SY')}
                                            </Text>
                                            <View style={[styles.actionBadge, { backgroundColor: actionColor + '15' }]}>
                                                <Text style={[styles.actionBadgeText, { color: actionColor }]}>{log.action}</Text>
                                            </View>
                                        </View>
                                        
                                        <Text style={styles.logUser}>بواسطة: {log.user_id}</Text>
                                        
                                        {log.details && (
                                            <View style={styles.detailsBox}>
                                                <Text style={styles.detailsText}>
                                                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        }}
                    />
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: PREMIUM_COLORS.background },
    headerWrapper: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 25,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerGradient: { ...StyleSheet.absoluteFillObject },
    headerContent: { alignItems: 'flex-end' },
    headerTitle: { fontSize: 26, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.white, marginBottom: 8 },
    badgeContainer: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        backgroundColor: PREMIUM_COLORS.white, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 20 
    },
    badgeText: { color: PREMIUM_COLORS.primary, fontFamily: 'Cairo_700Bold', fontSize: 12, marginRight: 6 },
    listContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    logCard: {
        backgroundColor: PREMIUM_COLORS.cardLight,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        borderRightWidth: 4,
        shadowColor: PREMIUM_COLORS.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    logLeft: { marginLeft: 14, marginTop: 2 },
    iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    logRight: { flex: 1, alignItems: 'flex-end' },
    logHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 },
    actionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    actionBadgeText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
    logTime: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted },
    logUser: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: PREMIUM_COLORS.text, marginBottom: 6 },
    detailsBox: { backgroundColor: PREMIUM_COLORS.background, padding: 10, borderRadius: 8, width: '100%', marginTop: 4 },
    detailsText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: PREMIUM_COLORS.textMuted, textAlign: 'right', lineHeight: 18 }
});
