import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, TextInput, Alert, Platform, Modal,
    Switch, KeyboardAvoidingView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useAuth } from '../../src/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { api, BASE_URL } from '../../src/services/api';
import { Colors } from '../../src/theme';

export default function DoctorProfile() {
    const { user, logout, login } = useAuth();
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [showSecModal, setShowSecModal] = useState(false);
    const [secretaries, setSecretaries] = useState<any[]>([]);
    const [loadingSecs, setLoadingSecs] = useState(false);

    const getFullUrl = (path?: string) => {
        if (!path) return 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80';
        if (path.startsWith('http')) return path;
        const root = BASE_URL.replace('/api', '');
        return `${root}${path}`;
    };

    // Profile State
    const [profile, setProfile] = useState({
        clinic_name: user?.clinic_name || '',
        clinic_address: user?.clinic_address || '',
        price_per_session: user?.price_per_session || 0,
        experience_years: user?.experience_years || 0,
        phone: user?.phone || '',
        available_hours: user?.available_hours || '',
        working_hours: user?.working_hours || { morning: '', evening: '', off_days: [], slots: [] },
    });

    const [showWorkingHours, setShowWorkingHours] = useState(false);
    const [analytics, setAnalytics] = useState<any>(null);

    const loadSecretaries = async () => {
        if (!user?.id) return;
        setLoadingSecs(true);
        try {
            const data = await api.getSecretaries(user.id);
            setSecretaries(data);
        } catch (e) {
            console.error('[PROFILE] Failed to load secretaries', e);
        } finally {
            setLoadingSecs(false);
        }
    };

    // Secretary State
    const [secData, setSecData] = useState({ name: '', email: '', password: '', phone: '' });

    React.useEffect(() => {
        loadSecretaries();
        if (user?.id) {
            api.getDoctorAnalytics(user.id).then(setAnalytics).catch(() => {});
        }
    }, [user?.id]);


    if (!user) return null;

    const handleSaveProfile = async () => {
        try {
            await api.updateDoctorProfile(user.id, profile);
            Alert.alert('✅ تم', 'تم تحديث معلومات العيادة بنجاح');
            setEditing(false);
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const handleAddSecretary = async () => {
        try {
            if (!secData.name || !secData.email) return Alert.alert('تنبيه', 'يرجى إكمال البيانات');
            await api.addSecretary(user.id, secData);
            Alert.alert('✅ تم', 'تم إنشاء حساب السكرتارية بنجاح');
            setShowSecModal(false);
            setSecData({ name: '', email: '', password: '', phone: '' });
            loadSecretaries();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const renderInfoCard = (title: string, icon: string, children: React.ReactNode) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <MaterialCommunityIcons name={icon as any} size={20} color="#1E88E5" />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardContent}>{children}</View>
        </View>
    );

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Premium Profile Header */}
                <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                            <Ionicons name="log-out-outline" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerMainTitle}>بروفايل العيادة</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <Animated.View entering={ZoomIn} style={styles.avatarWrapper}>
                        <Image
                            source={{ 
                                uri: getFullUrl(user.photo),
                                headers: { 'Bypass-Tunnel-Reminder': 'true' }
                            }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editAvatarBtn}>
                            <Ionicons name="camera" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.nameTxt}>{user.name}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeTxt}>{user.specialization || 'طبيب أخصائي'}</Text>
                    </View>
                </LinearGradient>

                <View style={styles.content}>
                    {/* Clinic Management */}
                    {renderInfoCard('معلومات العيادة', 'office-building', (
                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>اسم العيادة</Text>
                                <TextInput
                                    style={styles.input}
                                    value={profile.clinic_name}
                                    onChangeText={(t) => setProfile({ ...profile, clinic_name: t })}
                                    placeholder="مثلاً: عيادة الشفاء التخصصية"
                                    textAlign="right"
                                    editable={editing}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>عنوان العيادة</Text>
                                <TextInput
                                    style={styles.input}
                                    value={profile.clinic_address}
                                    onChangeText={(t) => setProfile({ ...profile, clinic_address: t })}
                                    placeholder="دمشق، المزة، بناء الأطباء"
                                    textAlign="right"
                                    editable={editing}
                                />
                            </View>
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                                    <Text style={styles.label}>سنوات الخبرة</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={String(profile.experience_years)}
                                        onChangeText={(t) => setProfile({ ...profile, experience_years: parseInt(t) || 0 })}
                                        keyboardType="numeric"
                                        textAlign="right"
                                        editable={editing}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1.5 }]}>
                                    <Text style={styles.label}>سعر الجلسة (ل.س)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={String(profile.price_per_session)}
                                        onChangeText={(t) => setProfile({ ...profile, price_per_session: parseInt(t) || 0 })}
                                        keyboardType="numeric"
                                        textAlign="right"
                                        editable={editing}
                                    />
                                </View>
                            </View>

                            {editing ? (
                                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                                    <Text style={styles.saveBtnTxt}>حفظ التغييرات</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                                    <Text style={styles.editBtnTxt}>تعديل البيانات</Text>
                                    <Ionicons name="create-outline" size={18} color="#0EA5E9" style={{ marginLeft: 8 }} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}

                    {/* Working Hours Card */}
                    {renderInfoCard('ساعات العمل', 'clock-time-four-outline', (
                        <View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>الفترة الصباحية</Text>
                                <TextInput
                                    style={styles.input}
                                    value={profile.working_hours?.morning || ''}
                                    onChangeText={(t) => setProfile({ ...profile, working_hours: { ...profile.working_hours, morning: t } })}
                                    placeholder="09:00 - 13:00"
                                    textAlign="right"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>الفترة المسائية</Text>
                                <TextInput
                                    style={styles.input}
                                    value={profile.working_hours?.evening || ''}
                                    onChangeText={(t) => setProfile({ ...profile, working_hours: { ...profile.working_hours, evening: t } })}
                                    placeholder="17:00 - 21:00"
                                    textAlign="right"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>المواعيد المتاحة (مفصولة بفاصلة)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={(profile.working_hours?.slots || []).join(', ')}
                                    onChangeText={(t) => setProfile({ ...profile, working_hours: { ...profile.working_hours, slots: t.split(',').map((s: string) => s.trim()).filter(Boolean) } })}
                                    placeholder="09:00 AM, 09:30 AM, 10:00 AM"
                                    textAlign="right"
                                />
                            </View>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                                <Text style={styles.saveBtnTxt}>حفظ ساعات العمل</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Secretary Management */}
                    {renderInfoCard('إدارة السكرتارية', 'account-tie', (
                        <View style={styles.secPlaceholder}>
                            {secretaries.length > 0 ? (
                                <View style={{ width: '100%', marginBottom: 15 }}>
                                    {secretaries.map((sec, idx) => (
                                        <View key={sec.id} style={styles.secItem}>
                                            <View style={styles.secIcon}>
                                                <Ionicons name="person" size={16} color="#1E88E5" />
                                            </View>
                                            <View style={styles.secInfo}>
                                                <Text style={styles.secName}>{sec.name}</Text>
                                                <Text style={styles.secEmail}>{sec.email}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={styles.secDesc}>قم بإنشاء حساب خاص لسكرتارية العيادة لإدارة المواعيد والملفات.</Text>
                            )}
                            <TouchableOpacity style={styles.addSecBtn} onPress={() => setShowSecModal(true)}>
                                <Text style={styles.addSecTxt}>إضافة حساب سكرتارية جديد</Text>
                                <Ionicons name="person-add" size={18} color="#FFF" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {/* Stats Summary */}
                    <View style={styles.statsRow}>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniVal}>{analytics?.overall_rating || user.rating || '—'}</Text>
                            <Text style={styles.miniLab}>التقييم</Text>
                        </View>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniVal}>{analytics?.total_reviews || user.total_reviews || 0}</Text>
                            <Text style={styles.miniLab}>مراجعة</Text>
                        </View>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniVal}>{analytics?.favorites_count || 0}</Text>
                            <Text style={styles.miniLab}>مفضلة</Text>
                        </View>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniVal}>{analytics?.monthly_bookings || 0}</Text>
                            <Text style={styles.miniLab}>هذا الشهر</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Secretary Modal */}
            <Modal visible={showSecModal} animationType="slide" transparent={true}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowSecModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>حساب سكرتارية جديد</Text>
                        </View>

                        <ScrollView style={{ padding: 20 }}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>الاسم الكامل</Text>
                                <TextInput style={styles.input} value={secData.name} onChangeText={(t) => setSecData({ ...secData, name: t })} textAlign="right" />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>البريد الإلكتروني</Text>
                                <TextInput style={styles.input} value={secData.email} onChangeText={(t) => setSecData({ ...secData, email: t })} keyboardType="email-address" textAlign="right" />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>كلمة المرور</Text>
                                <TextInput style={styles.input} value={secData.password} onChangeText={(t) => setSecData({ ...secData, password: t })} secureTextEntry textAlign="right" />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>رقم الهاتف</Text>
                                <TextInput style={styles.input} value={secData.phone} onChangeText={(t) => setSecData({ ...secData, phone: t })} keyboardType="phone-pad" textAlign="right" />
                            </View>

                            <TouchableOpacity style={styles.submitSecBtn} onPress={handleAddSecretary}>
                                <Text style={styles.submitSecTxt}>إنشاء الحساب</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerTop: { width: '100%', flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    headerMainTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    logoutBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    avatarWrapper: { position: 'relative', marginBottom: 15 },
    avatar: { width: 100, height: 100, borderRadius: 32, borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
    editAvatarBtn: { position: 'absolute', bottom: -5, right: -5, width: 32, height: 32, borderRadius: 16, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    nameTxt: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    badge: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, marginTop: 8 },
    badgeTxt: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#FFF' },

    content: { paddingHorizontal: 20, marginTop: -30 },
    card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B', marginRight: 10 },
    cardContent: {},

    form: { gap: 15 },
    row: { flexDirection: 'row-reverse' },
    inputGroup: { marginBottom: 5 },
    label: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginBottom: 8, textAlign: 'right' },
    input: { backgroundColor: '#F8FAFC', borderRadius: 15, height: 48, paddingHorizontal: 15, fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#1E293B', borderWidth: 1, borderColor: '#F1F5F9' },
    editBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#1E88E5', borderRadius: 15, height: 44 },
    editBtnTxt: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    saveBtn: { backgroundColor: '#1E88E5', height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveBtnTxt: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },

    secPlaceholder: { alignItems: 'center', paddingVertical: 10 },
    secDesc: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    secItem: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 15, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
    secIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#E0F2FE', justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
    secInfo: { flex: 1, alignItems: 'flex-end' },
    secName: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    secEmail: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    addSecBtn: { flexDirection: 'row', backgroundColor: '#1E88E5', paddingHorizontal: 20, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center', width: '100%' },
    addSecTxt: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },

    statsRow: { flexDirection: 'row', gap: 15 },
    miniStat: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 15, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
    miniVal: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    miniLab: { fontSize: 10, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 2 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    submitSecBtn: { backgroundColor: '#1E88E5', height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 30 },
    submitSecTxt: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' }
});
