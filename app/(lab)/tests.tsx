import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const C = {
    primary: '#8E24AA', accent: '#CE93D8', bg: '#F8FAFC', white: '#FFF',
    text: '#111827', textSec: '#6B7280', border: '#F1F5F9',
};

export default function LabTests() {
    const { user } = useAuth();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            if (!user?.id) return;
            try { const t = await api.getLabTests(user.id); setTests(t); }
            catch (e) { console.warn(e); } finally { setLoading(false); }
        };
        load();
    }, [user]);

    const filtered = tests.filter(t => !search || t.name?.includes(search) || t.category?.includes(search));

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#6A1B9A', C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerRow}>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="flask" size={26} color={C.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>قائمة الفحوصات</Text>
                        <Text style={styles.headerSub}>{tests.length} فحص متاح</Text>
                    </View>
                </View>
                <View style={styles.searchBar}>
                    <MaterialCommunityIcons name="magnify" size={20} color="rgba(255,255,255,0.7)" />
                    <TextInput style={styles.searchInput} placeholder="ابحث عن فحص..." placeholderTextColor="rgba(255,255,255,0.6)"
                        value={search} onChangeText={setSearch} textAlign="right" />
                </View>
            </LinearGradient>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="flask-empty-outline" size={56} color="#E5E7EB" />
                            <Text style={styles.emptyText}>لا توجد فحوصات</Text>
                        </View>
                    ) : filtered.map((t: any) => (
                        <TouchableOpacity key={t.id} style={styles.testCard} onPress={() => setSelected(t)} activeOpacity={0.85}>
                            <View style={styles.cardTop}>
                                <View style={styles.catBadge}>
                                    <Text style={styles.catText}>{t.category || 'عام'}</Text>
                                </View>
                                <Text style={styles.testName}>{t.name}</Text>
                            </View>
                            {t.description ? <Text style={styles.testDesc} numberOfLines={2}>{t.description}</Text> : null}
                            <View style={styles.cardFooter}>
                                <View style={styles.metaPill}>
                                    <MaterialCommunityIcons name="cash" size={13} color={C.primary} />
                                    <Text style={styles.metaText}>{(t.price || 0).toLocaleString()} ل.س</Text>
                                </View>
                                <View style={styles.metaPill}>
                                    <MaterialCommunityIcons name="timer-outline" size={13} color={C.textSec} />
                                    <Text style={styles.metaText}>{t.duration_hours} ساعة</Text>
                                </View>
                                {t.preparation && (
                                    <View style={[styles.metaPill, { backgroundColor: '#FEF3C7' }]}>
                                        <MaterialCommunityIcons name="clipboard-text-outline" size={13} color="#D97706" />
                                        <Text style={[styles.metaText, { color: '#D97706' }]}>تحضير مطلوب</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
            </ScrollView>

            {/* Test Detail Modal */}
            <Modal visible={!!selected} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setSelected(null)}>
                                <MaterialCommunityIcons name="close" size={24} color={C.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{selected?.name}</Text>
                        </View>
                        {selected && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailVal}>{selected.category || 'عام'}</Text>
                                    <Text style={styles.detailLabel}>التصنيف</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailVal}>{(selected.price || 0).toLocaleString()} ل.س</Text>
                                    <Text style={styles.detailLabel}>السعر</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailVal}>{selected.duration_hours} ساعة</Text>
                                    <Text style={styles.detailLabel}>وقت النتيجة</Text>
                                </View>
                                {selected.description && (
                                    <View style={styles.descBox}>
                                        <Text style={styles.detailLabel}>الوصف</Text>
                                        <Text style={styles.descText}>{selected.description}</Text>
                                    </View>
                                )}
                                {selected.preparation && (
                                    <View style={[styles.descBox, { backgroundColor: '#FEF3C7' }]}>
                                        <Text style={[styles.detailLabel, { color: '#D97706' }]}>تعليمات التحضير</Text>
                                        <Text style={[styles.descText, { color: '#92400E' }]}>{selected.preparation}</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20, paddingHorizontal: 20, overflow: 'hidden' },
    headerBlob: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)', top: -40, right: -30 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginBottom: 16 },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)' },
    searchBar: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 14, height: 44, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#FFF' },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.textSec },
    testCard: { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    testName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right' },
    catBadge: { backgroundColor: C.primary + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    catText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: C.primary },
    testDesc: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', lineHeight: 18, marginBottom: 10 },
    cardFooter: { flexDirection: 'row-reverse', gap: 8, flexWrap: 'wrap' },
    metaPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    metaText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '75%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right', marginRight: 10 },
    detailRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    detailLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.textSec },
    detailVal: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: C.text },
    descBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginTop: 12 },
    descText: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: C.text, textAlign: 'right', lineHeight: 20, marginTop: 6 },
});
