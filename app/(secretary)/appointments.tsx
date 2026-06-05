import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions, Platform, Alert
} from 'react-native';
import { TAB_BAR_CLEARANCE } from '../../src/constants/layout';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function SecretaryAppointments() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadApts = async () => {
        if (!user?.supervisor_id) return;
        try {
            const data = await api.getAppointments({ doctor_id: user.supervisor_id });
            setAppointments(data);
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadApts(); }, []);

    const handleStatusUpdate = async (aptId: string, newStatus: string) => {
        try {
            await api.updateAppointmentStatus(aptId, newStatus);
            Alert.alert('تمت العملية', `تم تغيير حالة الموعد إلى ${newStatus === 'confirmed' ? 'مؤكد' : 'ملغي'}`);
            loadApts();
        } catch (e) {
            Alert.alert('خطأ', 'فشل في تحديث حالة الموعد');
        }
    };

    const renderAptItem = ({ item }: { item: any }) => (
        <View style={styles.aptCard}>
            <View style={styles.aptHeader}>
                <View style={[styles.statusTag, { backgroundColor: item.status === 'confirmed' ? '#DCFCE7' : item.status === 'rejected' ? '#FEE2E2' : '#FEF9C3' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'confirmed' ? '#166534' : item.status === 'rejected' ? '#991B1B' : '#854D0E' }]}>
                        {item.status === 'confirmed' ? 'مؤكد' : item.status === 'rejected' ? 'ملغي' : 'قيد الانتظار'}
                    </Text>
                </View>
                <Text style={styles.aptTime}>{item.time} — {item.date}</Text>
            </View>
            
            <View style={styles.aptBody}>
                <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{item.patient?.name}</Text>
                    <Text style={styles.patientPhone}>{item.patient?.phone || 'لا يوجد رقم هاتف'}</Text>
                </View>
                <View style={styles.patientAvatar}>
                    <Ionicons name="person-circle" size={40} color="#CBD5E1" />
                </View>
            </View>

            {item.status === 'pending' && (
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]} 
                        onPress={() => handleStatusUpdate(item.id, 'rejected')}
                    >
                        <Text style={styles.rejectText}>رفض</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.confirmBtn]} 
                        onPress={() => handleStatusUpdate(item.id, 'confirmed')}
                    >
                        <Text style={styles.confirmText}>تأكيد</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.headerTitle}>إدارة المواعيد</Text>
            </LinearGradient>

            {loading ? (
                <ActivityIndicator size="large" color="#1E88E5" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={appointments}
                    keyExtractor={item => item.id}
                    renderItem={renderAptItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApts(); }} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="calendar-outline" size={60} color="#CBD5E1" />
                            <Text style={styles.emptyText}>لا يوجد طلبات مواعيد</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    list: { padding: 20, paddingBottom: TAB_BAR_CLEARANCE },
    aptCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    aptHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 10 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontFamily: 'Cairo_700Bold' },
    aptTime: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    aptBody: { flexDirection: 'row-reverse', alignItems: 'center' },
    patientAvatar: { marginLeft: 12 },
    patientInfo: { flex: 1, alignItems: 'flex-end' },
    patientName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    patientPhone: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#94A3B8', marginTop: 2 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 15 },
    actionBtn: { flex: 1, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    confirmBtn: { backgroundColor: '#E0F2FE' },
    confirmText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0369A1' },
    rejectBtn: { backgroundColor: '#FEE2E2' },
    rejectText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#991B1B' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', color: '#94A3B8', marginTop: 20 }
});
