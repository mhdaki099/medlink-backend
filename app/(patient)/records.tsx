import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Image, Platform, Modal, ScrollView
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function MedicalRecords() {
    const { user } = useAuth();
    const router = useRouter();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    const loadRecords = async () => {
        if (!user?.id) return;
        try {
            const data = await api.getPatientHistory(user.id);
            // Combine appointments and physical records if needed, 
            // but for now focus on the MedicalRecord table entries
            setRecords(data.records || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadRecords(); }, [user]);

    const renderRecordItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.recordCard} onPress={() => setSelectedRecord(item)}>
            <View style={styles.recordIcon}>
                <MaterialCommunityIcons 
                    name={item.type === 'prescription' ? 'pill' : 'file-document-outline'} 
                    size={24} 
                    color="#1E88E5" 
                />
            </View>
            <View style={styles.recordInfo}>
                <Text style={styles.recordTitle}>{item.title}</Text>
                <Text style={styles.recordMeta}>{item.uploaded_by} • {item.date}</Text>
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
            </LinearGradient>

            {loading ? (
                <ActivityIndicator color="#1E88E5" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRecordItem}
                    contentContainerStyle={styles.list}
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
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20 },
    recordCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 12, flexDirection: 'row-reverse', alignItems: 'center', elevation: 2 },
    recordIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
    recordInfo: { flex: 1, alignItems: 'flex-end' },
    recordTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    recordMeta: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', marginTop: 2 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyTxt: { fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 15 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '80%', padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    detailLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#64748B', marginBottom: 4, textAlign: 'right' },
    detailVal: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#1E293B', marginBottom: 20, textAlign: 'right' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    contentBox: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#F1F5F9' }
});
