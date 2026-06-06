import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SYRIA_GOVERNORATES } from '../data/syriaLocations';
import { COUNTRIES } from '../constants/countries';
import { ADMIN_THEME } from '../constants/adminTheme';
import { withOtherOption, isOtherSelection } from '../constants/locationPicker';

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
    rating: string;
    is_featured: boolean;
};

const KNOWN_COUNTRIES = COUNTRIES.filter(c => c !== 'أخرى');

export const emptyAdminUserForm = (): AdminUserFormData => ({
    name: '', email: '', password: '', phone: '', role: 'patient',
    country: 'سوريا', province: '', district: '', area: '', city: '', address: '',
    gender: '', dob: '', specialization: '', clinic_name: '', clinic_address: '',
    price_per_session: '', experience_years: '', available_hours: '', open_hours: '',
    license_no: '', association_no: '', supervisor_id: '', verified: true,
    rating: '', is_featured: false,
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
    rating: user?.rating != null ? String(user.rating) : '',
    is_featured: !!user?.is_featured,
});

const ROLES: Record<string, string> = {
    patient: 'مريض', doctor: 'طبيب', pharmacy: 'صيدلية', lab: 'مختبر',
    radiology: 'أشعة', warehouse: 'مستودع', secretary: 'سكرتاريا',
};

type LocationField = 'country' | 'province' | 'district' | 'area';
type PickerType = LocationField | 'role' | 'gender' | 'doctor';

type Props = {
    form: AdminUserFormData;
    onChange: (form: AdminUserFormData) => void;
    mode: 'create' | 'edit';
    doctors?: { id: string; name: string }[];
};

function isKnownCountry(v: string) {
    return !v || KNOWN_COUNTRIES.includes(v as typeof KNOWN_COUNTRIES[number]);
}
function isKnownProvince(v: string) {
    return !v || SYRIA_GOVERNORATES.some(g => g.name === v);
}

export default function AdminUserForm({ form, onChange, mode, doctors = [] }: Props) {
    const [picker, setPicker] = useState<PickerType | null>(null);
    const [customFields, setCustomFields] = useState<Partial<Record<LocationField, boolean>>>({});

    const set = (patch: Partial<AdminUserFormData>) => onChange({ ...form, ...patch });

    useEffect(() => {
        const next: Partial<Record<LocationField, boolean>> = {};
        if (form.country && !isKnownCountry(form.country)) next.country = true;
        if (form.province && !isKnownProvince(form.province)) next.province = true;
        if (form.district && form.province && !isKnownProvince(form.province)) next.district = true;
        else if (form.district && form.province) {
            const gov = SYRIA_GOVERNORATES.find(g => g.name === form.province);
            if (gov && !gov.districts.some(d => d.name === form.district)) next.district = true;
        }
        if (form.area && form.province && form.district) {
            const gov = SYRIA_GOVERNORATES.find(g => g.name === form.province);
            const dist = gov?.districts.find(d => d.name === form.district);
            if (dist && form.area && !dist.subDistricts.some(s => s.name === form.area)) next.area = true;
        }
        setCustomFields(next);
    }, []);

    const selectedGov = SYRIA_GOVERNORATES.find(g => g.name === form.province);
    const districts = selectedGov?.districts || [];
    const selectedDistrict = districts.find(d => d.name === form.district);
    const subDistricts = selectedDistrict?.subDistricts || [];

    const showSyriaHierarchy = form.country === 'سوريا' && !customFields.country;
    const provinceCustom = !!customFields.province;
    const districtCustom = !!customFields.district || provinceCustom;
    const areaCustom = !!customFields.area || districtCustom;

    const openCustom = (field: LocationField) => {
        setCustomFields(prev => {
            const next = { ...prev, [field]: true };
            if (field === 'country') return { country: true };
            if (field === 'province') return { ...next, district: false, area: false };
            if (field === 'district') return { ...next, area: false };
            return next;
        });
        const patch: Partial<AdminUserFormData> = { [field]: '' };
        if (field === 'country') Object.assign(patch, { province: '', district: '', area: '' });
        if (field === 'province') Object.assign(patch, { district: '', area: '' });
        if (field === 'district') Object.assign(patch, { area: '' });
        set(patch);
        setPicker(null);
    };

    const renderLocationField = (
        field: LocationField,
        label: string,
        placeholder: string,
        canPick: boolean,
        isCustom: boolean,
        onOpenPicker: () => void,
    ) => (
        <View key={field}>
            <Text style={styles.label}>{label}</Text>
            {isCustom ? (
                <View style={styles.customRow}>
                    <TouchableOpacity
                        style={styles.backToListBtn}
                        onPress={() => {
                            setCustomFields(prev => ({ ...prev, [field]: false }));
                            set({ [field]: '' });
                        }}
                    >
                        <MaterialCommunityIcons name="format-list-bulleted" size={18} color={ADMIN_THEME.accent} />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, styles.customInput]}
                        value={form[field]}
                        onChangeText={t => set({ [field]: t })}
                        placeholder={placeholder}
                        textAlign="right"
                    />
                </View>
            ) : canPick ? (
                <TouchableOpacity style={styles.selectBtn} onPress={onOpenPicker}>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                    <Text style={styles.selectText}>{form[field] || placeholder}</Text>
                </TouchableOpacity>
            ) : (
                <TextInput
                    style={styles.input}
                    value={form[field]}
                    onChangeText={t => set({ [field]: t })}
                    placeholder={placeholder}
                    textAlign="right"
                />
            )}
        </View>
    );

    const renderPickerModal = (
        title: string,
        items: { label: string; value: string }[],
        onSelect: (value: string) => void,
        onOther?: () => void,
    ) => (
        <Modal visible={picker !== null} transparent animationType="slide">
            <View style={styles.pickerOverlay}>
                <View style={styles.pickerSheet}>
                    <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setPicker(null)}>
                            <MaterialCommunityIcons name="close" size={24} color={ADMIN_THEME.text} />
                        </TouchableOpacity>
                        <Text style={styles.pickerTitle}>{title}</Text>
                    </View>
                    <ScrollView>
                        {items.map(item => (
                            <TouchableOpacity
                                key={item.value + item.label}
                                style={styles.pickerItem}
                                onPress={() => {
                                    if (isOtherSelection(item.value) && onOther) {
                                        onOther();
                                    } else {
                                        onSelect(item.value);
                                        setPicker(null);
                                    }
                                }}
                            >
                                <Text style={[
                                    styles.pickerItemText,
                                    isOtherSelection(item.value) && styles.pickerOtherText,
                                ]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const isDoctor = form.role === 'doctor';
    const isProvider = ['pharmacy', 'lab', 'radiology', 'warehouse'].includes(form.role);
    const isSecretary = form.role === 'secretary';
    const isPatient = form.role === 'patient';

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
            <TouchableOpacity style={styles.selectBtn} onPress={() => setPicker('role')} disabled={mode === 'edit'}>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                <Text style={styles.selectText}>{ROLES[form.role] || form.role}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput style={styles.input} value={form.phone} onChangeText={t => set({ phone: t })} keyboardType="phone-pad" textAlign="right" />

            <Text style={styles.sectionTitle}>الموقع</Text>
            {renderLocationField('country', 'الدولة *', 'اختر الدولة', true, !!customFields.country, () => setPicker('country'))}

            {showSyriaHierarchy ? (
                <>
                    {renderLocationField(
                        'province', 'المحافظة', 'اختر المحافظة',
                        true, provinceCustom, () => setPicker('province'),
                    )}
                    {renderLocationField(
                        'district', 'المنطقة', 'اختر المنطقة',
                        !!form.province && !provinceCustom, districtCustom, () => setPicker('district'),
                    )}
                    {renderLocationField(
                        'area', 'الناحية / الحي', 'اختر الناحية',
                        !!form.district && !districtCustom, areaCustom, () => setPicker('area'),
                    )}
                </>
            ) : (
                <>
                    {renderLocationField('province', 'المحافظة / الولاية', 'أدخل المحافظة', false, false, () => {})}
                    {renderLocationField('district', 'المنطقة', 'أدخل المنطقة', false, false, () => {})}
                    {renderLocationField('area', 'الحي / الناحية', 'أدخل الحي', false, false, () => {})}
                </>
            )}

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
                    <TouchableOpacity style={styles.selectBtn} onPress={() => setPicker('gender')}>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                        <Text style={styles.selectText}>{form.gender === 'male' ? 'ذكر' : form.gender === 'female' ? 'أنثى' : 'اختر'}</Text>
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
                    <View style={styles.row}>
                        <View style={styles.half}>
                            <Text style={styles.label}>التقييم (0–5)</Text>
                            <TextInput style={styles.input} value={form.rating} onChangeText={t => set({ rating: t })} keyboardType="decimal-pad" placeholder="4.8" textAlign="right" />
                        </View>
                        <View style={[styles.half, styles.featuredToggle]}>
                            <Text style={styles.label}>طبيب مميز</Text>
                            <TouchableOpacity
                                style={[styles.featuredBtn, form.is_featured && styles.featuredBtnOn]}
                                onPress={() => set({ is_featured: !form.is_featured })}
                            >
                                <MaterialCommunityIcons name={form.is_featured ? 'star' : 'star-outline'} size={20} color={form.is_featured ? '#F59E0B' : ADMIN_THEME.textMuted} />
                                <Text style={[styles.featuredBtnText, form.is_featured && styles.featuredBtnTextOn]}>
                                    {form.is_featured ? 'مميز' : 'غير مميز'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
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
                    <TouchableOpacity style={styles.selectBtn} onPress={() => setPicker('doctor')}>
                        <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
                        <Text style={styles.selectText}>
                            {doctors.find(d => d.id === form.supervisor_id)?.name || 'اختر الطبيب'}
                        </Text>
                    </TouchableOpacity>
                </>
            ) : null}

            {picker === 'country' && renderPickerModal(
                'اختر الدولة',
                withOtherOption(KNOWN_COUNTRIES.map(c => ({ label: c, value: c }))),
                v => set({ country: v, province: '', district: '', area: '' }),
                () => openCustom('country'),
            )}
            {picker === 'province' && renderPickerModal(
                'اختر المحافظة',
                withOtherOption(SYRIA_GOVERNORATES.map(g => ({ label: g.name, value: g.name }))),
                v => set({ province: v, district: '', area: '' }),
                () => openCustom('province'),
            )}
            {picker === 'district' && renderPickerModal(
                'اختر المنطقة',
                withOtherOption(districts.map(d => ({ label: d.name, value: d.name }))),
                v => set({ district: v, area: '' }),
                () => openCustom('district'),
            )}
            {picker === 'area' && renderPickerModal(
                'اختر الناحية',
                withOtherOption(subDistricts.map(s => ({ label: s.name, value: s.name }))),
                v => set({ area: v }),
                () => openCustom('area'),
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
    if (form.rating) payload.rating = Math.min(5, Math.max(0, parseFloat(form.rating) || 0));
    if (form.role === 'doctor' || form.role === 'pharmacy') payload.is_featured = form.is_featured;
    if (form.password) payload.password = form.password;
    if (mode === 'create' && !form.password) payload.password = '123456';
    return payload;
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 13, fontFamily: 'Cairo_700Bold', color: ADMIN_THEME.accent,
        textAlign: 'right', marginTop: 16, marginBottom: 10,
        paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: ADMIN_THEME.borderLight,
    },
    label: { textAlign: 'right', fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: ADMIN_THEME.textSecondary, marginBottom: 6 },
    input: {
        backgroundColor: ADMIN_THEME.surface, borderRadius: 12, paddingHorizontal: 14, minHeight: 46,
        fontSize: 14, fontFamily: 'Cairo_400Regular', marginBottom: 12,
        borderWidth: 1, borderColor: ADMIN_THEME.border, color: ADMIN_THEME.text,
    },
    customRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 12 },
    customInput: { flex: 1, marginBottom: 0 },
    backToListBtn: {
        width: 46, height: 46, borderRadius: 12, backgroundColor: ADMIN_THEME.infoBg,
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: ADMIN_THEME.border,
    },
    selectBtn: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: ADMIN_THEME.surface, borderRadius: 12, paddingHorizontal: 14, height: 46,
        marginBottom: 12, borderWidth: 1, borderColor: ADMIN_THEME.border,
    },
    selectText: { fontFamily: 'Cairo_600SemiBold', fontSize: 14, color: ADMIN_THEME.text },
    row: { flexDirection: 'row-reverse', gap: 10 },
    half: { flex: 1 },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: ADMIN_THEME.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', padding: 16 },
    pickerHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    pickerTitle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: ADMIN_THEME.text },
    pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: ADMIN_THEME.borderLight },
    pickerItemText: { fontFamily: 'Cairo_600SemiBold', fontSize: 15, color: ADMIN_THEME.textSecondary, textAlign: 'right' },
    pickerOtherText: { color: ADMIN_THEME.accent, fontFamily: 'Cairo_700Bold' },
    featuredToggle: { justifyContent: 'flex-end' },
    featuredBtn: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
        backgroundColor: ADMIN_THEME.surface, borderRadius: 12, paddingHorizontal: 14, height: 46,
        borderWidth: 1, borderColor: ADMIN_THEME.border, marginBottom: 12,
    },
    featuredBtnOn: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
    featuredBtnText: { fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: ADMIN_THEME.textMuted },
    featuredBtnTextOn: { color: '#B45309' },
});
