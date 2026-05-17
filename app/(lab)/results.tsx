import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const C = {
    primary: '#8E24AA', accent: '#CE93D8', success: '#10B981', danger: '#EF4444', warning: '#F59E0B',
    bg: '#F8FAFC', white: '#FFF', text: '#111827', textSec: '#6B7280', border: '#F1F5F9',
};
const STATUS_COLORS: Record<string, string> = { normal: C.success, high: C.danger, low: C.warning };
const STATUS_ICONS: Record<string, string> = { normal: 'check-circle', high: 'arrow-up-circle', low: 'arrow-down-circle' };

export default function LabResults() {
    const { user } = useAuth();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            try { const res = await api.getLabResults(); setResults(res); }
            catch (e) { console.warn(e); } finally { setLoading(false); }
        };
        load();
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#6A1B9A', C.primary, C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerRow}>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="file-document" size={26} color={C.primary} />
                    </View>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>النتائج المرفوعة</Text>
                        <Text style={styles.headerSub}>{results.length} نتيجة</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" /> :
                    results.length === 0 ? (
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="file-document-outline" size={56} color="#E5E7EB" />
                            <Text style={styles.emptyText}>لا توجد نتائج مرفوعة</Text>
                        </View>
                    ) : results.map((res: any) => (
                        <TouchableOpacity key={res.id} style={styles.card} onPress={() => setSelected(res)} activeOpacity={0.85}>
                            <View style={styles.cardTop}>
                                <Text style={styles.dateText}>{res.date}</Text>
                                <Text style={styles.testName}>{res.test?.name || 'تحليل'}</Text>
                            </View>
                            <View style={styles.patientRow}>
                                <MaterialCommunityIcons name="account" size={14} color={C.textSec} />
                                <Text style={styles.patientText}>{res.patient_id}</Text>
                            </View>
                            <View style={styles.valuesPreview}>
                                {(res.values || []).slice(0, 3).map((v: any, i: number) => (
                                    <View key={i} style={[styles.valuePill, { backgroundColor: (STATUS_COLORS[v.status] || C.primary) + '15' }]}>
                                        <MaterialCommunityIcons name={STATUS_ICONS[v.status] as any || 'help-circle'} size={12} color={STATUS_COLORS[v.status] || C.primary} />
                                        <Text style={[styles.valuePillText, { color: STATUS_COLORS[v.status] || C.primary }]}>{v.parameter}</Text>
                                    </View>
                                ))}
                                {(res.values || []).length > 3 && (
                                    <View style={styles.morePill}>
                                        <Text style={styles.morePillText}>+{res.values.length - 3}</Text>
                                    </View>
                                )}
                            </View>
                            {res.notes && <Text style={styles.notesText} numberOfLines={1}>📝 {res.notes}</Text>}
                        </TouchableOpacity>
                    ))}
            </ScrollView>

            {/* Result Detail Modal */}
            <Modal visible={!!selected} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setSelected(null)}>
                                <MaterialCommunityIcons name="close" size={24} color={C.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{selected?.test?.name || 'نتيجة التحليل'}</Text>
                        </View>
                        {selected && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalSub}>التاريخ: {selected.date}</Text>
                                {(selected.values || []).map((v: any, i: number) => (
                                    <View key={i} style={styles.valueRow}>
                                        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[v.status] || C.primary) + '18' }]}>
                                            <MaterialCommunityIcons name={STATUS_ICONS[v.status] as any || 'help'} size={14} color={STATUS_COLORS[v.status] || C.primary} />
                                        </View>
                                        <Text style={styles.valueData}>{v.value} {v.unit}</Text>
                                        <Text style={styles.valueName}>{v.parameter}</Text>
                                    </View>
                                ))}
                                {selected.notes && (
                                    <View style={styles.notesBox}>
                                        <Text style={styles.notesLabel}>ملاحظات</Text>
                                        <Text style={styles.notesContent}>{selected.notes}</Text>
                                    </View>
                                )}
                                <View style={{ height: 30 }} />
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
    headerBlob: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.08)', top: -40, left: -30 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)' },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.textSec },
    card: { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    cardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    testName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text },
    dateText: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec },
    patientRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginBottom: 10 },
    patientText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec },
    valuesPreview: { flexDirection: 'row-reverse', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
    valuePill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    valuePillText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
    morePill: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    morePillText: { fontSize: 10, fontFamily: 'Cairo_700Bold', color: C.textSec },
    notesText: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '80%' },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right', marginRight: 10 },
    modalSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', marginBottom: 16 },
    valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
    valueName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: C.text, flex: 1, textAlign: 'right' },
    valueData: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: C.text, minWidth: 80, textAlign: 'center' },
    statusBadge: { borderRadius: 8, padding: 4 },
    notesBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginTop: 16 },
    notesLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.textSec, textAlign: 'right', marginBottom: 6 },
    notesContent: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: C.text, textAlign: 'right', lineHeight: 20 },
});
