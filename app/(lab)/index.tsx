import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput, Platform } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LabDashboard() {
    const { user, logout } = useAuth();
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [resultValues, setResultValues] = useState<any[]>([{ parameter: '', value: '', unit: '', reference: '', status: 'normal' }]);
    const [resultNotes, setResultNotes] = useState('');

    const load = async () => {
        if (!user?.id) return;
        try { const bks = await api.getLabBookings(user.id); setBookings(bks); }
        catch (e) { console.warn(e); } finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { load(); }, [user]);

    const openResult = (booking: any) => {
        setSelectedBooking(booking);
        setResultValues([{ parameter: '', value: '', unit: '', reference: '', status: 'normal' }]);
        setResultNotes('');
        setShowResultModal(true);
    };

    const addValueRow = () => setResultValues(v => [...v, { parameter: '', value: '', unit: '', reference: '', status: 'normal' }]);
    const updateValueRow = (i: number, field: string, val: string) => {
        setResultValues(v => v.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
    };

    const uploadResult = async () => {
        if (!selectedBooking || !user) return;
        try {
            await api.uploadLabResult(user.id, {
                booking_id: selectedBooking.id,
                patient_id: selectedBooking.patient_id,
                test_id: selectedBooking.test_id,
                date: new Date().toISOString().split('T')[0],
                values: resultValues.filter(v => v.parameter),
                notes: resultNotes,
            });
            await api.updateBookingStatus(selectedBooking.id, 'completed');
            setShowResultModal(false);
            load();
            Alert.alert('✅ تم', 'تم رفع النتيجة وإرسالها للمريض');
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const STATUS_COLORS: Record<string, string> = { booked: Colors.primary, processing: Colors.warning, completed: Colors.confirmed };
    const STATUS_LABELS: Record<string, string> = { booked: 'محجوز', processing: 'جاري الفحص', completed: 'مكتمل' };
    const pending = bookings.filter((b: any) => b.status === 'booked').length;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#7C3AED', '#2563EB']} style={styles.header} start={{x:0,y:0}} end={{x:1,y:1}}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <MaterialCommunityIcons name="logout" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{flex:1, alignItems:'flex-end'}}>
                        <Text style={styles.headerTitle}>{user?.name || 'المختبر'}</Text>
                        <Text style={styles.statsBar}>📅 {bookings.length} حجز إجمالي | ⏳ {pending} بانتظار</Text>
                    </View>
                    <View style={styles.headerIcon}>
                        <MaterialCommunityIcons name="flask" size={28} color="#FFF" />
                    </View>
                </View>
            </LinearGradient>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
                {loading ? <ActivityIndicator color={Colors.lab} style={{ marginTop: 40 }} size="large" /> :
                    bookings.length === 0 ? (
                        <View style={styles.empty}><Text style={styles.emptyIcon}>🧪</Text><Text style={styles.emptyText}>لا توجد حجوزات</Text></View>
                    ) : bookings.map((bk: any) => (
                        <View key={bk.id} style={styles.bkCard}>
                            <View style={styles.bkTop}>
                                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[bk.status] || Colors.primary) + '18' }]}>
                                    <Text style={[styles.statusText, { color: STATUS_COLORS[bk.status] || Colors.primary }]}>{STATUS_LABELS[bk.status] || bk.status}</Text>
                                </View>
                                <Text style={styles.patientName}>{bk.patient?.name || 'مريض'}</Text>
                            </View>
                            <Text style={styles.testName}>🧪 {bk.test?.name || 'فحص'}</Text>
                            <Text style={styles.bkDate}>📅 {bk.date} — ⏰ {bk.time}</Text>
                            {bk.test?.preparation && <Text style={styles.prep}>📋 {bk.test.preparation}</Text>}
                            {bk.status === 'booked' && (
                                <View style={styles.bkActions}>
                                    <TouchableOpacity style={styles.processBtn} onPress={() => api.updateBookingStatus(bk.id, 'processing').then(load)}>
                                        <Text style={styles.processBtnText}>بدء الفحص 🔬</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.resultBtn} onPress={() => openResult(bk)}>
                                        <Text style={styles.resultBtnText}>رفع النتيجة 📤</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {bk.status === 'processing' && (
                                <TouchableOpacity style={styles.resultBtnFull} onPress={() => openResult(bk)}>
                                    <Text style={styles.resultBtnText}>رفع النتيجة 📤</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Result Upload Modal */}
            <Modal visible={showResultModal} transparent animationType="slide">
                <View style={styles.overlay}>
                    <ScrollView style={styles.modal}>
                        <Text style={styles.modalTitle}>رفع نتائج</Text>
                        <Text style={styles.modalSub}>{selectedBooking?.test?.name}</Text>
                        <Text style={styles.modalSub}>المريض: {selectedBooking?.patient?.name}</Text>
                        {resultValues.map((row, i) => (
                            <View key={i} style={styles.valueInputRow}>
                                <TextInput style={[styles.input, { flex: 2 }]} placeholder="المعلمة" value={row.parameter}
                                    onChangeText={v => updateValueRow(i, 'parameter', v)} textAlign="right" placeholderTextColor={Colors.textMuted} />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="القيمة" value={row.value}
                                    onChangeText={v => updateValueRow(i, 'value', v)} textAlign="right" placeholderTextColor={Colors.textMuted} />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="الوحدة" value={row.unit}
                                    onChangeText={v => updateValueRow(i, 'unit', v)} textAlign="right" placeholderTextColor={Colors.textMuted} />
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addRowBtn} onPress={addValueRow}>
                            <Text style={styles.addRowBtnText}>+ إضافة معلمة</Text>
                        </TouchableOpacity>
                        <Text style={styles.fieldLabel}>ملاحظات</Text>
                        <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="ملاحظات الطبيب..."
                            value={resultNotes} onChangeText={setResultNotes} multiline textAlign="right" placeholderTextColor={Colors.textMuted} />
                        <View style={styles.modalBtns}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowResultModal(false)}><Text style={styles.cancelBtnText}>إلغاء</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={uploadResult}><Text style={styles.saveBtnText}>رفع النتيجة</Text></TouchableOpacity>
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 20, paddingHorizontal: 20 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    logoutBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
    logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    headerTitle: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    statsBar: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 2 },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    empty: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyIcon: { fontSize: 48, marginBottom: 4 },
    emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: '#9CA3AF' },
    bkCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
    bkTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    patientName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#111827' },
    statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    statusText: { fontSize: 12, fontFamily: 'Cairo_700Bold' },
    testName: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#7C3AED', textAlign: 'right', marginBottom: 4 },
    bkDate: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'right', marginBottom: 4 },
    prep: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#D97706', textAlign: 'right', marginBottom: 8 },
    bkActions: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
    processBtn: { flex: 1, backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, alignItems: 'center' },
    processBtnText: { color: '#D97706', fontFamily: 'Cairo_700Bold', fontSize: 13 },
    resultBtn: { flex: 1, backgroundColor: '#7C3AED', borderRadius: 14, padding: 12, alignItems: 'center' },
    resultBtnFull: { backgroundColor: '#7C3AED', borderRadius: 14, padding: 12, alignItems: 'center', marginTop: 8 },
    resultBtnText: { color: '#fff', fontFamily: 'Cairo_700Bold', fontSize: 13 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827', textAlign: 'center', marginBottom: 6 },
    modalSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'center', marginBottom: 4 },
    valueInputRow: { flexDirection: 'row-reverse', gap: 6, marginBottom: 6, marginTop: 8 },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#111827' },
    addRowBtn: { backgroundColor: '#7C3AED15', borderRadius: 14, padding: 10, alignItems: 'center', marginTop: 6 },
    addRowBtnText: { color: '#7C3AED', fontFamily: 'Cairo_700Bold', fontSize: 13 },
    fieldLabel: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#111827', textAlign: 'right', marginBottom: 5, marginTop: 12 },
    modalBtns: { flexDirection: 'row-reverse', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB' },
    cancelBtnText: { color: '#6B7280', fontFamily: 'Cairo_600SemiBold' },
    saveBtn: { flex: 1, backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontFamily: 'Cairo_700Bold' },
});
