import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

const { width } = Dimensions.get('window');

const STATUS_MAP: Record<string, { label: string, color: string, icon: string }> = {
    'pending': { label: 'في انتظار الموافقة', color: '#F59E0B', icon: 'clock-outline' },
    'confirmed': { label: 'موعد مؤكد', color: '#10B981', icon: 'check-circle-outline' },
    'completed': { label: 'موعد مكتمل', color: '#3B82F6', icon: 'checkbox-marked-circle-outline' },
    'cancelled': { label: 'ملغي', color: '#EF4444', icon: 'close-circle-outline' },
};

export default function AppointmentsScreen() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            if (user?.id) {
                const data = await api.getAppointments({ patient_id: user.id });
                // Sort by date descending
                const sorted = data.sort((a,b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
                setAppointments(sorted);
            }
        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [user]);

    const renderAppointment = ({ item }: { item: any }) => {
        const status = STATUS_MAP[item.status] || { label: item.status, color: '#6B7280', icon: 'help-circle-outline' };
        
        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.9}>
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
                        <MaterialCommunityIcons name={status.icon as any} size={14} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                    </View>
                    <Text style={styles.dateText}>{item.date}</Text>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.docIconBox}>
                        <LinearGradient
                            colors={['#1E88E5', '#43A047']}
                            style={styles.docIconGradient}
                            start={{x:0,y:0}} end={{x:1,y:1}}
                        >
                            <MaterialCommunityIcons name="doctor" size={24} color="#FFF" />
                        </LinearGradient>
                    </View>
                    <View style={styles.infoCol}>
                        <Text style={styles.docName}>د. {item.doctor_name || item.doctor_id}</Text>
                        <View style={styles.timeRow}>
                            <Ionicons name="time-outline" size={14} color="#6B7280" />
                            <Text style={styles.timeText}>{item.time}</Text>
                        </View>
                    </View>
                </View>

                {item.notes && (
                    <View style={styles.notesBox}>
                        <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
                    </View>
                )}

                <View style={styles.cardFooter}>
                    <View style={styles.priceTag}>
                        <Text style={styles.priceVal}>{item.price?.toLocaleString()} ل.س</Text>
                    </View>
                    <TouchableOpacity style={styles.detailsBtn}>
                        <Text style={styles.detailsBtnText}>التفاصيل</Text>
                        <Ionicons name="chevron-back" size={16} color="#1E88E5" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1E88E5', '#43A047']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Text style={styles.headerTitle}>مواعيدي</Text>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#1E88E5" size="large" />
                </View>
            ) : appointments.length === 0 ? (
                <View style={styles.empty}>
                    <View style={styles.emptyCircle}>
                        <MaterialCommunityIcons name="calendar-blank" size={80} color="#E5E7EB" />
                    </View>
                    <Text style={styles.emptyTitle}>لا توجد مواعيد</Text>
                    <Text style={styles.emptySub}>لم تقم بحجز أي مواعيد طبية بعد</Text>
                </View>
            ) : (
                <FlatList
                    data={appointments}
                    renderItem={renderAppointment}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onRefresh={load}
                    refreshing={loading}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFBFF' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 25,
        alignItems: 'center',
        borderBottomLeftRadius: 35,
        borderBottomRightRadius: 35,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    headerTitle: { fontSize: 24, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#111827', marginBottom: 8 },
    emptySub: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#6B7280', textAlign: 'center' },
    
    listContent: { padding: 20, paddingBottom: 120 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 15,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    statusBadge: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
    statusText: { fontSize: 11, fontFamily: 'Cairo_700Bold' },
    dateText: { fontSize: 12, color: '#94A3B8', fontFamily: 'Cairo_600SemiBold' },
    
    cardBody: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 15 },
    docIconBox: { width: 56, height: 56, borderRadius: 18, overflow: 'hidden' },
    docIconGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    infoCol: { flex: 1, alignItems: 'flex-end', paddingRight: 15 },
    docName: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#111827' },
    timeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 4 },
    timeText: { fontSize: 13, color: '#6B7280', fontFamily: 'Cairo_600SemiBold' },
    
    notesBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 14, marginBottom: 15 },
    notesText: { fontSize: 12, color: '#64748B', fontFamily: 'Cairo_400Regular', textAlign: 'right' },
    
    cardFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    priceTag: { backgroundColor: '#F0F9FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    priceVal: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    detailsBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
    detailsBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#1E88E5' }
});
