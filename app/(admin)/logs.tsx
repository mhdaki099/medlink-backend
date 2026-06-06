import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import AdminShell, { AdminEmptyState } from '../../src/components/admin/AdminShell';
import { ADMIN_THEME } from '../../src/constants/adminTheme';

const ACTION_COLORS: Record<string, string> = {
    admin: ADMIN_THEME.primary,
    login: '#3B82F6',
    register: ADMIN_THEME.success,
    appointment: '#8B5CF6',
    order: '#F59E0B',
    delete: ADMIN_THEME.danger,
    status: '#F97316',
};

function actionColor(action: string) {
    const a = (action || '').toLowerCase();
    if (a.includes('admin')) return ACTION_COLORS.admin;
    if (a.includes('login') || a.includes('دخول')) return ACTION_COLORS.login;
    if (a.includes('register') || a.includes('تسجيل')) return ACTION_COLORS.register;
    if (a.includes('appointment') || a.includes('موعد')) return ACTION_COLORS.appointment;
    if (a.includes('order') || a.includes('طلب')) return ACTION_COLORS.order;
    if (a.includes('delete') || a.includes('حذف')) return ACTION_COLORS.delete;
    if (a.includes('status') || a.includes('حالة')) return ACTION_COLORS.status;
    return ADMIN_THEME.accent;
}

export default function AdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const loadData = async () => {
        try { setLogs(await api.getAuditLogs({ limit: 200 })); }
        catch (e) { console.warn(e); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { loadData(); }, []);

    const filtered = logs.filter(log => {
        if (!search) return true;
        const q = search.toLowerCase();
        return log.action?.toLowerCase().includes(q)
            || log.user_id?.toLowerCase().includes(q)
            || String(log.details || '').toLowerCase().includes(q);
    });

    return (
        <AdminShell
            title="سجل النشاط"
            subtitle={`${filtered.length} حدث`}
            loading={loading}
            scroll={false}
        >
            <View style={styles.searchBox}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="بحث في السجل..."
                    placeholderTextColor={ADMIN_THEME.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    textAlign="right"
                />
                <MaterialCommunityIcons name="magnify" size={20} color={ADMIN_THEME.textMuted} />
            </View>

            {!loading && filtered.length === 0 ? (
                <AdminEmptyState icon="history" title="لا توجد أحداث" subtitle="سيظهر النشاط هنا عند حدوثه" />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item, i) => item.id || String(i)}
                    style={styles.list}
                    contentContainerStyle={{ paddingBottom: 140 }}
                    showsVerticalScrollIndicator={false}
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); loadData(); }}
                    renderItem={({ item: log }) => {
                        const color = actionColor(log.action);
                        const ts = new Date(log.timestamp);
                        return (
                            <View style={styles.logCard}>
                                <View style={[styles.logStripe, { backgroundColor: color }]} />
                                <View style={styles.logBody}>
                                    <View style={styles.logTop}>
                                        <Text style={styles.logTime}>
                                            {ts.toLocaleDateString('ar-SY', { day: 'numeric', month: 'short' })}
                                            {' · '}
                                            {ts.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <View style={[styles.actionPill, { backgroundColor: color + '15' }]}>
                                            <Text style={[styles.actionText, { color }]}>{log.action}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.userRow}>
                                        <MaterialCommunityIcons name="account-outline" size={14} color={ADMIN_THEME.textMuted} />
                                        <Text style={styles.userText}>{log.user_id}</Text>
                                    </View>
                                    {log.details ? (
                                        <Text style={styles.details}>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</Text>
                                    ) : null}
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </AdminShell>
    );
}

const styles = StyleSheet.create({
    searchBox: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: ADMIN_THEME.border,
        paddingHorizontal: 14,
        height: 48,
        marginBottom: 12,
        gap: 8,
    },
    searchInput: { flex: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: ADMIN_THEME.text },
    list: { flex: 1 },
    logCard: {
        flexDirection: 'row-reverse',
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 14,
        marginBottom: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: ADMIN_THEME.borderLight,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
            android: { elevation: 1 },
        }),
    },
    logStripe: { width: 4 },
    logBody: { flex: 1, padding: 14 },
    logTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    logTime: { fontFamily: 'Cairo_500Medium', fontSize: 11, color: ADMIN_THEME.textMuted },
    actionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    actionText: { fontFamily: 'Cairo_700Bold', fontSize: 11 },
    userRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 6 },
    userText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: ADMIN_THEME.text },
    details: {
        fontFamily: 'Cairo_400Regular', fontSize: 12, color: ADMIN_THEME.textSecondary,
        textAlign: 'right', lineHeight: 18,
        backgroundColor: ADMIN_THEME.surfaceMuted, padding: 10, borderRadius: 8,
    },
});
