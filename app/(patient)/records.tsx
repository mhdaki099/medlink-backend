import React, { useEffect, useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, ActivityIndicator, 
    RefreshControl, TouchableOpacity, Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

export default function PatientRecordsScreen() {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const load = async () => {
        if (!user?.id) return;
        try {
            const visits = await api.getPatientVisits(user.id);
            setData(visits);
        } catch (e) { 
            console.warn(e); 
        } finally { 
            setLoading(false); 
            setRefreshing(false); 
        }
    };

    useEffect(() => { load(); }, [user]);

    const openVisitDetail = (visit: any) => {
        setSelectedVisit(visit);
        setShowDetailModal(true);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>📋 سجلاتي الطبية</Text>
                <Text style={styles.headerSub}>تاريخ كامل لجميع زياراتك الطبية</Text>
            </LinearGradient>

            {data && (
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{data.total_visits || 0}</Text>
                        <Text style={styles.statLabel}>إجمالي الزيارات</Text>
                    </View>
                </View>
            )}

            <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => { setRefreshing(true); load(); }} 
                    />
                }
            >
                {loading ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} size="large" />
                ) : !data || data.visits?.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>لا توجد سجلات طبية بعد</Text>
                        <Text style={styles.emptySubtext}>ستظهر هنا جميع زياراتك وتقاريرك الطبية</Text>
                    </View>
                ) : (
                    data.visits.map((visit: any, idx: number) => (
                        <TouchableOpacity 
                            key={visit.id} 
                            style={styles.visitCard}
                            onPress={() => openVisitDetail(visit)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.visitHeader}>
                                <View style={styles.visitDateBadge}>
                                    <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                                    <Text style={styles.visitDate}>{visit.visit_date}</Text>
                                </View>
                                <Text style={styles.doctorName}>د. {visit.doctor_name}</Text>
                            </View>

                            <Text style={styles.specialization}>{visit.doctor_specialization}</Text>

                            {visit.complaint && (
                                <View style={styles.complaintBox}>
                                    <Text style={styles.complaintLabel}>الشكوى:</Text>
                                    <Text style={styles.complaintText} numberOfLines={2}>
                                        {visit.complaint}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.visitFooter}>
                                {visit.consultation_report && (
                                    <View style={styles.badge}>
                                        <Ionicons name="document-text" size={12} color="#10B981" />
                                        <Text style={styles.badgeText}>تقرير</Text>
                                    </View>
                                )}
                                {visit.prescription && (
                                    <View style={styles.badge}>
                                        <Ionicons name="medical" size={12} color="#8B5CF6" />
                                        <Text style={styles.badgeText}>وصفة</Text>
                                    </View>
                                )}
                                {visit.service_requests?.length > 0 && (
                                    <View style={styles.badge}>
                                        <Ionicons name="flask" size={12} color="#F59E0B" />
                                        <Text style={styles.badgeText}>
                                            {visit.service_requests.length} طلب
                                        </Text>
                                    </View>
                                )}
                                <Ionicons name="chevron-back" size={18} color={Colors.textMuted} />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Visit Detail Modal */}
            <Modal
                visible={showDetailModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                            <Ionicons name="close" size={28} color={Colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>تفاصيل الزيارة</Text>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {selectedVisit && (
                            <>
                                {/* Visit Info */}
                                <View style={styles.detailSection}>
                                    <Text style={styles.sectionTitle}>معلومات الزيارة</Text>
                                    <View style={styles.infoCard}>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoValue}>
                                                د. {selectedVisit.doctor_name}
                                            </Text>
                                            <Text style={styles.infoLabel}>الطبيب</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoValue}>
                                                {selectedVisit.doctor_specialization}
                                            </Text>
                                            <Text style={styles.infoLabel}>التخصص</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoValue}>
                                                {selectedVisit.visit_date} - {selectedVisit.visit_time}
                                            </Text>
                                            <Text style={styles.infoLabel}>التاريخ والوقت</Text>
                                        </View>
                                        {selectedVisit.price && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoValue}>
                                                    {selectedVisit.price.toLocaleString()} ل.س
                                                </Text>
                                                <Text style={styles.infoLabel}>التكلفة</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* Complaint */}
                                {selectedVisit.complaint && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.sectionTitle}>الشكوى</Text>
                                        <View style={styles.contentCard}>
                                            <Text style={styles.contentText}>
                                                {selectedVisit.complaint}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Consultation Report */}
                                {selectedVisit.consultation_report && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.sectionTitle}>تقرير الاستشارة</Text>
                                        <View style={styles.contentCard}>
                                            {selectedVisit.consultation_report.is_healthy ? (
                                                <View style={styles.healthyBadge}>
                                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                                    <Text style={styles.healthyText}>المريض بصحة جيدة</Text>
                                                </View>
                                            ) : (
                                                <>
                                                    <Text style={styles.reportLabel}>ملخص الحالة:</Text>
                                                    <Text style={styles.contentText}>
                                                        {selectedVisit.consultation_report.condition_summary}
                                                    </Text>
                                                </>
                                            )}
                                            {selectedVisit.consultation_report.notes && (
                                                <>
                                                    <Text style={[styles.reportLabel, { marginTop: 12 }]}>
                                                        ملاحظات:
                                                    </Text>
                                                    <Text style={styles.contentText}>
                                                        {selectedVisit.consultation_report.notes}
                                                    </Text>
                                                </>
                                            )}
                                            {selectedVisit.follow_up && (
                                                <>
                                                    <Text style={[styles.reportLabel, { marginTop: 12 }]}>
                                                        المتابعة:
                                                    </Text>
                                                    <Text style={styles.contentText}>
                                                        {selectedVisit.follow_up}
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* Prescription */}
                                {selectedVisit.prescription && selectedVisit.prescription.medications?.length > 0 && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.sectionTitle}>الوصفة الطبية</Text>
                                        <View style={styles.contentCard}>
                                            {selectedVisit.prescription.prescription_code && (
                                                <View style={styles.codeBox}>
                                                    <Text style={styles.codeLabel}>رمز الوصفة:</Text>
                                                    <Text style={styles.codeValue}>
                                                        {selectedVisit.prescription.prescription_code}
                                                    </Text>
                                                </View>
                                            )}
                                            {selectedVisit.prescription.medications.map((med: any, idx: number) => (
                                                <View key={idx} style={styles.medItem}>
                                                    <View style={styles.medHeader}>
                                                        <Text style={styles.medName}>{med.name}</Text>
                                                        <Ionicons name="medical" size={16} color="#8B5CF6" />
                                                    </View>
                                                    <Text style={styles.medDetail}>
                                                        الجرعة: {med.dosage}
                                                    </Text>
                                                    <Text style={styles.medDetail}>
                                                        المدة: {med.duration}
                                                    </Text>
                                                </View>
                                            ))}
                                            {selectedVisit.prescription.notes && (
                                                <View style={styles.prescNotes}>
                                                    <Text style={styles.reportLabel}>ملاحظات:</Text>
                                                    <Text style={styles.contentText}>
                                                        {selectedVisit.prescription.notes}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* Service Requests */}
                                {selectedVisit.service_requests?.length > 0 && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.sectionTitle}>
                                            طلبات التحاليل والأشعة
                                        </Text>
                                        {selectedVisit.service_requests.map((req: any, idx: number) => (
                                            <View key={idx} style={styles.serviceCard}>
                                                <View style={styles.serviceHeader}>
                                                    <View style={styles.serviceTypeBadge}>
                                                        <Ionicons 
                                                            name={req.request_type === 'lab' ? 'flask' : 'scan'} 
                                                            size={14} 
                                                            color="#FFF" 
                                                        />
                                                        <Text style={styles.serviceTypeText}>
                                                            {req.request_type === 'lab' ? 'تحليل' : 'أشعة'}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.serviceName}>{req.service_name}</Text>
                                                </View>
                                                <View style={styles.refCodeBox}>
                                                    <Text style={styles.refCodeLabel}>رمز المرجع:</Text>
                                                    <Text style={styles.refCodeValue}>{req.reference_code}</Text>
                                                </View>
                                                {req.notes && (
                                                    <Text style={styles.serviceNotes}>{req.notes}</Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Notes */}
                                {selectedVisit.notes?.length > 0 && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.sectionTitle}>ملاحظات الطبيب</Text>
                                        {selectedVisit.notes.map((note: any, idx: number) => (
                                            <View key={idx} style={styles.noteCard}>
                                                <Text style={styles.noteText}>{note.note_text}</Text>
                                                <Text style={styles.noteDate}>
                                                    {new Date(note.created_at).toLocaleDateString('ar-SY')}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'right' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 4 },
    
    statsCard: { 
        backgroundColor: Colors.white, 
        marginHorizontal: 16, 
        marginTop: 16, 
        borderRadius: BorderRadius.lg, 
        padding: 16,
        ...Shadow.small 
    },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 28, fontWeight: '800', color: Colors.primary },
    statLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

    list: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    
    visitCard: { 
        backgroundColor: Colors.white, 
        borderRadius: BorderRadius.lg, 
        padding: 16, 
        marginBottom: 12,
        ...Shadow.small 
    },
    visitHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 8 
    },
    visitDateBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4
    },
    visitDate: { fontSize: 12, fontWeight: '600', color: Colors.primary },
    doctorName: { fontSize: 16, fontWeight: '800', color: Colors.text },
    specialization: { 
        fontSize: 13, 
        color: Colors.textSecondary, 
        textAlign: 'right',
        marginBottom: 10 
    },
    
    complaintBox: { 
        backgroundColor: Colors.background, 
        padding: 10, 
        borderRadius: BorderRadius.md,
        marginBottom: 10 
    },
    complaintLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 4 },
    complaintText: { fontSize: 13, color: Colors.text, textAlign: 'right' },
    
    visitFooter: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8 
    },
    badge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: Colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4
    },
    badgeText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },

    empty: { alignItems: 'center', marginTop: 80 },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
    emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 8, textAlign: 'center' },

    // Modal styles
    modalContainer: { flex: 1, backgroundColor: Colors.white },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background 
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
    modalBody: { flex: 1, paddingHorizontal: 16 },

    detailSection: { marginTop: 20 },
    sectionTitle: { 
        fontSize: 16, 
        fontWeight: '800', 
        color: Colors.text, 
        textAlign: 'right',
        marginBottom: 12 
    },
    
    infoCard: { 
        backgroundColor: Colors.background, 
        borderRadius: BorderRadius.lg, 
        padding: 16,
        gap: 12 
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoLabel: { fontSize: 13, color: Colors.textSecondary },
    infoValue: { fontSize: 14, fontWeight: '700', color: Colors.text },

    contentCard: { 
        backgroundColor: Colors.background, 
        borderRadius: BorderRadius.lg, 
        padding: 16 
    },
    contentText: { fontSize: 14, color: Colors.text, textAlign: 'right', lineHeight: 22 },
    reportLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },

    healthyBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: '#10B98115',
        borderRadius: BorderRadius.md 
    },
    healthyText: { fontSize: 15, fontWeight: '700', color: '#10B981' },

    codeBox: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 12,
        borderRadius: BorderRadius.md,
        marginBottom: 16 
    },
    codeLabel: { fontSize: 13, color: Colors.textSecondary },
    codeValue: { fontSize: 15, fontWeight: '800', color: Colors.primary },

    medItem: { 
        backgroundColor: Colors.white, 
        padding: 12, 
        borderRadius: BorderRadius.md,
        marginBottom: 10 
    },
    medHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 6 
    },
    medName: { fontSize: 15, fontWeight: '700', color: Colors.text },
    medDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    prescNotes: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.white },

    serviceCard: { 
        backgroundColor: Colors.background, 
        borderRadius: BorderRadius.lg, 
        padding: 14,
        marginBottom: 10 
    },
    serviceHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 10 
    },
    serviceTypeBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F59E0B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4 
    },
    serviceTypeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
    serviceName: { fontSize: 15, fontWeight: '700', color: Colors.text },
    refCodeBox: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: BorderRadius.md 
    },
    refCodeLabel: { fontSize: 12, color: Colors.textSecondary },
    refCodeValue: { fontSize: 14, fontWeight: '800', color: '#F59E0B' },
    serviceNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 8, textAlign: 'right' },

    noteCard: { 
        backgroundColor: Colors.background, 
        borderRadius: BorderRadius.md, 
        padding: 12,
        marginBottom: 8 
    },
    noteText: { fontSize: 13, color: Colors.text, textAlign: 'right', marginBottom: 6 },
    noteDate: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
});
