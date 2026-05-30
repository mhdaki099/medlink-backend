import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Alert, Dimensions, ActivityIndicator, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

const { width } = Dimensions.get('window');

export default function PatientProfile() {
    const { user, logout, updateUser } = useAuth();
    
    // User model has 'name'. We'll split it for the UI.
    const splitName = (user?.name || '').split(' ');
    const [firstName, setFirstName] = useState(splitName[0] || '');
    const [lastName, setLastName] = useState(splitName.slice(1).join(' ') || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [drugAllergies, setDrugAllergies] = useState((user?.drug_allergies || []).join(', '));
    const ec = user?.emergency_contact || {};
    const [emergencyName, setEmergencyName] = useState(ec.name || '');
    const [emergencyRelation, setEmergencyRelation] = useState(ec.relationship || '');
    const [emergencyPhone, setEmergencyPhone] = useState(ec.phone || '');
    
    const [isSaving, setIsSaving] = useState(false);
    const [requests, setRequests] = useState<any[]>([]);
    const [loadingReqs, setLoadingReqs] = useState(false);
    const [familyLinks, setFamilyLinks] = useState<any[]>([]);
    const [showFamilyModal, setShowFamilyModal] = useState(false);
    const [familyForm, setFamilyForm] = useState({ name: '', phone: '', relation: 'child' });

    const loadRequests = async () => {
        if (!user?.id) return;
        setLoadingReqs(true);
        try {
            const data = await api.getPatientHistoryRequests(user.id);
            setRequests(data.filter(r => r.status === 'pending'));
        } catch (e) {
            console.warn(e);
        } finally {
            setLoadingReqs(false);
        }
    };

    const loadFamily = async () => {
        if (!user?.id) return;
        try { setFamilyLinks(await api.getFamilyLinks(user.id)); }
        catch (e) { console.warn(e); }
    };

    useEffect(() => { loadRequests(); loadFamily(); }, [user]);

    const addFamily = async () => {
        if (!user?.id || !familyForm.name) return Alert.alert('تنبيه', 'اسم فرد العائلة مطلوب');
        try {
            await api.addFamilyLink(user.id, familyForm);
            setShowFamilyModal(false);
            setFamilyForm({ name: '', phone: '', relation: 'child' });
            loadFamily();
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const handleRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
        try {
            await api.updateHistoryRequestStatus(requestId, status);
            Alert.alert('✅ تم', `تم ${status === 'approved' ? 'الموافقة على' : 'رفض'} الطلب بنجاح`);
            loadRequests();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        }
    };

    const handleSave = async () => {
        if (!user?.id) return;
        setIsSaving(true);
        try {
            const fullName = `${firstName} ${lastName}`.trim();
            const updated = await api.updatePatient(user.id, {
                name: fullName,
                email: email,
                phone: phone,
                drug_allergies: drugAllergies.split(',').map((x: string) => x.trim()).filter(Boolean),
                emergency_contact: {
                    name: emergencyName,
                    relationship: emergencyRelation,
                    phone: emergencyPhone,
                },
            });
            
            // Update local state in AuthContext
            updateUser(updated);
            
            Alert.alert('نجاح', 'تم تحديث بياناتك بنجاح');
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل تحديث البيانات');
        } finally {
            setIsSaving(true); // Small delay
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'تسجيل الخروج',
            'هل أنت متأكد من تسجيل الخروج؟',
            [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'نعم', onPress: () => logout(), style: 'destructive' }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1E88E5', '#43A047']}
                style={styles.headerBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>البروفايل</Text>
                    <Text style={styles.headerSub}>إدارة معلوماتك الشخصية</Text>
                </View>
                {/* Avatar Overlapping Header & Body */}
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarCircle}>
                        <MaterialCommunityIcons name="account" size={50} color="#1E88E5" />
                    </View>
                    <TouchableOpacity style={styles.editAvatarBtn}>
                        <MaterialCommunityIcons name="camera" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Form */}
                <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>الاسم الأول</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="account-outline" size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.input}
                                value={firstName}
                                onChangeText={setFirstName}
                                placeholder="أحمد"
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>الاسم الأخير</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="account-outline" size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.input}
                                value={lastName}
                                onChangeText={setLastName}
                                placeholder="محمد"
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>البريد الإلكتروني</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="example@mail.com"
                                keyboardType="email-address"
                                textAlign="right"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>رقم الهاتف</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="09xxxxxxxxx"
                                keyboardType="phone-pad"
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>حساسية الأدوية</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#94A3B8" />
                            <TextInput
                                style={styles.input}
                                value={drugAllergies}
                                onChangeText={setDrugAllergies}
                                placeholder="مثال: Penicillin, Ibuprofen"
                                textAlign="right"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>جهة الاتصال للطوارئ</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="phone-alert-outline" size={20} color="#94A3B8" />
                            <TextInput style={styles.input} value={emergencyName} onChangeText={setEmergencyName} placeholder="الاسم" textAlign="right" />
                        </View>
                        <View style={[styles.inputWrapper, { marginTop: 8 }]}>
                            <MaterialCommunityIcons name="account-heart-outline" size={20} color="#94A3B8" />
                            <TextInput style={styles.input} value={emergencyRelation} onChangeText={setEmergencyRelation} placeholder="صلة القرابة" textAlign="right" />
                        </View>
                        <View style={[styles.inputWrapper, { marginTop: 8 }]}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color="#94A3B8" />
                            <TextInput style={styles.input} value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="رقم الهاتف" keyboardType="phone-pad" textAlign="right" />
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.saveBtn} 
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        <LinearGradient
                            colors={['#1E88E5', '#43A047']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.saveBtnGradient}
                        >
                            <Text style={styles.saveBtnText}>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    
                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color="#EF4444" />
                        <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
                    </TouchableOpacity>
                </View>

                {/* Medical History Requests Section */}
                <View style={[styles.formContainer, { marginTop: 20 }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="account-group" size={22} color="#1E88E5" />
                        <Text style={styles.sectionTitle}>ربط أفراد العائلة</Text>
                    </View>
                    {familyLinks.map(link => (
                        <View key={link.id} style={styles.requestCard}>
                            <View style={styles.requestInfo}>
                                <Text style={styles.doctorName}>{link.name}</Text>
                                <Text style={styles.requestDate}>{link.relation} - {link.consent_status}</Text>
                            </View>
                        </View>
                    ))}
                    <TouchableOpacity style={styles.saveBtn} onPress={() => setShowFamilyModal(true)}>
                        <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.saveBtnGradient}>
                            <Text style={styles.saveBtnText}>إضافة فرد عائلة</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={[styles.formContainer, { marginTop: 20 }]}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="shield-account" size={22} color="#1E88E5" />
                        <Text style={styles.sectionTitle}>طلبات الوصول للسجل الطبي</Text>
                    </View>
                    
                    {loadingReqs ? (
                        <ActivityIndicator color="#1E88E5" style={{ marginVertical: 20 }} />
                    ) : requests.length === 0 ? (
                        <Text style={styles.emptyRequests}>لا توجد طلبات معلقة حالياً</Text>
                    ) : (
                        requests.map((req, idx) => (
                            <View key={req.id} style={styles.requestCard}>
                                <View style={styles.requestInfo}>
                                    <Text style={styles.doctorName}>د. {req.doctor_name}</Text>
                                    <Text style={styles.requestDate}>{req.created_at.split('T')[0]}</Text>
                                </View>
                                <View style={styles.requestActions}>
                                    <TouchableOpacity 
                                        style={[styles.miniActionBtn, { backgroundColor: '#FEE2E2' }]}
                                        onPress={() => handleRequestStatus(req.id, 'rejected')}
                                    >
                                        <Text style={[styles.miniActionText, { color: '#EF4444' }]}>رفض</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.miniActionBtn, { backgroundColor: '#DCFCE7' }]}
                                        onPress={() => handleRequestStatus(req.id, 'approved')}
                                    >
                                        <Text style={[styles.miniActionText, { color: '#166534' }]}>موافقة</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                
                <View style={{ height: 120 }} />
            </ScrollView>
            <Modal visible={showFamilyModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.familyModal}>
                        <Text style={styles.sectionTitle}>إضافة فرد عائلة</Text>
                        <TextInput style={styles.familyInput} placeholder="الاسم" value={familyForm.name} onChangeText={v => setFamilyForm(f => ({ ...f, name: v }))} textAlign="right" />
                        <TextInput style={styles.familyInput} placeholder="رقم الهاتف أو الحساب" value={familyForm.phone} onChangeText={v => setFamilyForm(f => ({ ...f, phone: v }))} textAlign="right" />
                        <View style={styles.relationRow}>
                            {[
                                ['child', 'طفل'], ['father', 'أب'], ['mother', 'أم'], ['spouse', 'زوج/زوجة'], ['elderly', 'كبير سن']
                            ].map(([key, label]) => (
                                <TouchableOpacity key={key} style={[styles.relationChip, familyForm.relation === key && styles.relationChipActive]} onPress={() => setFamilyForm(f => ({ ...f, relation: key }))}>
                                    <Text style={[styles.relationText, familyForm.relation === key && { color: '#FFF' }]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.requestActions}>
                            <TouchableOpacity style={[styles.miniActionBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setShowFamilyModal(false)}><Text style={styles.miniActionText}>إلغاء</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.miniActionBtn, { backgroundColor: '#DCFCE7' }]} onPress={addFamily}><Text style={[styles.miniActionText, { color: '#166534' }]}>حفظ</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFBFF',
    },
    headerBg: {
        height: Platform.OS === 'ios' ? 180 : 160,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 8,
        shadowColor: '#1E88E5',
        shadowOpacity: 0.3,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 5 },
        position: 'relative',
        zIndex: 10,
    },
    headerContent: {
        alignItems: 'center',
        marginTop: 10,
    },
    headerTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 24,
        color: '#FFFFFF',
    },
    headerSub: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 13,
        color: '#E0F2FE',
        marginTop: 2,
    },
    avatarWrapper: {
        position: 'absolute',
        bottom: -50,
        alignSelf: 'center',
    },
    avatarCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 4,
        borderColor: '#FAFBFF',
    },
    editAvatarBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#43A047',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FAFBFF',
    },
    scrollContent: {
        paddingTop: 70, // Room for avatar
        paddingHorizontal: 20,
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 14,
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'right',
    },
    inputWrapper: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F8F9FF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        paddingHorizontal: 15,
        height: 52,
    },
    input: {
        flex: 1,
        fontFamily: 'Cairo_400Regular',
        fontSize: 14,
        color: '#1E293B',
        marginRight: 10, // due to row-reverse, marginRight puts space between icon and text
    },
    saveBtn: {
        height: 54,
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 10,
        elevation: 4,
        shadowColor: '#1E88E5',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
    },
    saveBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnText: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 16,
        color: '#FFFFFF',
    },
    logoutBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        paddingVertical: 10,
        gap: 8,
    },
    logoutBtnText: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 15,
        color: '#EF4444',
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    sectionTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 16,
        color: '#1E293B',
    },
    emptyRequests: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        marginVertical: 10,
    },
    requestCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    requestInfo: {
        alignItems: 'flex-end',
    },
    doctorName: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 14,
        color: '#1E293B',
    },
    requestDate: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 11,
        color: '#64748B',
    },
    requestActions: {
        flexDirection: 'row',
        gap: 8,
    },
    miniActionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    miniActionText: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 12,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    familyModal: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10 },
    familyInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular' },
    relationRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    relationChip: { borderRadius: 12, borderWidth: 1, borderColor: '#DCE8F5', paddingHorizontal: 10, paddingVertical: 6 },
    relationChipActive: { backgroundColor: '#1E88E5', borderColor: '#1E88E5' },
    relationText: { fontFamily: 'Cairo_700Bold', fontSize: 12, color: '#4A6080' },
});
