import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
    FlatList, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/services/api';
import AdminShell, { AdminCard, AdminEmptyState } from '../../src/components/admin/AdminShell';
import { ADMIN_THEME, getAdminTabClearance } from '../../src/constants/adminTheme';
import { HOMEPAGE_SECTIONS, HomepageRole, homepageSection } from '../../src/constants/homepageFeatured';
import { useAdminPermissions } from '../../src/hooks/useAdminPermissions';

type Provider = {
    id: string;
    name: string;
    city?: string;
    specialization?: string;
    rating?: number;
    is_featured?: boolean;
};

export default function AdminHomepageScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { can } = useAdminPermissions();
    const params = useLocalSearchParams<{ tab?: string | string[] }>();
    const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;

    const [activeTab, setActiveTab] = useState<HomepageRole>(
        (tabParam && HOMEPAGE_SECTIONS.some(s => s.key === tabParam) ? tabParam : 'doctor') as HomepageRole,
    );
    const [featured, setFeatured] = useState<Provider[]>([]);
    const [available, setAvailable] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const section = homepageSection(activeTab);
    const canManage = can('users_feature');

    useEffect(() => {
        if (tabParam && HOMEPAGE_SECTIONS.some(s => s.key === tabParam)) {
            setActiveTab(tabParam as HomepageRole);
        }
    }, [tabParam]);

    const loadData = async () => {
        try {
            const data = await api.getHomepageFeatured(activeTab);
            setFeatured(data.featured || []);
            setAvailable(data.available || []);
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'تعذر تحميل البيانات');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        setSearch('');
        loadData();
    }, [activeTab]);

    const saveOrder = async (ordered: Provider[]) => {
        if (!canManage) return;
        setSaving(true);
        try {
            await api.updateHomepageFeatured(activeTab, ordered.map(p => p.id));
            setFeatured(ordered);
            await loadData();
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'تعذر الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const addProvider = async (item: Provider) => {
        if (featured.length >= section.limit) {
            return Alert.alert('الحد مكتمل', `يمكن عرض ${section.limit} ${section.label} فقط في الصفحة الرئيسية`);
        }
        await saveOrder([...featured, item]);
    };

    const removeProvider = (id: string) => {
        Alert.alert('إزالة من الرئيسية', 'إزالة هذا العنصر من صفحة المريض الرئيسية؟', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'إزالة', style: 'destructive', onPress: () => saveOrder(featured.filter(p => p.id !== id)) },
        ]);
    };

    const moveItem = (index: number, direction: -1 | 1) => {
        const next = [...featured];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        saveOrder(next);
    };

    const filteredAvailable = useMemo(() => {
        if (!search.trim()) return available;
        const q = search.toLowerCase();
        return available.filter(p =>
            [p.name, p.city, p.specialization, p.id].some(v => v?.toLowerCase?.().includes(q)),
        );
    }, [available, search]);

    const renderFeatured = useCallback(({ item, index }: { item: Provider; index: number }) => (
        <View style={styles.featuredCard}>
            <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{index + 1}</Text>
            </View>
            <View style={styles.providerMain}>
                <Text style={styles.providerName}>{item.name}</Text>
                <Text style={styles.providerMeta}>
                    {[item.specialization, item.city].filter(Boolean).join(' · ') || item.id}
                </Text>
                {item.rating ? <Text style={styles.ratingText}>★ {Number(item.rating).toFixed(1)}</Text> : null}
            </View>
            <View style={styles.featuredActions}>
                <TouchableOpacity
                    style={[styles.miniBtn, index === 0 && styles.miniBtnDisabled]}
                    onPress={() => moveItem(index, -1)}
                    disabled={index === 0 || saving}
                >
                    <MaterialCommunityIcons name="chevron-up" size={18} color={index === 0 ? ADMIN_THEME.textMuted : ADMIN_THEME.accent} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.miniBtn, index === featured.length - 1 && styles.miniBtnDisabled]}
                    onPress={() => moveItem(index, 1)}
                    disabled={index === featured.length - 1 || saving}
                >
                    <MaterialCommunityIcons name="chevron-down" size={18} color={index === featured.length - 1 ? ADMIN_THEME.textMuted : ADMIN_THEME.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniBtn, styles.removeBtn]} onPress={() => removeProvider(item.id)} disabled={saving}>
                    <MaterialCommunityIcons name="close" size={18} color={ADMIN_THEME.danger} />
                </TouchableOpacity>
            </View>
        </View>
    ), [featured.length, saving]);

    const renderAvailable = useCallback(({ item }: { item: Provider }) => (
        <TouchableOpacity
            style={styles.availableRow}
            onPress={() => addProvider(item)}
            disabled={saving || featured.length >= section.limit}
            activeOpacity={0.8}
        >
            <MaterialCommunityIcons name="plus-circle-outline" size={22} color={ADMIN_THEME.accent} />
            <View style={styles.providerMain}>
                <Text style={styles.providerName}>{item.name}</Text>
                <Text style={styles.providerMeta}>
                    {[item.specialization, item.city].filter(Boolean).join(' · ') || item.id}
                </Text>
            </View>
        </TouchableOpacity>
    ), [featured.length, saving, section.limit]);

    if (!canManage) {
        return (
            <AdminShell title="الصفحة الرئيسية" subtitle="غير مصرح">
                <AdminEmptyState icon="shield-lock-outline" title="ليس لديك صلاحية" subtitle="صلاحية تمييز الأطباء والصيدليات مطلوبة" />
            </AdminShell>
        );
    }

    return (
        <AdminShell
            title="عرض الصفحة الرئيسية"
            subtitle="اختر ما يظهر للمرضى في التطبيق"
            loading={loading}
            scroll={false}
            headerLeft={(
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
                </TouchableOpacity>
            )}
        >
            <AdminCard style={styles.previewCard}>
                <View style={styles.previewHeader}>
                    <MaterialCommunityIcons name="cellphone" size={20} color={ADMIN_THEME.accent} />
                    <Text style={styles.previewTitle}>معاينة قسم «{section.patientTitle}»</Text>
                </View>
                <Text style={styles.previewSub}>
                    يظهر للمرضى في الصفحة الرئيسية — الحد الأقصى {section.limit} عناصر
                </Text>
                <View style={styles.counterRow}>
                    <Text style={[styles.counterVal, featured.length >= section.limit && styles.counterFull]}>
                        {featured.length}/{section.limit}
                    </Text>
                    <Text style={styles.counterLabel}>محدد للعرض</Text>
                </View>
            </AdminCard>

            <ScrollTabs active={activeTab} onChange={setActiveTab} />

            {saving ? (
                <View style={styles.savingBar}>
                    <ActivityIndicator size="small" color={ADMIN_THEME.accent} />
                    <Text style={styles.savingText}>جاري الحفظ...</Text>
                </View>
            ) : null}

            <FlatList
                style={{ flex: 1 }}
                data={[{ key: 'body' }]}
                keyExtractor={i => i.key}
                refreshControl={(
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={ADMIN_THEME.accent} />
                )}
                contentContainerStyle={{ paddingBottom: getAdminTabClearance(insets.bottom) }}
                renderItem={() => (
                    <View>
                        <Text style={styles.blockTitle}>يظهر في الرئيسية</Text>
                        {featured.length === 0 ? (
                            <View style={styles.emptyFeatured}>
                                <MaterialCommunityIcons name="star-outline" size={32} color={ADMIN_THEME.textMuted} />
                                <Text style={styles.emptyFeaturedText}>لم يتم تحديد عناصر — أضف من القائمة أدناه</Text>
                            </View>
                        ) : (
                            featured.map((item, index) => (
                                <View key={item.id}>{renderFeatured({ item, index })}</View>
                            ))
                        )}

                        <Text style={[styles.blockTitle, { marginTop: 20 }]}>إضافة من القائمة</Text>
                        <View style={styles.searchBox}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="بحث..."
                                placeholderTextColor={ADMIN_THEME.textMuted}
                                value={search}
                                onChangeText={setSearch}
                                textAlign="right"
                            />
                            <MaterialCommunityIcons name="magnify" size={20} color={ADMIN_THEME.textMuted} />
                        </View>
                        {filteredAvailable.length === 0 ? (
                            <Text style={styles.noMore}>لا يوجد المزيد من {section.label}</Text>
                        ) : (
                            filteredAvailable.map(item => (
                                <View key={item.id}>{renderAvailable({ item })}</View>
                            ))
                        )}
                    </View>
                )}
            />
        </AdminShell>
    );
}

function ScrollTabs({ active, onChange }: { active: HomepageRole; onChange: (r: HomepageRole) => void }) {
    return (
        <View style={styles.tabsWrap}>
            {HOMEPAGE_SECTIONS.map(tab => {
                const selected = active === tab.key;
                return (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tabChip, selected && { backgroundColor: tab.color, borderColor: tab.color }]}
                        onPress={() => onChange(tab.key)}
                    >
                        <MaterialCommunityIcons name={tab.icon as any} size={16} color={selected ? '#FFF' : tab.color} />
                        <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab.label}</Text>
                        <Text style={[styles.tabLimit, selected && styles.tabLimitActive]}>{tab.limit}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center', alignItems: 'center',
    },
    previewCard: { marginBottom: 12, backgroundColor: ADMIN_THEME.infoBg, borderColor: '#C7D2FE' },
    previewHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 6 },
    previewTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: ADMIN_THEME.primary },
    previewSub: { fontFamily: 'Cairo_500Medium', fontSize: 12, color: ADMIN_THEME.textSecondary, textAlign: 'right' },
    counterRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 10 },
    counterVal: { fontFamily: 'Cairo_800ExtraBold', fontSize: 20, color: ADMIN_THEME.accent },
    counterFull: { color: ADMIN_THEME.warning },
    counterLabel: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: ADMIN_THEME.textMuted },
    tabsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    tabChip: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
        backgroundColor: ADMIN_THEME.surface, borderWidth: 1, borderColor: ADMIN_THEME.border,
    },
    tabText: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: ADMIN_THEME.textSecondary },
    tabTextActive: { color: '#FFF' },
    tabLimit: {
        fontFamily: 'Cairo_700Bold', fontSize: 10, color: ADMIN_THEME.textMuted,
        backgroundColor: ADMIN_THEME.surfaceMuted, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    },
    tabLimitActive: { color: '#FFF', backgroundColor: 'rgba(255,255,255,0.25)' },
    savingBar: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 8 },
    savingText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: ADMIN_THEME.textMuted },
    blockTitle: {
        fontFamily: 'Cairo_800ExtraBold', fontSize: 14, color: ADMIN_THEME.text,
        textAlign: 'right', marginBottom: 10,
    },
    featuredCard: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
        backgroundColor: ADMIN_THEME.surface, borderRadius: 14, padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: '#FDE68A',
        ...Platform.select({
            ios: { shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
            android: { elevation: 2 },
        }),
    },
    orderBadge: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFBEB',
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A',
    },
    orderText: { fontFamily: 'Cairo_800ExtraBold', fontSize: 12, color: '#B45309' },
    providerMain: { flex: 1, alignItems: 'flex-end' },
    providerName: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: ADMIN_THEME.text },
    providerMeta: { fontFamily: 'Cairo_500Medium', fontSize: 11, color: ADMIN_THEME.textMuted, marginTop: 2 },
    ratingText: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, color: '#B45309', marginTop: 4 },
    featuredActions: { flexDirection: 'row', gap: 4 },
    miniBtn: {
        width: 32, height: 32, borderRadius: 10, backgroundColor: ADMIN_THEME.surfaceMuted,
        justifyContent: 'center', alignItems: 'center',
    },
    miniBtnDisabled: { opacity: 0.4 },
    removeBtn: { backgroundColor: ADMIN_THEME.dangerBg },
    emptyFeatured: {
        alignItems: 'center', padding: 24, backgroundColor: ADMIN_THEME.surface,
        borderRadius: 14, borderWidth: 1, borderColor: ADMIN_THEME.borderLight, gap: 8,
    },
    emptyFeaturedText: { fontFamily: 'Cairo_500Medium', fontSize: 12, color: ADMIN_THEME.textMuted, textAlign: 'center' },
    searchBox: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
        backgroundColor: ADMIN_THEME.surface, borderRadius: 12, borderWidth: 1, borderColor: ADMIN_THEME.border,
        paddingHorizontal: 12, height: 44, marginBottom: 10,
    },
    searchInput: { flex: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: ADMIN_THEME.text },
    availableRow: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
        backgroundColor: ADMIN_THEME.surface, borderRadius: 12, padding: 12, marginBottom: 6,
        borderWidth: 1, borderColor: ADMIN_THEME.borderLight,
    },
    noMore: { fontFamily: 'Cairo_500Medium', fontSize: 12, color: ADMIN_THEME.textMuted, textAlign: 'center', paddingVertical: 16 },
});
