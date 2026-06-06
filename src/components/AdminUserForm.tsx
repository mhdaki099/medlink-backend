import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SYRIA_GOVERNORATES } from '../data/syriaLocations';
import { COUNTRIES } from '../constants/countries';
import { ADMIN_THEME } from '../constants/adminTheme';

export type AdminUserFormData = {
    name: string;
    email: string;
    password: string;
    phone: string;
    role: string;
    country: string;
    province: string;
    district: string;
    area: string;
    city: string;
    address: string;
    gender: string;
    dob: string;
    specialization: string;
    clinic_name: string;
    clinic_address: string;
    price_per_session: string;
    experience_years: string;
    available_hours: string;
    open_hours: string;
    license_no: string;
    association_no: string;
    supervisor_id: string;
    verified: boolean;
};

export const emptyAdminUserForm = (): AdminUserFormData => ({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'patient',
    country: 'سوريا',
    province: '',
    district: '',
    area: '',
    city: '',
    address: '',
    gender: '',
    dob: '',
    specialization: '',
    clinic_name: '',
    clinic_address: '',
    price_per_session: '',
    experience_years: '',
    available_hours: '',
    open_hours: '',
    license_no: '',
    association_no: '',
    supervisor_id: '',
    verified: true,
});

export const adminUserFormFromUser = (user: any): AdminUserFormData => ({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',
    role: user?.role || 'patient',
    country: user?.country || 'سوريا',
    province: user?.province || '',
    district: user?.district || '',
    area: user?.area || '',
    city: user?.city || '',
    address: user?.address || '',
    gender: user?.gender || '',
    dob: user?.dob || '',
    specialization: user?.specialization || '',
    clinic_name: user?.clinic_name || '',
    clinic_address: user?.clinic_address || '',
    price_per_session: user?.price_per_session != null ? String(user.price_per_session) : '',
    experience_years: user?.experience_years != null ? String(user.experience_years) : '',
    available_hours: user?.available_hours || '',
    open_hours: user?.open_hours || '',
    license_no: user?.license_no || '',
    association_no: user?.association_no || '',
    supervisor_id: user?.supervisor_id || '',
    verified: user?.verified !== false,
});

const ROLES: Record<string, string> = {
    patient: 'مريض',
    doctor: 'طبيب',
    pharmacy: 'صيدلية',
    lab: 'مختبر',
    radiology: 'أشعة',
    warehouse: 'مستودع',
    secretary: 'سكرتاريا',
    admin: 'مدير',
};

type Props = {
    form: AdminUserFormData;
    onChange: (form: AdminUserFormData) => void;
    mode: 'create' | 'edit';
    doctors?: { id: string; name: string }[];
};

export default function AdminUserForm({ form, onChange, mode, doctors = [] }: Props) {
    const [picker, setPicker] = useState<'country' | 'province' | 'district' | 'area' | 'role' | 'gender' | 'doctor' | null>(null);

    const set = (patch: Partial<AdminUserFormData>) => onChange({ ...form, ...patch });

    const selectedGov = SYRIA_GOVERNORATES.find(g => g.name === form.province);
    const districts = selectedGov?.districts || [];
    const selectedDistrict = districts.find(d => d.name === form.district);
    const subDistricts = selectedDistrict?.subDistricts || [];

    const isSyria = form.country === 'سوريا';
    const isDoctor = form.role === 'doctor';
    const isProvider = ['pharmacy', 'lab', 'radiology', 'warehouse'].includes(form.role);
    const isSecretary = form.role === 'secretary';
    const isPatient = form.role === 'patient';

    const openPicker = (type: typeof picker) => setPicker(type);

    const renderPickerModal = (
        title: string,
        items: { label: string; value: string }[],
        onSelect: (value: string) => void,
    ) => (
        <Modal visible={picker !== null} transparent animationType="slide">
            <View style={styles.pickerOverlay}>
                <View style={styles.pickerSheet}>
                    <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setPicker(null)}>
                            <MaterialCommunityIcons name="close" size={24} color="#1F2937" />
                        </TouchableOpacity>
                        <Text style={styles.pickerTitle}>{title}</Text>
                    </View>
                    <ScrollView>
                        {items.map(item => (
                            <TouchableOpacity
                                key={item.value + item.label}
                                style={styles.pickerItem}
                                onPress={() => { onSelect(item.value); setPicker(null); }}
                            >
                                <Text style={styles.pickerItemText}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    return (
        <View>
            <Text style={styles.sectionTitle}>البيانات الأساسية</Text>
            <Text style={styles.label}>الاسم الكامل *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={t => set({ name: t })} textAlign="right" />

            <Text style={styles.label}>البريد الإلكتروني *</Text>
            <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={t => set({ email: t })}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
            />

            <Text style={styles.label}>
                {mode === 'create' ? 'كلمة المرور (افتراضي 123456)' : 'كلمة المرور (اتركها فارغة للإبقاء)'}
            </Text>
            <TextInput style={styles.input} value={form.password} onChangeText={t => set({ password: t })} secureTextEntry textAlign="right" />

            <Text style={styles.label}>الدور *</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => openPicker('role')} disabled={mode === 'edit'}>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                <Text style={styles.selectText}>{ROLES[form.role] || form.role}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput style={styles.input} value={form.phone} onChangeText={t => set({ phone: t })} keyboardType="phone-pad" textAlign="right" />

            <Text style={styles.sectionTitle}>الموقع</Text>
            <Text style={styles.label}>الدولة *</Text>
            <TouchableOpacity style={styles.selectBtn} onPress={() => openPicker('country')}>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                <Text style={styles.selectText}>{form.country || 'اختر الدولة'}</Text>
            </TouchableOpacity>

            {isSyria ? (
                <>
                    <Text style={styles.label}>المحافظة</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={() => openPicker('province')}>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                        <Text style={styles.selectText}>{form.province || 'اختر المحافظة'}</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>المنطقة</Text>
                    <TouchableOpacity
                        style={[styles.selectBtn, !form.province && styles.selectDisabled]}
                        onPress={() => form.province && openPicker('district')}
                        disabled={!form.province}
                    >
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                        <Text style={styles.selectText}>{form.district || 'اختر المنطقة'}</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>الناحية / الحي</Text>
                    <TouchableOpacity
                        style={[styles.selectBtn, !form.district && styles.selectDisabled]}
                        onPress={() => form.district && openPicker('area')}
                        disabled={!form.district}
                    >
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                        <Text style={styles.selectText}>{form.area || 'اختر الناحية'}</Text>
                    </TouchableOpacity>
                </>
            ) : null}

            <Text style={styles.label}>المدينة</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={t => set({ city: t })} textAlign="right" placeholder="دمشق" />

            <Text style={styles.label}>العنوان التفصيلي</Text>
            <TextInput
                style={[styles.input, { height: 70 }]}
                value={form.address}
                onChangeText={t => set({ address: t })}
                textAlign="right"
                multiline
                placeholder="الشارع، المبنى، الطابق..."
            />

            {isPatient ? (
                <>
                    <Text style={styles.sectionTitle}>بيانات المريض</Text>
                    <Text style={styles.label}>الجنس</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={() => openPicker('gender')}>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                        <Text style={styles.selectText}>{form.gender || 'اختر'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.label}>تاريخ الميلاد</Text>
                    <TextInput style={styles.input} value={form.dob} onChangeText={t => set({ dob: t })} placeholder="YYYY-MM-DD" textAlign="right" />
                </>
            ) : null}

            {isDoctor ? (
                <>
                    <Text style={styles.sectionTitle}>بيانات الطبيب</Text>
                    <Text style={styles.label}>التخصص</Text>
                    <TextInput style={styles.input} value={form.specialization} onChangeText={t => set({ specialization: t })} textAlign="right" />
                    <Text style={styles.label}>اسم العيادة</Text>
                    <TextInput style={styles.input} value={form.clinic_name} onChangeText={t => set({ clinic_name: t })} textAlign="right" />
                    <Text style={styles.label}>عنوان العيادة</Text>
                    <TextInput style={styles.input} value={form.clinic_address} onChangeText={t => set({ clinic_address: t })} textAlign="right" />
                    <View style={styles.row}>
                        <View style={styles.half}>
                            <Text style={styles.label}>سعر الجلسة</Text>
                            <TextInput style={styles.input} value={form.price_per_session} onChangeText={t => set({ price_per_session: t })} keyboardType="numeric" textAlign="right" />
                        </View>
                        <View style={styles.half}>
                            <Text style={styles.label}>سنوات الخبرة</Text>
                            <TextInput style={styles.input} value={form.experience_years} onChangeText={t => set({ experience_years: t })} keyboardType="numeric" textAlign="right" />
                        </View>
                    </View>
                    <Text style={styles.label}>ساعات العمل</Text>
                    <TextInput style={styles.input} value={form.available_hours} onChangeText={t => set({ available_hours: t })} placeholder="09:00 - 17:00" textAlign="right" />
                </>
            ) : null}

            {isProvider ? (
                <>
                    <Text style={styles.sectionTitle}>بيانات المنشأة</Text>
                    <Text style={styles.label}>رقم الترخيص</Text>
                    <TextInput style={styles.input} value={form.license_no} onChangeText={t => set({ license_no: t })} textAlign="right" />
                    <Text style={styles.label}>رقم النقابة / الانتساب</Text>
                    <TextInput style={styles.input} value={form.association_no} onChangeText={t => set({ association_no: t })} textAlign="right" />
                    <Text style={styles.label}>ساعات العمل</Text>
                    <TextInput style={styles.input} value={form.open_hours} onChangeText={t => set({ open_hours: t })} placeholder="24/7 أو 08:00 - 22:00" textAlign="right" />
                </>
            ) : null}

            {isSecretary ? (
                <>
                    <Text style={styles.sectionTitle}>السكرتارية</Text>
                    <Text style={styles.label}>الطبيب المشرف *</Text>
                    <TouchableOpacity style={styles.selectBtn} onPress={() => openPicker('doctor')}>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                        <Text style={styles.selectText}>
                            {doctors.find(d => d.id === form.supervisor_id)?.name || 'اختر الطبيب'}
                        </Text>
                    </TouchableOpacity>
                </>
            ) : null}

            {picker === 'country' && renderPickerModal('اختر الدولة', COUNTRIES.map(c => ({ label: c, value: c })), v => {
                set({ country: v, province: '', district: '', area: '' });
            })}
            {picker === 'province' && renderPickerModal(
                'اختر المحافظة',
                SYRIA_GOVERNORATES.map(g => ({ label: g.name, value: g.name })),
                v => set({ province: v, district: '', area: '' }),
            )}
            {picker === 'district' && renderPickerModal(
                'اختر المنطقة',
                districts.map(d => ({ label: d.name, value: d.name })),
                v => set({ district: v, area: '' }),
            )}
            {picker === 'area' && renderPickerModal(
                'اختر الناحية',
                subDistricts.map(s => ({ label: s.name, value: s.name })),
                v => set({ area: v }),
            )}
            {picker === 'role' && renderPickerModal(
                'اختر الدور',
                Object.entries(ROLES).map(([k, v]) => ({ label: v, value: k })),
                v => set({ role: v }),
            )}
            {picker === 'gender' && renderPickerModal(
                'الجنس',
                [{ label: 'ذكر', value: 'male' }, { label: 'أنثى', value: 'female' }],
                v => set({ gender: v }),
            )}
            {picker === 'doctor' && renderPickerModal(
                'الطبيب المشرف',
                doctors.map(d => ({ label: d.name, value: d.id })),
                v => set({ supervisor_id: v }),
            )}
        </View>
    );
}

export function adminFormToPayload(form: AdminUserFormData, mode: 'create' | 'edit') {
    const payload: Record<string, any> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        role: form.role,
        country: form.country,
        province: form.province,
        district: form.district,
        area: form.area,
        city: form.city,
        address: form.address,
        gender: form.gender || undefined,
        dob: form.dob || undefined,
        specialization: form.specialization || undefined,
        clinic_name: form.clinic_name || undefined,
        clinic_address: form.clinic_address || undefined,
        available_hours: form.available_hours || undefined,
        open_hours: form.open_hours || undefined,
        license_no: form.license_no || undefined,
        association_no: form.association_no || undefined,
        supervisor_id: form.supervisor_id || undefined,
        verified: form.verified,
    };
    if (form.price_per_session) payload.price_per_session = parseFloat(form.price_per_session) || 0;
    if (form.experience_years) payload.experience_years = parseInt(form.experience_years, 10) || 0;
    if (form.password) payload.password = form.password;
    if (mode === 'create' && !form.password) payload.password = '123456';
    return payload;
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 13,
        fontFamily: 'Cairo_700Bold',
        color: ADMIN_THEME.accent,
        textAlign: 'right',
        marginTop: 16,
        marginBottom: 10,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: ADMIN_THEME.borderLight,
    },
    label: { textAlign: 'right', fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: ADMIN_THEME.textSecondary, marginBottom: 6 },
    input: {
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        minHeight: 46,
        fontSize: 14,
        fontFamily: 'Cairo_400Regular',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: ADMIN_THEME.border,
        color: ADMIN_THEME.text,
    },
    selectBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 46,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: ADMIN_THEME.border,
    },
    selectDisabled: { opacity: 0.5 },
    selectText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: ADMIN_THEME.text },
    row: { flexDirection: 'row-reverse', gap: 10 },
    half: { flex: 1 },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: ADMIN_THEME.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 16 },
    pickerHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    pickerTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: ADMIN_THEME.text },
    pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: ADMIN_THEME.borderLight },
    pickerItemText: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: ADMIN_THEME.textSecondary, textAlign: 'right' },
});
