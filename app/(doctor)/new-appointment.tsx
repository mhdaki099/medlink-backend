import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import AppointmentDateTimePicker from '../../src/components/AppointmentDateTimePicker';
import { isSlotBookedForDate } from '../../src/utils/appointmentTime';

export default function NewAppointment() {
    const router = useRouter();
    const { user } = useAuth();
    const doctorId = user?.id;

    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [bookedSlots, setBookedSlots] = useState<any[]>([]);

    useEffect(() => {
        if (!doctorId) {
            setLoading(false);
            return;
        }
        api.getDoctorPatients(doctorId)
            .then(setPatients)
            .catch((e: any) => Alert.alert('خطأ', e.message || 'تعذر تحميل المرضى'))
            .finally(() => setLoading(false));
    }, [doctorId]);

    useEffect(() => {
        if (!doctorId || !date) return;
        api.getDoctorAvailability(doctorId, date)
            .then((av) => setBookedSlots(av.booked_slots || []))
            .catch(() => setBookedSlots([]));
    }, [doctorId, date]);

    const filteredPatients = patients.filter(p => {
        const q = search.trim();
        if (!q) return true;
        return p.name?.includes(q) || p.phone?.includes(q) || p.patient_unique_id?.includes(q);
    });

    const handleCreate = async () => {
        if (!selectedPatient) return Alert.alert('تنبيه', 'يرجى اختيار مريض');
        if (!date || !time) return Alert.alert('تنبيه', 'يرجى تحديد التاريخ والوقت');
        if (isSlotBookedForDate(bookedSlots, date, time)) {
            return Alert.alert('محجوز', 'هذا الموعد محجوز بالفعل — اختر وقتاً آخر');
        }
        setSubmitting(true);
        try {
            await api.createManualAppointment({
                doctor_id: doctorId!,
                patient_id: selectedPatient.id,
                date,
                time,
                notes,
                price: user?.price_per_session || 0,
            });
            Alert.alert('✅ تم', 'تم إنشاء الموعد وإرسال إشعار للمريض', [
                { text: 'حسناً', onPress: () => router.back() },
            ]);
        } catch (e: any) {
            Alert.alert('خطأ', e.message?.includes('booked') ? 'هذا الموعد محجوز بالفعل' : (e.message || 'فشل إنشاء الموعد'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1E88E5" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>موعد جديد</Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View style={styles.card}>
                    <Text style={styles.label}>مرضاي</Text>
                    <Text style={styles.subLabel}>المرضى الذين لديهم مواعيد معك فقط</Text>
                    {!selectedPatient ? (
                        <>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="ابحث بالاسم أو الهاتف..."
                                value={search}
                                onChangeText={setSearch}
                                textAlign="right"
                            />
                            {filteredPatients.length === 0 ? (
                                <View style={styles.emptyPatients}>
                                    <Ionicons name="people-outline" size={32} color="#CBD5E1" />
                                    <Text style={styles.emptyText}>لا يوجد مرضى بعد</Text>
                                </View>
                            ) : (
                                filteredPatients.slice(0, 8).map(p => (
                                    <TouchableOpacity key={p.id} style={styles.patientItem} onPress={() => setSelectedPatient(p)}>
                                        <View style={styles.patientIcon}>
                                            <Ionicons name="person" size={18} color="#1E88E5" />
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            <Text style={styles.patientName}>{p.name}</Text>
                                            <Text style={styles.patientPhone}>{p.phone}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </>
                    ) : (
                        <View style={styles.selectedBox}>
                            <TouchableOpacity onPress={() => setSelectedPatient(null)}>
                                <Ionicons name="close-circle" size={22} color="#EF4444" />
                            </TouchableOpacity>
                            <View style={{ flex: 1, alignItems: 'flex-end', marginRight: 10 }}>
                                <Text style={styles.selectedName}>{selectedPatient.name}</Text>
                                <Text style={styles.patientPhone}>{selectedPatient.phone}</Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                        </View>
                    )}
                </View>

                {doctorId ? (
                    <View style={styles.card}>
                        <AppointmentDateTimePicker
                            doctorId={doctorId}
                            date={date}
                            time={time}
                            onDateChange={setDate}
                            onTimeChange={setTime}
                        />
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.label}>ملاحظات (اختياري)</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                        placeholder="أي ملاحظات للمريض..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlign="right"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.createBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleCreate}
                    disabled={submitting}
                >
                    <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.createBtnGrad}>
                        {submitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="calendar-check" size={22} color="#FFF" />
                                <Text style={styles.createBtnText}>إنشاء الموعد وإرسال إشعار</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    card: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
    label: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right', marginBottom: 6 },
    subLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#94A3B8', textAlign: 'right', marginBottom: 10 },
    searchInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14, marginBottom: 10 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14 },
    patientItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    patientIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' },
    patientName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    patientPhone: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    selectedBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12 },
    selectedName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    emptyPatients: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8' },
    createBtn: { height: 56, borderRadius: 28, overflow: 'hidden', marginTop: 8 },
    createBtnGrad: { flex: 1, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 10 },
    createBtnText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
