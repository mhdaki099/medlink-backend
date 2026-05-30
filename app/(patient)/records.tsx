import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Platform, Modal, ScrollView, Alert
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';

const OWNER_FILTERS = [
    { key: 'all', label: 'الكل', icon: 'folder-multiple-outline' },
    { key: 'self', label: 'سجلي', icon: 'account-outline' },
    { key: 'child', label: 'الأطفال', icon: 'baby-face-outline' },
    { key: 'father', label: 'الأب', icon: 'account-outline' },
    { key: 'mother', label: 'الأم', icon: 'account-outline' },
    { key: 'spouse', label: 'الزوج/ة', icon: 'heart-outline' },
    { key: 'elderly', label: 'كبار السن', icon: 'account-group-outline' },
];

export default function MedicalRecords() {
    const { user } = useAuth();
    const router = useRouter();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [ownerFilter, setOwnerFilter] = useState('all');

    const loadRecords = async () => {
        if (!user?.id) return;
        try {
            const ownerParam = ownerFilter === 'all' ? undefined : ownerFilter;
            const data = await api.getMedicalRecords(user.id, ownerParam);
            setRecords(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRecords(); }, [user, ownerFilter]);

    const filtered = records;

    const ownerLabel = (owner: string) => ({
        self: 'أنا', child: 'طفل', father: 'أب', mother: 'أم', spouse: 'زوج/زوجة', elderly: 'كبير سن'
    }[owner] || owner);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'prescription': return 'pill';
            case 'lab_result': return 'flask-outline';
            case 'xray': return 'radiobox-marked';
            default: return 'file-document-outline';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'prescription': return '#1E88E5';
            case 'lab_result': return '#8E24AA';
            case 'xray': return '#E65100';
            default: return '#43A047';
        }
    };

    const renderRecordItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.recordCard} onPress={() => setSelectedRecord(item)} activeOpacity={0.85}>
            <View style={[styles.recordIcon, { backgroundColor: getTypeColor(item.type) + '15' }]}>
                <MaterialCommunityIcons 
                    name={getTypeIcon(item.type) as any} 
                    size={24} 
                    color={getTypeColor(item.type)} 
                />
            </View>
            <View style={styles.recordInfo}>
                <Text style={styles.recordTitle}>{item.title}</Text>
                <Text style={styles.recordMeta}>{item.uploaded_by} • {item.date}</Text>
                {item.record_owner && item.record_owner !== 'self' && (
                    <View style={styles.ownerBadge}>
                        <MaterialCommunityIcons 
                            name={item.record_owner === 'child' ? 'baby-face-outline' : 'account-group-outline'} 
                            size={11} color="#6B7280" 
                        />
                        <Text style={styles.ownerBadgeText}>{ownerLabel(item.record_owner)}</Text>
                    </View>
                )}
            </View>
            <Ionicons name="chevron-back" size={20} color="#94A3B8" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>سجلي الطبي</Text>
                    <View style={{ width: 40 }} />
                </View>
                {/* Owner Filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8 }}>
                    {OWNER_FILTERS.map(f => (
                        <TouchableOpacity key={f.key} style={[styles.filterChip, ownerFilter === f.key && styles.filterActive]} onPress={() => setOwnerFilter(f.key)}>
                            <MaterialCommunityIcons name={f.icon as any} size={14} color={ownerFilter === f.key ? '#1E88E5' : 'rgba(255,255,255,0.8)'} />
                            <Text style={[styles.filterText, ownerFilter === f.key && styles.filterTextActive]}>{f.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator color="#1E88E5" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRecordItem}
                    contentContainerStyle={styles.list}
                    onRefresh={loadRecords}
                    refreshing={loading}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MaterialCommunityIcons name="folder-open-outline" size={60} color="#E2E8F0" />
                            <Text style={styles.emptyTxt}>لا توجد سجلات طبية حالياً</Text>
                        </View>
                    }
                />
            )}

            {/* View File Modal */}
            <Modal visible={!!selectedRecord} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setSelectedRecord(null)}>
                                <Ionicons name="close" size={24} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>عرض الملف</Text>
                        </View>

                        {selectedRecord && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.detailLabel}>العنوان:</Text>
                                <Text style={styles.detailVal}>{selectedRecord.title}</Text>
                                
                                <Text style={styles.detailLabel}>بواسطة:</Text>
                                <Text style={styles.detailVal}>{selectedRecord.uploaded_by}</Text>

                                <Text style={styles.detailLabel}>التاريخ:</Text>
                                <Text style={styles.detailVal}>{selectedRecord.date}</Text>

                                {selectedRecord.record_owner && (
                                    <>
                                        <Text style={styles.detailLabel}>السجل لـ:</Text>
                                        <Text style={styles.detailVal}>
                                            {selectedRecord.record_owner === 'self' ? 'نفسي' : selectedRecord.record_owner === 'child' ? 'طفل' : 'قريب'}
                                        </Text>
                                    </>
                                )}

                                <View style={styles.divider} />

                                <Text style={styles.detailLabel}>المحتوى:</Text>
                                <View style={styles.contentBox}>
                                    <Text style={styles.detailVal}>{selectedRecord.content}</Text>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    filterRow: { marginBottom: 4 },
    filterChip: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
    filterActive: { backgroundColor: '#FFF' },
    filterText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: 'rgba(255,255,255,0.9)' },
    filterTextActive: { color: '#1E88E5' },
    list: { padding: 20 },
    recordCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 12, flexDirection: 'row-reverse', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    recordIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
    recordInfo: { flex: 1, alignItems: 'flex-end' },
    recordTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    recordMeta: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', marginTop: 2 },
    ownerBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-end' },
    ownerBadgeText: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#6B7280' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTxt: { fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 15 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '80%', padding: 24 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#F1F5F9', alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    detailLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#64748B', marginBottom: 4, textAlign: 'right' },
    detailVal: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#1E293B', marginBottom: 20, textAlign: 'right' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    contentBox: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#F1F5F9' }
});
