import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

const STATUS_LABELS: Record<string, string> = {
    pending: 'بانتظار الصرف',
    partially_dispensed: 'صرف جزئي',
    fully_dispensed: 'صرف كامل',
};

export default function PharmacyPrescriptions() {
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [patientName, setPatientName] = useState('');
    const [phone, setPhone] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [selected, setSelected] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const search = async () => {
        setLoading(true);
        try {
            const data = await api.searchPrescriptions({
                code: code || undefined,
                patient_name: patientName || undefined,
                phone: phone || undefined,
            });
            setResults(data);
            if (data.length === 1) setSelected(data[0]);
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDispense = async (itemIndex: number, action: 'dispense' | 'unavailable' | 'substitute', extra?: any) => {
        if (!selected || !user?.id) return;
        try {
            const updated = await api.dispensePrescriptionItem(selected.id, {
                item_index: itemIndex,
                action,
                pharmacy_id: user.id,
                ...extra,
            });
            setSelected(updated);
            Alert.alert('تم', action === 'dispense' ? 'تم صرف الدواء' : 'تم تحديث الحالة');
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FF9500', '#FF6B00']} style={styles.header}>
                <Text style={styles.headerTitle}>صرف الوصفات</Text>
                <Text style={styles.headerSub}>ابحث بالرمز أو اسم المريض أو الهاتف</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.searchBox}>
                    <TextInput style={styles.input} placeholder="رمز الوصفة RX-..." value={code} onChangeText={setCode} textAlign="right" />
                    <TextInput style={styles.input} placeholder="اسم المريض" value={patientName} onChangeText={setPatientName} textAlign="right" />
                    <TextInput style={styles.input} placeholder="رقم الهاتف" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textAlign="right" />
                    <TouchableOpacity style={styles.searchBtn} onPress={search} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.searchBtnText}>بحث</Text>}
                    </TouchableOpacity>
                </View>

                {selected && (
                    <View style={styles.prescCard}>
                        <View style={styles.prescHeader}>
                            <Text style={styles.code}>{selected.prescription_code}</Text>
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>{STATUS_LABELS[selected.status] || selected.status}</Text>
                            </View>
                        </View>
                        <Text style={styles.patientName}>{selected.patient?.name}</Text>
                        <Text style={styles.doctorName}>د. {selected.doctor?.name}</Text>

                        {(selected.fulfillment_items || selected.medications || []).map((item: any, idx: number) => (
                            <View key={idx} style={styles.medRow}>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text style={styles.medName}>{item.name}</Text>
                                    <Text style={styles.medDose}>{item.dosage} • {item.frequency || item.duration}</Text>
                                    <Text style={styles.medStatus}>الحالة: {item.status || 'pending'}</Text>
                                </View>
                                {selected.status !== 'fully_dispensed' && item.status === 'pending' && (
                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.dispBtn} onPress={() => handleDispense(idx, 'dispense')}>
                                            <MaterialCommunityIcons name="check" size={16} color="#FFF" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.unavailBtn} onPress={() => handleDispense(idx, 'unavailable', { reason: 'غير متوفر' })}>
                                            <MaterialCommunityIcons name="close" size={16} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {results.length > 1 && !selected && results.map((r) => (
                    <TouchableOpacity key={r.id} style={styles.resultRow} onPress={() => setSelected(r)}>
                        <Text style={styles.resultCode}>{r.prescription_code}</Text>
                        <Text style={styles.resultName}>{r.patient?.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
    headerTitle: { fontFamily: 'Cairo_700Bold', fontSize: 22, color: '#FFF', textAlign: 'right' },
    headerSub: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: 4 },
    content: { padding: 20, paddingBottom: 120 },
    searchBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, gap: 10, marginBottom: 16 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', borderWidth: 1, borderColor: '#E2E8F0' },
    searchBtn: { backgroundColor: '#FF9500', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center' },
    searchBtnText: { fontFamily: 'Cairo_700Bold', color: '#FFF' },
    prescCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, gap: 10 },
    prescHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    code: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: '#1E293B' },
    statusBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontFamily: 'Cairo_700Bold', fontSize: 11, color: '#1E88E5' },
    patientName: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#1E293B', textAlign: 'right' },
    doctorName: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: '#64748B', textAlign: 'right' },
    medRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 },
    medName: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: '#1E293B' },
    medDose: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: '#64748B' },
    medStatus: { fontFamily: 'Cairo_600SemiBold', fontSize: 11, color: '#FF9500' },
    actions: { flexDirection: 'row', gap: 8 },
    dispBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
    unavailBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
    resultRow: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row-reverse', justifyContent: 'space-between' },
    resultCode: { fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    resultName: { fontFamily: 'Cairo_400Regular', color: '#64748B' },
});
