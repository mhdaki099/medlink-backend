import React, { useEffect, useState, useRef } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, ActivityIndicator, 
    RefreshControl, TouchableOpacity, Alert, Animated, Platform,
    Image, Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../src/services/api';

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

export default function NewAccounts() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    const loadData = async () => {
        try { 
            const r = await api.getRegistrationRequests(); 
            setRequests(r); 
            
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true })
            ]).start();

        } catch (e: any) { 
            console.warn(e); 
            Alert.alert('خطأ', 'تعذر تحميل الطلبات');
        } 
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { loadData(); }, []);

    const getFullUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        // Strip /api from BASE_URL to get domain root
        const root = BASE_URL.replace('/api', '');
        return `${root}${path}`;
    };

    const handleOpenDoc = (url: string) => {
        const fullUrl = getFullUrl(url);
        Linking.openURL(fullUrl).catch(() => Alert.alert('خطأ', 'تعذر فتح الملف'));
    };

    const handleApprove = async (id: string, name: string) => {
        Alert.alert('موافقة على الحساب', `هل أنت متأكد من الموافقة على حساب ${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'موافقة ✅', onPress: async () => {
                    try { 
                        await api.approveRegistration(id); 
                        Alert.alert('نجاح', 'تم تفعيل الحساب بنجاح');
                        loadData(); 
                    }
                    catch (e: any) { Alert.alert('خطأ', e.message); }
                }
            }
        ]);
    };

    const handleReject = async (id: string, name: string) => {
        Alert.alert('رفض الطلب', `هل أنت متأكد من رفض طلب ${name}؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'رفض 🗑️', style: 'destructive', onPress: async () => {
                    try { 
                        await api.rejectRegistration(id); 
                        Alert.alert('تنبيه', 'تم رفض الطلب بنجاح');
                        loadData(); 
                    }
                    catch (e: any) { Alert.alert('خطأ', e.message); }
                }
            }
        ]);
    };

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
                    <View />
                    <Text style={styles.headerTitle}>طلبات التسجيل</Text>
                </View>
                <Text style={styles.headerSub}>راجع طلبات انضمام الكوادر الطبية والمراكز</Text>
            </View>

            <ScrollView 
                style={styles.listContainer} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={PREMIUM_COLORS.primary} />}
            >
                {loading ? <ActivityIndicator color={PREMIUM_COLORS.primary} style={{ marginTop: 60 }} size="large" /> :
                    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY }] }]}>
                        {requests.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <MaterialCommunityIcons name="account-check-outline" size={80} color={PREMIUM_COLORS.textMuted + '40'} />
                                <Text style={styles.emptyText}>لا توجد طلبات تدقيق حالياً.</Text>
                            </View>
                        ) : (
                            requests.map((r: any) => {
                                const fullName = `${r.data?.first_name || ''} ${r.data?.last_name || ''}`.trim() || r.email;
                                const photoUrl = getFullUrl(r.data?.photo);
                                return (
                                    <View key={r.id} style={styles.card}>
                                        <View style={styles.cardTop}>
                                            <View style={styles.roleBadge}>
                                                <Text style={styles.roleBadgeText}>{ROLES[r.role] || r.role}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={styles.cardName}>{fullName}</Text>
                                                <Text style={styles.cardEmail}>{r.email}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.mainContent}>
                                            {photoUrl ? (
                                                <Image source={{ uri: photoUrl }} style={styles.doctorPhoto} />
                                            ) : (
                                                <View style={[styles.doctorPhoto, styles.photoPlaceholder]}>
                                                    <MaterialCommunityIcons name="account" size={40} color={PREMIUM_COLORS.textMuted} />
                                                </View>
                                            )}
                                            
                                            <View style={styles.detailsBox}>
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.infoText}>{r.data?.phone || 'لا يوجد هاتف'}</Text>
                                                    <MaterialCommunityIcons name="phone" size={14} color={PREMIUM_COLORS.textMuted} />
                                                </View>
                                                <View style={styles.infoRow}>
                                                    <Text style={[styles.infoText, { color: PREMIUM_COLORS.secondary, fontWeight: 'bold' }]}>{r.data?.price_per_session || 0} ل.س</Text>
                                                    <MaterialCommunityIcons name="cash" size={14} color={PREMIUM_COLORS.secondary} />
                                                </View>
                                                <Text style={styles.detailText}>🏥 {r.data?.clinic_name}</Text>
                                                <Text style={styles.detailText}>📍 {r.data?.clinic_address}, {r.data?.city}</Text>
                                            </View>
                                        </View>

                                        {r.data?.documents && r.data.documents.length > 0 && (
                                            <View style={styles.docsSection}>
                                                <Text style={styles.sectionTitle}>الوثائق والشهادات المرفقة:</Text>
                                                <View style={styles.docsList}>
                                                    {r.data.documents.map((doc: string, idx: number) => (
                                                        <TouchableOpacity key={idx} style={styles.docItem} onPress={() => handleOpenDoc(doc)}>
                                                            <MaterialCommunityIcons name="file-document-outline" size={20} color={PREMIUM_COLORS.primary} />
                                                            <Text style={styles.docItemText}>وثيقة رقم {idx + 1}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        <View style={styles.divider} />
                                        
                                        <View style={styles.actions}>
                                            <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(r.id, fullName)}>
                                                <Text style={styles.rejectText}>رفض الطلب</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(r.id, fullName)}>
                                                <LinearGradient
                                                    colors={[PREMIUM_COLORS.secondary, '#059669']}
                                                    style={styles.approveGradient}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                >
                                                    <Text style={styles.approveText}>قبول وتفعيل الحساب</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                        <View style={{ height: 100 }} />
                    </Animated.View>
                }
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: PREMIUM_COLORS.background },
    headerWrapper: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 25,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        overflow: 'hidden',
    },
    headerGradient: { ...StyleSheet.absoluteFillObject },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.white },
    headerSub: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
    listContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 15 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { textAlign: 'center', fontFamily: 'Cairo_700Bold', color: PREMIUM_COLORS.textMuted, marginTop: 20, fontSize: 16 },
    card: { 
        backgroundColor: PREMIUM_COLORS.cardLight, 
        borderRadius: 24, 
        padding: 16, 
        marginBottom: 16, 
        shadowColor: PREMIUM_COLORS.shadow, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 10, 
        elevation: 4 
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardName: { fontSize: 17, fontFamily: 'Cairo_800ExtraBold', color: PREMIUM_COLORS.text },
    cardEmail: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted },
    roleBadge: { backgroundColor: PREMIUM_COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    roleBadgeText: { color: PREMIUM_COLORS.primary, fontSize: 11, fontFamily: 'Cairo_700Bold' },
    
    mainContent: { flexDirection: 'row-reverse', gap: 12, marginBottom: 12 },
    doctorPhoto: { width: 80, height: 100, borderRadius: 12, backgroundColor: '#EEE' },
    photoPlaceholder: { justifyContent: 'center', alignItems: 'center' },
    
    detailsBox: { 
        flex: 1,
        backgroundColor: '#F9FAFB', 
        borderRadius: 12, 
        padding: 10,
        borderWidth: 1,
        borderColor: PREMIUM_COLORS.border
    },
    infoRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 4, gap: 6 },
    infoText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.textMuted },
    detailText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: PREMIUM_COLORS.text, textAlign: 'right', marginBottom: 4 },
    
    docsSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 12 },
    sectionTitle: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: PREMIUM_COLORS.text, textAlign: 'right', marginBottom: 8 },
    docsList: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
    docItem: { 
        flexDirection: 'row-reverse', 
        alignItems: 'center', 
        backgroundColor: '#FFF', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 8,
        borderWidth: 1,
        borderColor: PREMIUM_COLORS.primary + '40',
        gap: 6
    },
    docItemText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: PREMIUM_COLORS.primary },

    divider: { height: 1, backgroundColor: PREMIUM_COLORS.border, marginVertical: 15 },
    actions: { flexDirection: 'row', gap: 12 },
    rejectBtn: { flex: 1, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: PREMIUM_COLORS.danger + '40' },
    rejectText: { color: PREMIUM_COLORS.danger, fontFamily: 'Cairo_700Bold', fontSize: 13 },
    approveBtn: { flex: 2, height: 45, borderRadius: 12, overflow: 'hidden' },
    approveGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    approveText: { color: PREMIUM_COLORS.white, fontFamily: 'Cairo_700Bold', fontSize: 13 }
});
