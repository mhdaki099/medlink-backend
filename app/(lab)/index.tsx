import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput } from 'react-native';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
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
            <View style={styles.header}>
                <TouchableOpacity onPress={logout} style={styles.logoutBtn}><Text style={styles.logoutText}>خروج 🚪</Text></TouchableOpacity>
                <Text style={styles.headerTitle}>{user?.name || 'المختبر'} 🧪</Text>
                <Text style={styles.statsBar}>📅 {bookings.length} حجز إجمالي | ⏳ {pending} بانتظار</Text>
            </View>

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
    container: { flex: 1, backgroundColor: Colors.background },
    header: { backgroundColor: Colors.lab, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
    logoutBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
    logoutText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'right' },
    statsBar: { fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 4 },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 10 },
    empty: { alignItems: 'center', marginTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 15, color: Colors.textSecondary },
    bkCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: 14, marginBottom: 10, ...Shadow.small },
    bkTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    patientName: { fontSize: 15, fontWeight: '800', color: Colors.text },
    statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    testName: { fontSize: 13, color: Colors.lab, fontWeight: '600', textAlign: 'right', marginBottom: 4 },
    bkDate: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 4 },
    prep: { fontSize: 12, color: Colors.warning, textAlign: 'right', marginBottom: 8 },
    bkActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
    processBtn: { flex: 1, backgroundColor: Colors.warning + '18', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    processBtnText: { color: Colors.warning, fontWeight: '700', fontSize: 12 },
    resultBtn: { flex: 1, backgroundColor: Colors.lab, borderRadius: BorderRadius.full, padding: 10, alignItems: 'center' },
    resultBtnFull: { backgroundColor: Colors.lab, borderRadius: BorderRadius.full, padding: 10, alignItems: 'center', marginTop: 6 },
    resultBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 6 },
    modalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 4 },
    valueInputRow: { flexDirection: 'row', gap: 6, marginBottom: 6, marginTop: 8 },
    input: { backgroundColor: Colors.background, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: Colors.text },
    addRowBtn: { backgroundColor: Colors.lab + '15', borderRadius: BorderRadius.full, padding: 10, alignItems: 'center', marginTop: 6 },
    addRowBtnText: { color: Colors.lab, fontWeight: '700', fontSize: 13 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, textAlign: 'right', marginBottom: 5, marginTop: 12 },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
    cancelBtn: { flex: 1, borderRadius: BorderRadius.full, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
    cancelBtnText: { color: Colors.textSecondary, fontWeight: '600' },
    saveBtn: { flex: 1, backgroundColor: Colors.lab, borderRadius: BorderRadius.full, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '700' },
});
