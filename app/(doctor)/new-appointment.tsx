import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform, FlatList
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function NewAppointment() {
    const router = useRouter();
    const { user } = useAuth();
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [availability, setAvailability] = useState<any>({ time_slots: [], booked_slots: [] });

    useEffect(() => {
        api.getPatients()
            .then(setPatients)
            .finally(() => setLoading(false));
        if (user?.id) {
            api.getDoctorAvailability(user.id)
                .then(setAvailability)
                .catch(() => {});
        }
    }, [user]);

    const filteredPatients = patients.filter(p =>
        p.name?.includes(search) || p.phone?.includes(search)
    );

    const isSlotBooked = (t: string) =>
        availability.booked_slots?.some((s: any) => s.date === date && s.time === t);

    const handleCreate = async () => {
        if (!selectedPatient) return Alert.alert('تنبيه', 'يرجى اختيار مريض');
        if (!date || !time) return Alert.alert('تنبيه', 'يرجى تحديد التاريخ والوقت');
        setSubmitting(true);
        try {
            await api.createManualAppointment({
                doctor_id: user!.id,
                patient_id: selectedPatient.id,
                date,
                time,
                notes,
                price: user?.price_per_session || 0,
            });
            Alert.alert('✅ تم', 'تم إنشاء الموعد وإرسال إشعار للمريض', [
                { text: 'حسناً', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <View style={styles.center}><ActivityIndicator size="large" color="#1E88E5" /></View>
    );

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
                {/* Patient Selection */}
                <View style={styles.card}>
                    <Text style={styles.label}>اختر المريض</Text>
                    {!selectedPatient ? (
                        <>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="ابحث بالاسم أو الهاتف..."
                                value={search}
                                onChangeText={setSearch}
                                textAlign="right"
                            />
                            {filteredPatients.slice(0, 5).map(p => (
                                <TouchableOpacity key={p.id} style={styles.patientItem} onPress={() => setSelectedPatient(p)}>
                                    <View style={styles.patientIcon}>
                                        <Ionicons name="person" size={18} color="#1E88E5" />
                                    </View>
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.patientName}>{p.name}</Text>
                                        <Text style={styles.patientPhone}>{p.phone}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
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

                {/* Date & Time */}
                <View style={styles.card}>
                    <Text style={styles.label}>التاريخ (YYYY-MM-DD)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="2025-01-15"
                        value={date}
                        onChangeText={setDate}
                        textAlign="right"
                    />

                    <Text style={[styles.label, { marginTop: 16 }]}>الوقت</Text>
                    {availability.time_slots?.length > 0 ? (
                        <View style={styles.slotsGrid}>
                            {availability.time_slots.map((slot: string, idx: number) => {
                                const booked = isSlotBooked(slot);
                                const selected = time === slot;
                                return (
                                    <TouchableOpacity
                                        key={idx}
                                        style={[styles.slotBtn, selected && styles.slotBtnActive, booked && styles.slotBtnBooked]}
                                        onPress={() => !booked && setTime(slot)}
                                        disabled={booked}
                                    >
                                        <Text style={[styles.slotText, selected && { color: '#FFF' }, booked && { color: '#FFF' }]}>{slot}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : (
                        <TextInput
                            style={styles.input}
                            placeholder="09:00 AM"
                            value={time}
                            onChangeText={setTime}
                            textAlign="right"
                        />
                    )}
                </View>

                {/* Notes */}
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
    label: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right', marginBottom: 10 },
    searchInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14, marginBottom: 10 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14 },
    patientItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    patientIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center' },
    patientName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    patientPhone: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    selectedBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12 },
    selectedName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    slotsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
    slotBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    slotBtnActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    slotBtnBooked: { backgroundColor: '#374151', borderColor: '#374151', opacity: 0.6 },
    slotText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#374151' },
    createBtn: { height: 56, borderRadius: 28, overflow: 'hidden', marginTop: 8 },
    createBtnGrad: { flex: 1, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 10 },
    createBtnText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
