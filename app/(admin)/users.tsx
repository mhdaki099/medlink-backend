import React, { useEffect, useState, useRef } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, ActivityIndicator, 
    RefreshControl, TouchableOpacity, Alert, TextInput, 
    Animated, Modal, Platform 
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';

const PREMIUM_COLORS = {
    primary: '#2563EB',
    secondary: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    white: '#FFFFFF',
    text: '#1F2937',
    textMuted: '#6B7280',
    background: '#F3F4F6',
    border: '#E5E7EB',
    cardLight: 'rgba(255, 255, 255, 0.95)',
    shadow: '#000000',
    adminHeader: '#1E3A8A'
};

const ROLES: Record<string, string> = {
    patient: 'مريض 🧑‍⚕️', doctor: 'طبيب 👨‍⚕️', pharmacy: 'صيدلية 💊',
    lab: 'مختبر 🧪', warehouse: 'مستودع 🏭', admin: 'مدير 🛠️', secretary: 'سكرتاريا 👩‍💼'
};

export default function AdminUsers() {
    const params = useLocalSearchParams<{ role?: string }>();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Filters
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [createVisible, setCreateVisible] = useState(false);
    const [newUserState, setNewUserState] = useState({ name: '', email: '', password: '', phone: '', city: '', role: 'patient' });
    const [creating, setCreating] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    const loadData = async () => {
        try { 
            const u = await api.getAllUsers(roleFilter === 'all' ? undefined : roleFilter); 
            setUsers(u); 
            
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true })
            ]).start();

        } catch (e) { console.warn(e); } 
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => {
        if (params.role) {
            setRoleFilter(params.role);
        }
    }, [params.role]);

    useEffect(() => { loadData(); }, [roleFilter]);

    const handleCreateUser = async () => {
        if (!newUserState.name || !newUserState.email) {
            Alert.alert('خطأ', 'الاسم والبريد الإلكتروني مطلوبان');
            return;
        }
        setCreating(true);
        try {
            await api.createAdminUser(newUserState);
            Alert.alert('نجاح', 'تم إنشاء المستخدم بنجاح');
            setCreateVisible(false);
            setNewUserState({ name: '', email: '', password: '', phone: '', city: '', role: 'patient' });
            loadData();
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'تعذر إنشاء المستخدم');
        } finally {
            setCreating(false);
        }
    };

    const verifyUser = async (id: string, name: string) => {
        Alert.alert('توثيق حساب', `هل تريد توثيق حساب ${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'توثيق ✓', onPress: async () => {
                    try { await api.verifyUser(id); loadData(); }
                    catch (e: any) { Alert.alert('خطأ', e.message); }
                }
            }
        ]);
    };

    const toggleActive = async (id: string, name: string, isActive: boolean) => {
        Alert.alert(isActive ? 'تعطيل الحساب' : 'تفعيل الحساب', `${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: isActive ? 'تعطيل ⛔' : 'تفعيل ✅', onPress: async () => {
                    try { await api.toggleUserActive(id); loadData(); }
                    catch (e: any) { Alert.alert('خطأ', e.message); }
                }
            }
        ]);
    };

    const toggleFeatured = async (id: string, name: string, isFeatured: boolean) => {
        Alert.alert(isFeatured ? 'إزالة من التمييز' : 'تمييز الحساب', `هل تريد ${isFeatured ? 'إزالة' : 'إضافة'} ${name} إلى قائمة الحسابات المميزة؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: isFeatured ? 'إزالة ⭐' : 'تمييز ⭐', onPress: async () => {
                    try { await api.toggleUserFeatured(id); loadData(); }
                    catch (e: any) { Alert.alert('خطأ', e.message); }
                }
            }
        ]);
    };

    const deleteUser = async (id: string, name: string) => {
        Alert.alert('حذف المستخدم', `حذف ${name} نهائياً؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'حذف 🗑️', style: 'destructive', onPress: async () => {
                    try { await api.deleteUser(id); loadData(); }
                    catch (e: any) { Alert.alert('خطأ', e.message); }
                }
            }
        ]);
    };

    const ROLE_OPTIONS = [{ key: 'all', label: 'الكل' }, ...Object.entries(ROLES).map(([k, v]) => ({ key: k, label: v }))];

    const filteredUsers = users.filter(u => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.id?.toLowerCase().includes(q));
    });

    return (
        <View style={styles.root}>
            <View style={styles.headerWrapper}>
                <LinearGradient
                    colors={[PREMIUM_COLORS.adminHeader, PREMIUM_COLORS.primary]}
                    style={styles.headerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.createBtnHeader} onPress={() => setCreateVisible(true)}>
                        <MaterialCommunityIcons name="plus" size={20} color={PREMIUM_COLORS.primary} />
                        <Text style={styles.createBtnText}>إضافة مستخدم</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>المستخدمين</Text>
                </View>
                
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons name="magnify" size={22} color={PREMIUM_COLORS.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ابحث بالاسم، الإيميل، الهاتف..."
                        placeholderTextColor={PREMIUM_COLORS.textMuted}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {ROLE_OPTIONS.map(opt => (
                        <TouchableOpacity 
                            key={opt.key} 
                            style={[styles.filterChip, roleFilter === opt.key && styles.filterChipActive]}
                            onPress={() => setRoleFilter(opt.key)}
                        >
                            <Text style={[styles.filterText, roleFilter === opt.key && { color: PREMIUM_COLORS.white }]}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List */}
            <ScrollView 
                style={styles.listContainer} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={PREMIUM_COLORS.primary} />}
            >
                {loading ? <ActivityIndicator color={PREMIUM_COLORS.primary} style={{ marginTop: 60 }} size="large" /> :
                    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY }] }]}>
                        {filteredUsers.length === 0 ? (
                            <Text style={styles.emptyText}>لم يتم العثور على مستخدمين مطابقين.</Text>
                        ) : (
                            filteredUsers.map((u: any) => (
                                <View key={u.id} style={styles.userCard}>
                                    <View style={styles.userTop}>
                                        <View style={styles.badges}>
                                            {u.verified ? 
                                                <View style={styles.badgeSuccess}><Text style={styles.badgeSuccessText}>موثق ✓</Text></View> :
                                                <View style={styles.badgeWarning}><Text style={styles.badgeWarningText}>غير موثق</Text></View>
                                            }
                                            {u.is_featured && (
                                                <View style={[styles.badgeWarning, {backgroundColor: '#FEF3C7'}]}>
                                                    <Text style={[styles.badgeWarningText, {color: '#D97706'}]}>مميز ⭐</Text>
                                                </View>
                                            )}
                                            {!u.is_active && <View style={styles.badgeDanger}><Text style={styles.badgeDangerText}>معطل ⛔</Text></View>}
                                        </View>
                                        <Text style={styles.userName}>{u.name}</Text>
                                    </View>
                                    
                                    <View style={styles.userInfoRow}>
                                        <Text style={styles.userInfoText}>{u.email}</Text>
                                        <MaterialCommunityIcons name="email-outline" size={14} color={PREMIUM_COLORS.textMuted} />
                                    </View>
                                    <View style={styles.userInfoRow}>
                                        <Text style={styles.userInfoText}>{u.phone || 'لا يوجد هاتف'}</Text>
                                        <MaterialCommunityIcons name="phone-outline" size={14} color={PREMIUM_COLORS.textMuted} />
                                    </View>
                                    
                                    <View style={styles.roleRow}>
                                        <Text style={styles.roleText}>{ROLES[u.role] || u.role}</Text>
                                        <Text style={styles.cityText}>{u.city ? `📍 ${u.city}` : ''}</Text>
                                    </View>

                                    <View style={styles.divider} />
                                    
                                    <View style={styles.actionsRow}>
                                        <TouchableOpacity style={styles.actionBtnDelete} onPress={() => deleteUser(u.id, u.name)}>
                                            <MaterialCommunityIcons name="trash-can-outline" size={16} color={PREMIUM_COLORS.danger} />
                                            <Text style={styles.actionBtnTextDelete}>حذف</Text>
                                        </TouchableOpacity>

                                        <View style={styles.actionsRight}>
                                            {!u.verified && (
                                                <TouchableOpacity style={styles.actionBtnVerify} onPress={() => verifyUser(u.id, u.name)}>
                                                    <Text style={styles.actionBtnTextVerify}>توثيق</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity 
                                                style={[styles.actionBtnToggle, u.is_active ? styles.btnDanger : styles.btnSuccess]}
                                                onPress={() => toggleActive(u.id, u.name, u.is_active)}
                                            >
                                                <Text style={[styles.actionBtnTextToggle, { color: u.is_active ? PREMIUM_COLORS.danger : PREMIUM_COLORS.secondary }]}>
                                                    {u.is_active ? 'تعطيل' : 'تفعيل'}
                                                </Text>
                                            </TouchableOpacity>

                                            {(u.role === 'doctor' || u.role === 'pharmacy') && (
                                                <TouchableOpacity 
                                                    style={[styles.actionBtnToggle, u.is_featured ? {borderColor: '#F59E0B', backgroundColor: '#FFFBEB'} : {borderColor: PREMIUM_COLORS.border}]}
                                                    onPress={() => toggleFeatured(u.id, u.name, u.is_featured)}
                                                >
                                                    <MaterialCommunityIcons 
                                                        name={u.is_featured ? "star" : "star-outline"} 
                                                        size={16} 
                                                        color={u.is_featured ? '#F59E0B' : PREMIUM_COLORS.textMuted} 
                                                    />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))
                        )}
                        <View style={{ height: 40 }} />
                    </Animated.View>
                }
            </ScrollView>

            {/* Create User Modal */}
            <Modal visible={createVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setCreateVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={PREMIUM_COLORS.text} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>مستخدم جديد</Text>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>الاسم الكامل *</Text>
                            <TextInput style={styles.modalInput} value={newUserState.name} onChangeText={(t) => setNewUserState({...newUserState, name: t})} />
                            
                            <Text style={styles.inputLabel}>البريد الإلكتروني *</Text>
                            <TextInput style={styles.modalInput} value={newUserState.email} onChangeText={(t) => setNewUserState({...newUserState, email: t})} keyboardType="email-address" autoCapitalize="none" />
                            
                            <Text style={styles.inputLabel}>كلمة المرور (اختياري، افتراضي 123456)</Text>
                            <TextInput style={styles.modalInput} value={newUserState.password} onChangeText={(t) => setNewUserState({...newUserState, password: t})} secureTextEntry />
                            
                            <Text style={styles.inputLabel}>الدور</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}} contentContainerStyle={{gap: 8}}>
                                {Object.entries(ROLES).map(([k, v]) => k !== 'admin' ? (
                                    <TouchableOpacity 
                                        key={k} 
                                        style={[styles.roleSelectChip, newUserState.role === k && styles.roleSelectChipActive]}
                                        onPress={() => setNewUserState({...newUserState, role: k})}
                                    >
                                        <Text style={[styles.roleSelectText, newUserState.role === k && { color: PREMIUM_COLORS.white }]}>{v}</Text>
                                    </TouchableOpacity>
                                ) : null)}
                            </ScrollView>

                            <Text style={styles.inputLabel}>رقم الهاتف</Text>
                            <TextInput style={styles.modalInput} value={newUserState.phone} onChangeText={(t) => setNewUserState({...newUserState, phone: t})} keyboardType="phone-pad" />
                            
                            <Text style={styles.inputLabel}>المدينة</Text>
                            <TextInput style={styles.modalInput} value={newUserState.city} onChangeText={(t) => setNewUserState({...newUserState, city: t})} />

                            <TouchableOpacity 
                                style={[styles.submitBtn, creating && { opacity: 0.7 }]} 
                                onPress={handleCreateUser} 
                                disabled={creating}
                            >
                                {creating ? <ActivityIndicator color={PREMIUM_COLORS.white} /> : <Text style={styles.submitBtnText}>إنشاء الحساب</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: PREMIUM_COLORS.background },
    headerWrapper: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerGradient: { ...StyleSheet.absoluteFillObject },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.white },
    createBtnHeader: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: PREMIUM_COLORS.white,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    },
    createBtnText: { color: PREMIUM_COLORS.primary, fontFamily: 'Cairo_700Bold', fontSize: 12, marginLeft: 4 },
    searchContainer: {
        flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: PREMIUM_COLORS.cardLight,
        borderRadius: 16, paddingHorizontal: 14, height: 45,
    },
    searchInput: { flex: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: PREMIUM_COLORS.text, textAlign: 'right', paddingRight: 8 },
    filterWrapper: { marginTop: 15, marginBottom: 5 },
    filterScroll: { paddingHorizontal: 16, gap: 8 },
    filterChip: { backgroundColor: PREMIUM_COLORS.white, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: PREMIUM_COLORS.border },
    filterChipActive: { backgroundColor: PREMIUM_COLORS.primary, borderColor: PREMIUM_COLORS.primary },
    filterText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: PREMIUM_COLORS.textMuted },
    listContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    emptyText: { textAlign: 'center', fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted, marginTop: 40 },
    userCard: { backgroundColor: PREMIUM_COLORS.cardLight, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: PREMIUM_COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
    userTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    userName: { fontSize: 16, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.text },
    badges: { flexDirection: 'row', gap: 4 },
    badgeSuccess: { backgroundColor: PREMIUM_COLORS.secondary + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    badgeSuccessText: { color: PREMIUM_COLORS.secondary, fontSize: 10, fontFamily: 'Cairo_700Bold' },
    badgeWarning: { backgroundColor: PREMIUM_COLORS.warning + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    badgeWarningText: { color: PREMIUM_COLORS.warning, fontSize: 10, fontFamily: 'Cairo_700Bold' },
    badgeDanger: { backgroundColor: PREMIUM_COLORS.danger + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    badgeDangerText: { color: PREMIUM_COLORS.danger, fontSize: 10, fontFamily: 'Cairo_700Bold' },
    userInfoRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 4 },
    userInfoText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted, marginRight: 6 },
    roleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    roleText: { fontSize: 13, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.primary },
    cityText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted },
    divider: { height: 1, backgroundColor: PREMIUM_COLORS.border, marginVertical: 12 },
    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    actionsRight: { flexDirection: 'row', gap: 8 },
    actionBtnToggle: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    btnSuccess: { borderColor: PREMIUM_COLORS.secondary, backgroundColor: PREMIUM_COLORS.secondary + '10' },
    btnDanger: { borderColor: PREMIUM_COLORS.danger, backgroundColor: PREMIUM_COLORS.danger + '10' },
    actionBtnTextToggle: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    actionBtnVerify: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: PREMIUM_COLORS.primary + '15' },
    actionBtnTextVerify: { color: PREMIUM_COLORS.primary, fontSize: 11, fontFamily: 'Cairo_700Bold' },
    actionBtnDelete: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
    actionBtnTextDelete: { color: PREMIUM_COLORS.danger, fontSize: 11, fontFamily: 'Cairo_700Bold', marginLeft: 4 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: PREMIUM_COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.text },
    inputLabel: { textAlign: 'right', fontSize: 13, fontFamily: 'Cairo_700Bold', color: PREMIUM_COLORS.text, marginBottom: 6 },
    modalInput: { backgroundColor: PREMIUM_COLORS.background, borderRadius: 12, paddingHorizontal: 14, height: 48, fontSize: 14, fontFamily: 'Cairo_600SemiBold', textAlign: 'right', marginBottom: 15, borderWidth: 1, borderColor: PREMIUM_COLORS.border },
    roleSelectChip: { backgroundColor: PREMIUM_COLORS.background, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: PREMIUM_COLORS.border },
    roleSelectChipActive: { backgroundColor: PREMIUM_COLORS.primary, borderColor: PREMIUM_COLORS.primary },
    roleSelectText: { fontFamily: 'Cairo_600SemiBold', fontSize: 12, color: PREMIUM_COLORS.textMuted },
    submitBtn: { backgroundColor: PREMIUM_COLORS.primary, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 20 },
    submitBtnText: { color: PREMIUM_COLORS.white, fontFamily: 'Cairo_700Bold', fontSize: 16 }
});
