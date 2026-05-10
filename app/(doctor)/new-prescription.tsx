import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, 
    TextInput, Alert, ActivityIndicator, Platform, FlatList
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function NewPrescription() {
    const router = useRouter();
    const { patientId, name, appointmentId } = useLocalSearchParams() as { patientId: string, name: string, appointmentId: string };
    const { user } = useAuth();
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [meds, setMeds] = useState<{ name: string, dosage: string, freq: string }[]>([
        { name: '', dosage: '', freq: '' }
    ]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.getPatients()
            .then(pats => {
                setPatients(pats);
                if (patientId) {
                    const found = pats.find(p => p.id === patientId);
                    if (found) setSelectedPatient(found);
                    else if (name) setSelectedPatient({ id: patientId, name });
                }
            })
            .finally(() => setLoading(false));
    }, [patientId]);

    const filteredPatients = patients.filter(p => 
        p.name.includes(search) || p.phone?.includes(search)
    );

    const addMedRow = () => setMeds([...meds, { name: '', dosage: '', freq: '' }]);
    const updateMed = (idx: number, field: string, val: string) => {
        const newMeds = [...meds];
        (newMeds[idx] as any)[field] = val;
        setMeds(newMeds);
    };

    const handleSave = async () => {
        if (!selectedPatient) return Alert.alert('تنبيه', 'يرجى اختيار مريض');
        if (meds.some(m => !m.name)) return Alert.alert('تنبيه', 'يرجى إدخال اسم الدواء');

        setSubmitting(true);
        try {
            await api.addPrescription(user!.id, selectedPatient.id, meds, notes);
            if (appointmentId) {
                await api.updateAppointmentStatus(appointmentId, 'completed');
            }
            Alert.alert('✅ تم', 'تم حفظ الوصفة الطبية وإنهاء الجلسة بنجاح');
            router.back();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <View style={styles.loading}>
            <ActivityIndicator size="large" color="#1E88E5" />
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>إضافة وصفة طبية</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Patient Selection */}
                <View style={[styles.card, { marginTop: -20 }]}>
                    <Text style={styles.label}>اختر المريض</Text>
                    {!selectedPatient ? (
                        <View>
                            <TextInput 
                                style={styles.searchInput} 
                                placeholder="ابحث عن مريض بالاسم أو الرقم..." 
                                value={search}
                                onChangeText={setSearch}
                                textAlign="right"
                            />
                            <View style={styles.patientList}>
                                {filteredPatients.slice(0, 3).map(p => (
                                    <TouchableOpacity key={p.id} style={styles.patientItem} onPress={() => setSelectedPatient(p)}>
                                        <Text style={styles.pName}>{p.name}</Text>
                                        <Ionicons name="person-circle" size={20} color="#94A3B8" />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : (
                        <View style={styles.selectedPatientBox}>
                            <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                            </TouchableOpacity>
                            <Text style={styles.selectedPName}>{selectedPatient.name}</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        </View>
                    )}
                </View>

                {/* Medications List */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <TouchableOpacity onPress={addMedRow}>
                            <Ionicons name="add-circle" size={24} color="#1E88E5" />
                        </TouchableOpacity>
                        <Text style={styles.label}>الأدوية المقررة</Text>
                    </View>

                    {meds.map((m, idx) => (
                        <Animated.View key={idx} entering={FadeInRight.delay(idx * 100)} style={styles.medRow}>
                            <TextInput 
                                style={[styles.input, { flex: 2 }]} 
                                placeholder="اسم الدواء (مثلاً: بنادول)" 
                                value={m.name}
                                onChangeText={(t) => updateMed(idx, 'name', t)}
                                textAlign="right"
                            />
                            <TextInput 
                                style={[styles.input, { flex: 1, marginHorizontal: 5 }]} 
                                placeholder="الجرعة" 
                                value={m.dosage}
                                onChangeText={(t) => updateMed(idx, 'dosage', t)}
                                textAlign="right"
                            />
                             <TextInput 
                                style={[styles.input, { flex: 1 }]} 
                                placeholder="التكرار" 
                                value={m.freq}
                                onChangeText={(t) => updateMed(idx, 'freq', t)}
                                textAlign="right"
                            />
                        </Animated.View>
                    ))}
                </View>

                {/* Notes */}
                <View style={styles.card}>
                    <Text style={styles.label}>ملاحظات إضافية</Text>
                    <TextInput 
                        style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 10 }]} 
                        placeholder="أدخل أي ملاحظات إضافية هنا..." 
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlign="right"
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity 
                    style={[styles.saveBtn, submitting && { opacity: 0.7 }]} 
                    onPress={handleSave}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.saveBtnTxt}>حفظ وإرسال الوصفة</Text>
                            <MaterialCommunityIcons name="prescription" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    content: { paddingHorizontal: 20 },
    card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    label: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B', marginBottom: 12, textAlign: 'right' },
    searchInput: { backgroundColor: '#F8FAFC', height: 48, borderRadius: 15, paddingHorizontal: 15, fontFamily: 'Cairo_400Regular', borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 10 },
    patientList: { gap: 5 },
    patientItem: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#FAFBFF', borderRadius: 12 },
    pName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#475569' },
    selectedPatientBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#DCFCE7' },
    selectedPName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#166534' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    medRow: { flexDirection: 'row-reverse', marginBottom: 10 },
    input: { backgroundColor: '#F8FAFC', height: 48, borderRadius: 15, paddingHorizontal: 15, fontFamily: 'Cairo_400Regular', borderWidth: 1, borderColor: '#F1F5F9' },
    saveBtn: { backgroundColor: '#1E88E5', height: 55, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    saveBtnTxt: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' }
});
