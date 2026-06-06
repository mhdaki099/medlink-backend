import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Platform, Alert, TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { TAB_BAR_CLEARANCE } from '../../src/constants/layout';
import { useSecretaryPermissions } from '../../src/hooks/useSecretaryPermissions';

export default function SecretaryProfile() {
    const { user, logout } = useAuth();
    const { can } = useSecretaryPermissions();
    const doctorId = user?.supervisor_id;

    const [supervisor, setSupervisor] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingClinic, setEditingClinic] = useState(false);

    const [clinicForm, setClinicForm] = useState({
        clinic_name: '',
        clinic_address: '',
        phone: '',
        available_hours: '',
        working_hours: { morning: '', evening: '', slots: [] as string[] },
        consultation_duration: 30,
        buffer_minutes: 10,
    });

    const loadSupervisor = async () => {
        if (!doctorId) {
            setLoading(false);
            return;
        }
        try {
            const doc = await api.getDoctor(doctorId);
            setSupervisor(doc);
            setClinicForm({
                clinic_name: doc.clinic_name || '',
                clinic_address: doc.clinic_address || '',
                phone: doc.phone || '',
                available_hours: doc.available_hours || '',
                working_hours: {
                    morning: doc.working_hours?.morning || '',
                    evening: doc.working_hours?.evening || '',
                    slots: doc.working_hours?.slots || [],
                },
                consultation_duration: doc.consultation_duration || 30,
                buffer_minutes: doc.buffer_minutes || 10,
            });
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSupervisor();
    }, [doctorId]);

    const handleSaveClinic = async () => {
        if (!doctorId) return;
        setSaving(true);
        try {
            await api.updateDoctorProfile(doctorId, {
                clinic_name: clinicForm.clinic_name,
                clinic_address: clinicForm.clinic_address,
                phone: clinicForm.phone,
                available_hours: clinicForm.available_hours,
                working_hours: clinicForm.working_hours,
                consultation_duration: clinicForm.consultation_duration,
                buffer_minutes: clinicForm.buffer_minutes,
            });
            Alert.alert('✅ تم', 'تم تحديث معلومات العيادة وساعات العمل');
            setEditingClinic(false);
            loadSupervisor();
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل حفظ التعديلات');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('تسجيل الخروج', 'هل تريد الخروج من الحساب؟', [
            { text: 'إلغاء', style: 'cancel' },
            { text: 'خروج', style: 'destructive', onPress: logout },
        ]);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={36} color="#1E88E5" />
                </View>
                <Text style={styles.name}>{user?.name}</Text>
                <Text style={styles.role}>سكرتارية العيادة</Text>
            </LinearGradient>

            <Animated.View entering={FadeInUp.delay(100)} style={styles.card}>
                <Text style={styles.cardTitle}>الطبيب المشرف</Text>
                {loading ? (
                    <ActivityIndicator color="#1E88E5" style={{ marginVertical: 12 }} />
                ) : supervisor ? (
                    <>
                        <View style={styles.row}>
                            <Text style={styles.rowVal}>د. {supervisor.name}</Text>
                            <Ionicons name="medical" size={18} color="#64748B" />
                        </View>
                        {supervisor.specialization ? (
                            <View style={styles.row}>
                                <Text style={styles.rowVal}>{supervisor.specialization}</Text>
                                <Ionicons name="ribbon-outline" size={18} color="#64748B" />
                            </View>
                        ) : null}
                    </>
                ) : (
                    <Text style={styles.muted}>لم يتم ربط حسابك بطبيب بعد</Text>
                )}
            </Animated.View>

            {can('clinic_edit') && supervisor ? (
                <Animated.View entering={FadeInUp.delay(150)} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <TouchableOpacity
                            onPress={() => setEditingClinic(!editingClinic)}
                            style={styles.editToggle}
                        >
                            <Ionicons name={editingClinic ? 'close' : 'create-outline'} size={18} color="#1E88E5" />
                            <Text style={styles.editToggleText}>{editingClinic ? 'إلغاء' : 'تعديل'}</Text>
                        </TouchableOpacity>
                        <View style={styles.cardTitleRow}>
                            <MaterialCommunityIcons name="office-building" size={20} color="#1E88E5" />
                            <Text style={styles.cardTitle}>معلومات العيادة</Text>
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>اسم العيادة</Text>
                        <TextInput
                            style={styles.input}
                            value={clinicForm.clinic_name}
                            onChangeText={(t) => setClinicForm({ ...clinicForm, clinic_name: t })}
                            placeholder="عيادة الشفاء"
                            textAlign="right"
                            editable={editingClinic}
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>عنوان العيادة</Text>
                        <TextInput
                            style={styles.input}
                            value={clinicForm.clinic_address}
                            onChangeText={(t) => setClinicForm({ ...clinicForm, clinic_address: t })}
                            placeholder="المدينة، الحي، المبنى"
                            textAlign="right"
                            editable={editingClinic}
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>هاتف العيادة</Text>
                        <TextInput
                            style={styles.input}
                            value={clinicForm.phone}
                            onChangeText={(t) => setClinicForm({ ...clinicForm, phone: t })}
                            placeholder="+963..."
                            keyboardType="phone-pad"
                            textAlign="right"
                            editable={editingClinic}
                        />
                    </View>

                    <Text style={styles.sectionLabel}>ساعات العمل</Text>
                    <View style={styles.field}>
                        <Text style={styles.label}>الفترة الصباحية</Text>
                        <TextInput
                            style={styles.input}
                            value={clinicForm.working_hours.morning}
                            onChangeText={(t) => setClinicForm({
                                ...clinicForm,
                                working_hours: { ...clinicForm.working_hours, morning: t },
                            })}
                            placeholder="09:00 - 13:00"
                            textAlign="right"
                            editable={editingClinic}
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>الفترة المسائية</Text>
                        <TextInput
                            style={styles.input}
                            value={clinicForm.working_hours.evening}
                            onChangeText={(t) => setClinicForm({
                                ...clinicForm,
                                working_hours: { ...clinicForm.working_hours, evening: t },
                            })}
                            placeholder="17:00 - 21:00"
                            textAlign="right"
                            editable={editingClinic}
                        />
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>المواعيد المتاحة (مفصولة بفاصلة)</Text>
                        <TextInput
                            style={styles.input}
                            value={(clinicForm.working_hours.slots || []).join(', ')}
                            onChangeText={(t) => setClinicForm({
                                ...clinicForm,
                                working_hours: {
                                    ...clinicForm.working_hours,
                                    slots: t.split(',').map(s => s.trim()).filter(Boolean),
                                },
                            })}
                            placeholder="09:00, 09:30, 10:00"
                            textAlign="right"
                            editable={editingClinic}
                        />
                    </View>

                    <View style={styles.rowFields}>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.label}>مدة الجلسة (د)</Text>
                            <TextInput
                                style={styles.input}
                                value={String(clinicForm.consultation_duration)}
                                onChangeText={(t) => setClinicForm({
                                    ...clinicForm,
                                    consultation_duration: parseInt(t, 10) || 30,
                                })}
                                keyboardType="numeric"
                                textAlign="right"
                                editable={editingClinic}
                            />
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Text style={styles.label}>فاصل بين المواعيد (د)</Text>
                            <TextInput
                                style={styles.input}
                                value={String(clinicForm.buffer_minutes)}
                                onChangeText={(t) => setClinicForm({
                                    ...clinicForm,
                                    buffer_minutes: parseInt(t, 10) || 10,
                                })}
                                keyboardType="numeric"
                                textAlign="right"
                                editable={editingClinic}
                            />
                        </View>
                    </View>

                    {editingClinic ? (
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                            onPress={handleSaveClinic}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.saveBtnText}>حفظ معلومات العيادة</Text>
                            )}
                        </TouchableOpacity>
                    ) : null}
                </Animated.View>
            ) : null}

            <Animated.View entering={FadeInUp.delay(250)} style={styles.card}>
                <Text style={styles.cardTitle}>معلومات الحساب</Text>
                <View style={styles.row}>
                    <Text style={styles.rowVal}>{user?.email}</Text>
                    <Ionicons name="mail-outline" size={18} color="#64748B" />
                </View>
                {user?.phone ? (
                    <View style={styles.row}>
                        <Text style={styles.rowVal}>{user.phone}</Text>
                        <Ionicons name="call-outline" size={18} color="#64748B" />
                    </View>
                ) : null}
            </Animated.View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>تسجيل الخروج</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 32,
        alignItems: 'center',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 24,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    name: { fontSize: 22, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    role: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.9)', marginTop: 4 },
    card: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
    },
    cardHeaderRow: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    cardTitle: {
        fontSize: 15,
        fontFamily: 'Cairo_700Bold',
        color: '#1E293B',
    },
    sectionLabel: {
        fontSize: 13,
        fontFamily: 'Cairo_700Bold',
        color: '#1E88E5',
        textAlign: 'right',
        marginTop: 8,
        marginBottom: 10,
    },
    editToggle: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#E0F2FE',
    },
    editToggleText: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    field: { marginBottom: 12 },
    rowFields: { flexDirection: 'row-reverse', gap: 10 },
    label: {
        fontSize: 12,
        fontFamily: 'Cairo_600SemiBold',
        color: '#94A3B8',
        textAlign: 'right',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        height: 46,
        paddingHorizontal: 14,
        fontFamily: 'Cairo_400Regular',
        fontSize: 14,
        color: '#1E293B',
    },
    row: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    rowVal: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#475569', flex: 1, textAlign: 'right', marginRight: 10 },
    muted: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#94A3B8', textAlign: 'right' },
    saveBtn: {
        marginTop: 8,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#1E88E5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    logoutBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: 24,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    logoutText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#EF4444' },
});
