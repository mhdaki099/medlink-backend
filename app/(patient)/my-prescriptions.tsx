import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Dimensions, Platform, Modal, TextInput, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import BreadcrumbNav from '../../src/components/BreadcrumbNav';

const { width } = Dimensions.get('window');

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
    pending: { label: 'قيد الانتظار', color: '#FF9500', bgColor: '#FFF7ED', icon: 'clock-outline' },
    partially_dispensed: { label: 'مdispensed جزئياً', color: '#7C3AED', bgColor: '#F5F3FF', icon: 'progress-clock' },
    fully_dispensed: { label: 'تم صرفها', color: '#10B981', bgColor: '#F0FDF4', icon: 'check-circle-outline' },
};

interface Prescription {
    id: string;
    prescription_code: string;
    medications: any[];
    fulfillment_items: any[];
    notes: string;
    status: string;
    created_at: string;
    doctor?: any;
    patient?: any;
    pharmacy_id?: string;
}

export default function MyPrescriptionsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchCode, setSearchCode] = useState('');
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const loadPrescriptions = async () => {
        if (!user?.id) return;
        try {
            const data = await api.getPatientPrescriptions(user.id);
            setPrescriptions(data || []);
        } catch (e: any) {
            console.warn('Failed to load prescriptions:', e);
            Alert.alert('خطأ', e.message || 'تعذر تحميل الوصفات');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadPrescriptions();
    }, [user]);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const getStatusConfig = (status: string) => {
        return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    };

    const getItemStatusIcon = (status: string) => {
        switch (status) {
            case 'dispensed': return { icon: 'check-circle', color: '#10B981' };
            case 'substituted': return { icon: 'swap-horizontal', color: '#7C3AED' };
            case 'unavailable': return { icon: 'close-circle', color: '#EF4444' };
            default: return { icon: 'clock-outline', color: '#FF9500' };
        }
    };

    const renderPrescriptionCard = (presc: Prescription, index: number) => {
        const statusConfig = getStatusConfig(presc.status);
        const dispensedCount = (presc.fulfillment_items || []).filter(
            (item: any) => item.status === 'dispensed' || item.status === 'substituted'
        ).length;
        const totalCount = presc.medications?.length || 0;

        return (
            <Animated.View
                key={presc.id}
                entering={FadeInDown.delay(index * 80).springify()}
            >
                <TouchableOpacity
                    style={styles.prescriptionCard}
                    activeOpacity={0.9}
                    onPress={() => {
                        setSelectedPrescription(presc);
                        setShowDetailModal(true);
                    }}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                            <MaterialCommunityIcons
                                name={statusConfig.icon as any}
                                size={14}
                                color={statusConfig.color}
                            />
                            <Text style={[styles.statusText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                        <View style={styles.codeContainer}>
                            <Text style={styles.prescriptionCode}>{presc.prescription_code}</Text>
                        </View>
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.doctorInfo}>
                            <MaterialCommunityIcons name="doctor" size={20} color="#1E88E5" />
                            <View style={styles.doctorDetails}>
                                <Text style={styles.doctorName}>
                                    د. {presc.doctor?.name || 'غير محدد'}
                                </Text>
                                <Text style={styles.doctorSpec}>
                                    {presc.doctor?.specialization || ''}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${totalCount > 0 ? (dispensedCount / totalCount) * 100 : 0}%`,
                                            backgroundColor: statusConfig.color
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {dispensedCount}/{totalCount} أدوية
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <Text style={styles.dateText}>{formatDate(presc.created_at)}</Text>
                        <View style={styles.viewDetailsBtn}>
                            <Text style={styles.viewDetailsText}>عرض التفاصيل</Text>
                            <Ionicons name="chevron-forward" size={14} color="#1E88E5" />
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderDetailModal = () => {
        if (!selectedPrescription) return null;
        const statusConfig = getStatusConfig(selectedPrescription.status);

        return (
            <Modal
                visible={showDetailModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>تفاصيل الوصفة</Text>
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={() => setShowDetailModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <View style={styles.prescriptionHeader}>
                                <View style={[styles.bigStatusBadge, { backgroundColor: statusConfig.bgColor }]}>
                                    <MaterialCommunityIcons
                                        name={statusConfig.icon as any}
                                        size={24}
                                        color={statusConfig.color}
                                    />
                                    <Text style={[styles.bigStatusText, { color: statusConfig.color }]}>
                                        {statusConfig.label}
                                    </Text>
                                </View>
                                <Text style={styles.bigPrescriptionCode}>
                                    {selectedPrescription.prescription_code}
                                </Text>
                                <Text style={styles.prescriptionDate}>
                                    {formatDate(selectedPrescription.created_at)}
                                </Text>
                            </View>

                            <View style={styles.doctorSection}>
                                <Text style={styles.sectionTitle}>الطبيب</Text>
                                <View style={styles.doctorCard}>
                                    <MaterialCommunityIcons name="doctor" size={28} color="#1E88E5" />
                                    <View style={styles.doctorCardInfo}>
                                        <Text style={styles.doctorCardName}>
                                            د. {selectedPrescription.doctor?.name || 'غير محدد'}
                                        </Text>
                                        <Text style={styles.doctorCardSpec}>
                                            {selectedPrescription.doctor?.specialization || ''}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.medicinesSection}>
                                <Text style={styles.sectionTitle}>الأدوية ({selectedPrescription.medications?.length || 0})</Text>
                                {(selectedPrescription.fulfillment_items || selectedPrescription.medications || []).map((item: any, idx: number) => {
                                    const itemStatus = getItemStatusIcon(item.status || 'pending');
                                    return (
                                        <View key={idx} style={styles.medicineItem}>
                                            <View style={styles.medicineMain}>
                                                <View style={[styles.medicineIcon, { backgroundColor: itemStatus.color + '15' }]}>
                                                    <MaterialCommunityIcons
                                                        name={itemStatus.icon as any}
                                                        size={18}
                                                        color={itemStatus.color}
                                                    />
                                                </View>
                                                <View style={styles.medicineInfo}>
                                                    <Text style={styles.medicineName}>{item.name}</Text>
                                                    <Text style={styles.medicineDosage}>
                                                        {item.dosage} - {item.frequency || item.duration}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={[styles.itemStatusBadge, {
                                                backgroundColor: itemStatus.color + '15'
                                            }]}>
                                                <Text style={[styles.itemStatusText, { color: itemStatus.color }]}>
                                                    {item.status === 'dispensed' ? 'تم الصرف' :
                                                     item.status === 'substituted' ? 'تم الاستبدال' :
                                                     item.status === 'unavailable' ? 'غير متوفر' : 'قيد الانتظار'}
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {selectedPrescription.notes && (
                                <View style={styles.notesSection}>
                                    <Text style={styles.sectionTitle}>ملاحظات</Text>
                                    <Text style={styles.notesText}>{selectedPrescription.notes}</Text>
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.pharmacySearchBtn}
                            onPress={() => {
                                setShowDetailModal(false);
                                router.push('/(patient)/pharmacies' as any);
                            }}
                        >
                            <MaterialCommunityIcons name="pharmacy" size={20} color="#FFF" />
                            <Text style={styles.pharmacySearchText}>صرف من صيدلية</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-forward" size={28} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>وصفاتي</Text>
                    <View style={{ width: 28 }} />
                </LinearGradient>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1E88E5" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>وصفاتي</Text>
                <View style={{ width: 28 }} />
            </LinearGradient>

            <BreadcrumbNav items={[
                { label: 'الرئيسية', route: '/(patient)' },
                { label: 'خدماتي', route: '/(patient)/services' },
                { label: 'وصفاتي' }
            ]} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadPrescriptions(); }}
                        colors={['#1E88E5']}
                    />
                }
            >
                {prescriptions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="prescription" size={80} color="#E2E8F0" />
                        <Text style={styles.emptyTitle}>لا توجد وصفات</Text>
                        <Text style={styles.emptySubtitle}>
                            ستظهر هنا الوصفات الطبية التي يصفها لك أطباؤك
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>{prescriptions.length}</Text>
                                <Text style={styles.summaryLabel}>إجمالي الوصفات</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>
                                    {prescriptions.filter(p => p.status === 'fully_dispensed').length}
                                </Text>
                                <Text style={styles.summaryLabel}>تم صرفها</Text>
                            </View>
                            <View style={styles.summaryDivider} />
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryValue}>
                                    {prescriptions.filter(p => p.status === 'pending').length}
                                </Text>
                                <Text style={styles.summaryLabel}>قيد الانتظار</Text>
                            </View>
                        </View>

                        {prescriptions.map((presc, index) => renderPrescriptionCard(presc, index))}
                    </>
                )}
            </ScrollView>

            {renderDetailModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F7FD',
    },
    header: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 20,
    },
    backBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 20,
        color: '#FFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    summaryCard: {
        flexDirection: 'row-reverse',
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryValue: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 24,
        color: '#43A047',
    },
    summaryLabel: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 11,
        color: '#64748B',
        marginTop: 4,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: '#E2E8F0',
    },
    prescriptionCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 12,
    },
    codeContainer: {
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    prescriptionCode: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 14,
        color: '#1E88E5',
    },
    cardBody: {
        marginBottom: 12,
    },
    doctorInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    doctorDetails: {
        alignItems: 'flex-end',
    },
    doctorName: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 15,
        color: '#1E293B',
    },
    doctorSpec: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 12,
        color: '#64748B',
    },
    progressContainer: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 11,
        color: '#64748B',
        minWidth: 50,
        textAlign: 'left',
    },
    cardFooter: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    dateText: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 12,
        color: '#94A3B8',
    },
    viewDetailsBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
    },
    viewDetailsText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 12,
        color: '#1E88E5',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 22,
        color: '#1E293B',
        marginTop: 20,
    },
    emptySubtitle: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 18,
        color: '#1E293B',
    },
    closeBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        padding: 20,
    },
    prescriptionHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    bigStatusBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        marginBottom: 12,
    },
    bigStatusText: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 14,
    },
    bigPrescriptionCode: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 28,
        color: '#1E88E5',
    },
    prescriptionDate: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 13,
        color: '#64748B',
        marginTop: 4,
    },
    sectionTitle: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 16,
        color: '#1E293B',
        marginBottom: 12,
    },
    doctorSection: {
        marginBottom: 24,
    },
    doctorCard: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
    },
    doctorCardInfo: {
        alignItems: 'flex-end',
    },
    doctorCardName: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 15,
        color: '#1E293B',
    },
    doctorCardSpec: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 12,
        color: '#64748B',
    },
    medicinesSection: {
        marginBottom: 24,
    },
    medicineItem: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
    },
    medicineMain: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    medicineIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    medicineInfo: {
        alignItems: 'flex-end',
        flex: 1,
    },
    medicineName: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 14,
        color: '#1E293B',
    },
    medicineDosage: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    itemStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    itemStatusText: {
        fontFamily: 'Cairo_600SemiBold',
        fontSize: 10,
    },
    notesSection: {
        marginBottom: 24,
    },
    notesText: {
        fontFamily: 'Cairo_400Regular',
        fontSize: 14,
        color: '#64748B',
        backgroundColor: '#F8FAFC',
        padding: 14,
        borderRadius: 12,
        lineHeight: 22,
    },
    pharmacySearchBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#43A047',
        margin: 20,
        paddingVertical: 16,
        borderRadius: 14,
    },
    pharmacySearchText: {
        fontFamily: 'Cairo_700Bold',
        fontSize: 16,
        color: '#FFF',
    },
});