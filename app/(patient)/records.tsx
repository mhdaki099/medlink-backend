import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator,
    RefreshControl, TouchableOpacity, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { Colors, BorderRadius, Shadow } from '../../src/theme';
import { TAB_BAR_CLEARANCE } from '../../src/constants/layout';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

const hasPrescription = (p: any) => {
    if (!p) return false;
    const meds = p.medications || [];
    return meds.length > 0 || !!p.prescription_code;
};

const mergeServiceRequestsIntoVisits = (visitsData: any, extraReqs: any[]) => {
    if (!visitsData?.visits) return visitsData;
    if (!extraReqs?.length) return visitsData;

    const byApt: Record<string, any[]> = {};
    extraReqs.forEach(sr => {
        if (!sr.appointment_id) return;
        if (!byApt[sr.appointment_id]) byApt[sr.appointment_id] = [];
        byApt[sr.appointment_id].push(sr);
    });

    const visits = visitsData.visits.map((v: any) => {
        if (v.type !== 'appointment' || !byApt[v.id]) return v;
        const existingIds = new Set((v.service_requests || []).map((s: any) => s.id));
        const merged = [...(v.service_requests || [])];
        byApt[v.id].forEach(sr => {
            if (!existingIds.has(sr.id)) merged.push(sr);
        });
        return { ...v, service_requests: merged };
    });

    return { ...visitsData, visits, total_visits: visits.length };
};

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
            const [visits, serviceReqs] = await Promise.all([
                api.getPatientVisits(user.id),
                api.getPatientServiceRequests(user.id).catch(() => []),
            ]);
            setData(mergeServiceRequestsIntoVisits(visits, serviceReqs));
        } catch (e: any) {
            console.warn(e);
            Alert.alert('خطأ', e.message || 'تعذر تحميل السجلات الطبية');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            load();
        }, [user?.id])
    );

    const openVisitDetail = (visit: any) => {
        setSelectedVisit(visit);
        setShowDetailModal(true);
    };

    const renderVisitCard = ({ item: visit }: { item: any }) => {
        if (visit.type === 'medical_record') {
            return (
                <TouchableOpacity
                    style={styles.visitCard}
                    onPress={() => openVisitDetail(visit)}
                    activeOpacity={0.7}
                >
                    <View style={styles.visitHeader}>
                        <View style={styles.visitDateBadge}>
                            <Ionicons name="document-text-outline" size={14} color="#8B5CF6" />
                            <Text style={[styles.visitDate, { color: '#8B5CF6' }]}>{visit.visit_date}</Text>
                        </View>
                        <Text style={styles.doctorName}>{visit.title}</Text>
                    </View>
                    <Text style={styles.specialization}>{visit.record_type}</Text>
                    {visit.content ? (
                        <View style={styles.complaintBox}>
                            <Text style={styles.complaintText} numberOfLines={3}>
                                {visit.content}
                            </Text>
                        </View>
                    ) : null}
                    <View style={styles.visitFooter}>
                        <View style={styles.badge}>
                            <Ionicons name="folder-open" size={12} color="#8B5CF6" />
                            <Text style={styles.badgeText}>سجل طبي</Text>
                        </View>
                        {visit.uploaded_by ? (
                            <Text style={styles.uploaderText}>بواسطة: {visit.uploaded_by}</Text>
                        ) : null}
                        <Ionicons name="chevron-back" size={18} color={Colors.textMuted} />
                    </View>
                </TouchableOpacity>
            );
        }

        const labRequests = (visit.service_requests || []).filter((r: any) => r.request_type === 'lab');
        const radRequests = (visit.service_requests || []).filter((r: any) => r.request_type === 'radiology');
        const showPrescription = hasPrescription(visit.prescription);

        return (
            <TouchableOpacity
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

                {visit.complaint ? (
                    <View style={styles.complaintBox}>
                        <Text style={styles.complaintLabel}>الشكوى:</Text>
                        <Text style={styles.complaintText} numberOfLines={2}>
                            {visit.complaint}
                        </Text>
                    </View>
                ) : null}

                {(showPrescription || labRequests.length > 0 || radRequests.length > 0) ? (
                    <View style={styles.codesSection}>
                        <Text style={styles.codesSectionTitle}>الرموز والطلبات</Text>
                        {showPrescription && visit.prescription?.prescription_code ? (
                            <View style={styles.codeRow}>
                                <Text style={styles.codeValuePurple}>{visit.prescription.prescription_code}</Text>
                                <View style={styles.codeTypeBadge}>
                                    <Ionicons name="medical" size={12} color="#8B5CF6" />
                                    <Text style={styles.codeTypeTextPurple}>وصفة RX</Text>
                                </View>
                            </View>
                        ) : null}
                        {labRequests.map((req: any) => (
                            <View key={req.id} style={styles.codeRow}>
                                <Text style={styles.codeValueLab}>{req.reference_code || '—'}</Text>
                                <View style={[styles.codeTypeBadge, { backgroundColor: '#0EA5E915' }]}>
                                    <Ionicons name="flask" size={12} color="#0EA5E9" />
                                    <Text style={[styles.codeTypeText, { color: '#0EA5E9' }]}>
                                        تحليل — {req.service_name}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {radRequests.map((req: any) => (
                            <View key={req.id} style={styles.codeRow}>
                                <Text style={styles.codeValueRad}>{req.reference_code || '—'}</Text>
                                <View style={[styles.codeTypeBadge, { backgroundColor: '#8E24AA15' }]}>
                                    <Ionicons name="scan" size={12} color="#8E24AA" />
                                    <Text style={[styles.codeTypeText, { color: '#8E24AA' }]}>
                                        أشعة — {req.service_name}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : null}

                <View style={styles.visitFooter}>
                    {visit.consultation_report && (
                        <View style={styles.badge}>
                            <Ionicons name="document-text" size={12} color="#10B981" />
                            <Text style={styles.badgeText}>تقرير</Text>
                        </View>
                    )}
                    {showPrescription && (
                        <View style={styles.badge}>
                            <Ionicons name="medical" size={12} color="#8B5CF6" />
                            <Text style={styles.badgeText}>وصفة</Text>
                        </View>
                    )}
                    {labRequests.length > 0 && (
                        <View style={styles.badge}>
                            <Ionicons name="flask" size={12} color="#0EA5E9" />
                            <Text style={styles.badgeText}>{labRequests.length} تحليل</Text>
                        </View>
                    )}
                    {radRequests.length > 0 && (
                        <View style={styles.badge}>
                            <Ionicons name="scan" size={12} color="#8E24AA" />
                            <Text style={styles.badgeText}>{radRequests.length} أشعة</Text>
                        </View>
                    )}
                    <Ionicons name="chevron-back" size={18} color={Colors.textMuted} />
                </View>
            </TouchableOpacity>
        );
    };

    const ListHeader = () => (
        <>
            <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <Text style={styles.headerTitle}>📋 سجلاتي الطبية</Text>
                <Text style={styles.headerSub}>تاريخ كامل لجميع زياراتك الطبية</Text>
            </LinearGradient>

            {data ? (
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{data.total_visits || 0}</Text>
                        <Text style={styles.statLabel}>إجمالي السجلات</Text>
                    </View>
                </View>
            ) : null}
        </>
    );

    const visits = data?.visits || [];

    return (
        <View style={styles.container}>
            <FlatList
                data={visits}
                keyExtractor={(item, idx) => `${item.type || 'visit'}-${item.id}-${idx}`}
                renderItem={renderVisitCard}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} size="large" />
                    ) : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>📋</Text>
                            <Text style={styles.emptyText}>لا توجد سجلات طبية بعد</Text>
                            <Text style={styles.emptySubtext}>ستظهر هنا جميع زياراتك وتقاريرك الطبية</Text>
                        </View>
                    )
                }
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); load(); }}
                    />
                }
            />

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
                        <Text style={styles.modalTitle}>
                            {selectedVisit?.type === 'medical_record' ? 'تفاصيل السجل' : 'تفاصيل الزيارة'}
                        </Text>
                    </View>

                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {selectedVisit && (
                            <>
                                {selectedVisit.type === 'medical_record' ? (
                                    <>
                                        <View style={styles.detailSection}>
                                            <Text style={styles.sectionTitle}>معلومات السجل</Text>
                                            <View style={styles.infoCard}>
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.infoValue}>{selectedVisit.title}</Text>
                                                    <Text style={styles.infoLabel}>العنوان</Text>
                                                </View>
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.infoValue}>{selectedVisit.record_type}</Text>
                                                    <Text style={styles.infoLabel}>النوع</Text>
                                                </View>
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.infoValue}>{selectedVisit.visit_date}</Text>
                                                    <Text style={styles.infoLabel}>التاريخ</Text>
                                                </View>
                                                {selectedVisit.uploaded_by ? (
                                                    <View style={styles.infoRow}>
                                                        <Text style={styles.infoValue}>{selectedVisit.uploaded_by}</Text>
                                                        <Text style={styles.infoLabel}>أُضيف بواسطة</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                        {selectedVisit.content ? (
                                            <View style={styles.detailSection}>
                                                <Text style={styles.sectionTitle}>المحتوى</Text>
                                                <View style={styles.contentCard}>
                                                    <Text style={styles.contentText}>{selectedVisit.content}</Text>
                                                </View>
                                            </View>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
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
                                                {selectedVisit.price ? (
                                                    <View style={styles.infoRow}>
                                                        <Text style={styles.infoValue}>
                                                            {selectedVisit.price.toLocaleString()} ل.س
                                                        </Text>
                                                        <Text style={styles.infoLabel}>التكلفة</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>

                                        {selectedVisit.complaint ? (
                                            <View style={styles.detailSection}>
                                                <Text style={styles.sectionTitle}>الشكوى</Text>
                                                <View style={styles.contentCard}>
                                                    <Text style={styles.contentText}>
                                                        {selectedVisit.complaint}
                                                    </Text>
                                                </View>
                                            </View>
                                        ) : null}

                                        {selectedVisit.consultation_report ? (
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
                                                    {selectedVisit.consultation_report.notes ? (
                                                        <>
                                                            <Text style={[styles.reportLabel, { marginTop: 12 }]}>
                                                                ملاحظات:
                                                            </Text>
                                                            <Text style={styles.contentText}>
                                                                {selectedVisit.consultation_report.notes}
                                                            </Text>
                                                        </>
                                                    ) : null}
                                                    {selectedVisit.follow_up ? (
                                                        <>
                                                            <Text style={[styles.reportLabel, { marginTop: 12 }]}>
                                                                المتابعة:
                                                            </Text>
                                                            <Text style={styles.contentText}>
                                                                {selectedVisit.follow_up}
                                                            </Text>
                                                        </>
                                                    ) : null}
                                                </View>
                                            </View>
                                        ) : null}

                                        {hasPrescription(selectedVisit.prescription) ? (
                                            <View style={styles.detailSection}>
                                                <Text style={styles.sectionTitle}>الوصفة الطبية</Text>
                                                <View style={styles.contentCard}>
                                                    {selectedVisit.prescription.prescription_code ? (
                                                        <View style={styles.codeBox}>
                                                            <Text style={styles.codeLabel}>رمز الوصفة:</Text>
                                                            <Text style={styles.codeValue}>
                                                                {selectedVisit.prescription.prescription_code}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                    {(selectedVisit.prescription.medications || []).map((med: any, idx: number) => (
                                                        <View key={idx} style={styles.medItem}>
                                                            <View style={styles.medHeader}>
                                                                <Text style={styles.medName}>
                                                                    {typeof med === 'string' ? med : med.name}
                                                                </Text>
                                                                <Ionicons name="medical" size={16} color="#8B5CF6" />
                                                            </View>
                                                            {typeof med !== 'string' && med.dosage ? (
                                                                <Text style={styles.medDetail}>الجرعة: {med.dosage}</Text>
                                                            ) : null}
                                                            {typeof med !== 'string' && med.duration ? (
                                                                <Text style={styles.medDetail}>المدة: {med.duration}</Text>
                                                            ) : null}
                                                        </View>
                                                    ))}
                                                    {selectedVisit.prescription.notes ? (
                                                        <View style={styles.prescNotes}>
                                                            <Text style={styles.reportLabel}>ملاحظات:</Text>
                                                            <Text style={styles.contentText}>
                                                                {selectedVisit.prescription.notes}
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                        ) : null}

                                        {selectedVisit.service_requests?.length > 0 ? (
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
                                                        {req.notes ? (
                                                            <Text style={styles.serviceNotes}>{req.notes}</Text>
                                                        ) : null}
                                                    </View>
                                                ))}
                                            </View>
                                        ) : null}

                                        {selectedVisit.notes?.length > 0 ? (
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
                                        ) : null}
                                    </>
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
    listContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 16, marginHorizontal: -16 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'right' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 4 },

    statsCard: {
        backgroundColor: Colors.white,
        marginTop: 16,
        borderRadius: BorderRadius.lg,
        padding: 16,
        ...Shadow.small,
    },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 28, fontWeight: '800', color: Colors.primary },
    statLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

    visitCard: {
        backgroundColor: Colors.white,
        borderRadius: BorderRadius.lg,
        padding: 16,
        marginTop: 12,
        ...Shadow.small,
    },
    visitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    visitDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    visitDate: { fontSize: 12, fontWeight: '600', color: Colors.primary },
    doctorName: { fontSize: 16, fontWeight: '800', color: Colors.text, flex: 1, textAlign: 'right', marginRight: 8 },
    specialization: {
        fontSize: 13,
        color: Colors.textSecondary,
        textAlign: 'right',
        marginBottom: 10,
    },

    complaintBox: {
        backgroundColor: Colors.background,
        padding: 10,
        borderRadius: BorderRadius.md,
        marginBottom: 10,
    },
    complaintLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 4 },
    complaintText: { fontSize: 13, color: Colors.text, textAlign: 'right' },

    visitFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 8,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    badgeText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
    uploaderText: { fontSize: 11, color: Colors.textMuted, flex: 1, textAlign: 'right' },

    codesSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: BorderRadius.md,
        padding: 10,
        marginBottom: 10,
        gap: 8,
    },
    codesSectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.textMuted,
        textAlign: 'right',
        marginBottom: 2,
    },
    codeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
    },
    codeTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#8B5CF615',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        flex: 1,
    },
    codeTypeText: { fontSize: 11, fontWeight: '600', textAlign: 'right', flex: 1 },
    codeTypeTextPurple: { fontSize: 11, fontWeight: '600', color: '#8B5CF6' },
    codeValuePurple: { fontSize: 13, fontWeight: '800', color: '#8B5CF6' },
    codeValueLab: { fontSize: 13, fontWeight: '800', color: '#0EA5E9' },
    codeValueRad: { fontSize: 13, fontWeight: '800', color: '#8E24AA' },

    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 24 },
    emptyIcon: { fontSize: 64, marginBottom: 16 },
    emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
    emptySubtext: { fontSize: 13, color: Colors.textMuted, marginTop: 8, textAlign: 'center' },

    modalContainer: { flex: 1, backgroundColor: Colors.white },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background,
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
    modalBody: { flex: 1, paddingHorizontal: 16 },

    detailSection: { marginTop: 20 },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text,
        textAlign: 'right',
        marginBottom: 12,
    },

    infoCard: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: 16,
        gap: 12,
    },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoLabel: { fontSize: 13, color: Colors.textSecondary },
    infoValue: { fontSize: 14, fontWeight: '700', color: Colors.text },

    contentCard: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: 16,
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
        borderRadius: BorderRadius.md,
    },
    healthyText: { fontSize: 15, fontWeight: '700', color: '#10B981' },

    codeBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 12,
        borderRadius: BorderRadius.md,
        marginBottom: 16,
    },
    codeLabel: { fontSize: 13, color: Colors.textSecondary },
    codeValue: { fontSize: 15, fontWeight: '800', color: Colors.primary },

    medItem: {
        backgroundColor: Colors.white,
        padding: 12,
        borderRadius: BorderRadius.md,
        marginBottom: 10,
    },
    medHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    medName: { fontSize: 15, fontWeight: '700', color: Colors.text },
    medDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    prescNotes: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.white },

    serviceCard: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.lg,
        padding: 14,
        marginBottom: 10,
    },
    serviceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    serviceTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        gap: 4,
    },
    serviceTypeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
    serviceName: { fontSize: 15, fontWeight: '700', color: Colors.text },
    refCodeBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: BorderRadius.md,
    },
    refCodeLabel: { fontSize: 12, color: Colors.textSecondary },
    refCodeValue: { fontSize: 14, fontWeight: '800', color: '#F59E0B' },
    serviceNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 8, textAlign: 'right' },

    noteCard: {
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.md,
        padding: 12,
        marginBottom: 8,
    },
    noteText: { fontSize: 13, color: Colors.text, textAlign: 'right', marginBottom: 6 },
    noteDate: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
});
