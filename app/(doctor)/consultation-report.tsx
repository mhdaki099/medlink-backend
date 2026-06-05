import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform, Switch, Modal, KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import {
    LAB_EXAM_OPTIONS,
    RADIOLOGY_EXAM_OPTIONS,
    getExamLabel,
} from '../../src/constants/consultationCatalog';

const param = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

type MedRow = { name: string; dosage: string; duration: string };

type PendingServiceRequest = {
    localId: string;
    request_type: 'lab' | 'radiology';
    service_name: string;
    notes: string;
    exam_id?: string;
};

type PendingPrescription = {
    medications: MedRow[];
    notes: string;
};

export default function ConsultationReportScreen() {
    const params = useLocalSearchParams<{
        appointmentId: string;
        patientId: string;
        patientName: string;
    }>();
    const appointmentId = param(params.appointmentId);
    const patientId = param(params.patientId);
    const patientName = param(params.patientName);
    const router = useRouter();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [isHealthy, setIsHealthy] = useState(false);
    const [conditionSummary, setConditionSummary] = useState('');
    const [notes, setNotes] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [saving, setSaving] = useState(false);

    const [showPrescModal, setShowPrescModal] = useState(false);
    const [medications, setMedications] = useState<MedRow[]>([{ name: '', dosage: '', duration: '' }]);
    const [prescNotes, setPrescNotes] = useState('');
    const [pendingPrescription, setPendingPrescription] = useState<PendingPrescription | null>(null);
    const [savedPrescription, setSavedPrescription] = useState<any | null>(null);

    const [showServiceModal, setShowServiceModal] = useState(false);
    const [serviceType, setServiceType] = useState<'lab' | 'radiology'>('lab');
    const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
    const [customExamName, setCustomExamName] = useState('');
    const [serviceNotes, setServiceNotes] = useState('');

    const [savedReportId, setSavedReportId] = useState<string | null>(null);
    const [serviceRequests, setServiceRequests] = useState<any[]>([]);
    const [pendingServiceRequests, setPendingServiceRequests] = useState<PendingServiceRequest[]>([]);
    const [loadingReport, setLoadingReport] = useState(true);
    const [showSavedSummary, setShowSavedSummary] = useState(false);

    const examOptions = serviceType === 'lab' ? LAB_EXAM_OPTIONS : RADIOLOGY_EXAM_OPTIONS;

    const applyReportToForm = (report: any) => {
        if (!report?.id) return;
        setSavedReportId(report.id);
        setShowSavedSummary(true);
        setIsHealthy(!!report.is_healthy);
        setConditionSummary(report.condition_summary || '');
        setNotes(report.notes || '');
        setFollowUp(report.follow_up || '');
        if (report.service_requests?.length) {
            setServiceRequests(report.service_requests);
            setPendingServiceRequests([]);
        }
        if (report.prescription) {
            setSavedPrescription(report.prescription);
            setPendingPrescription(null);
        }
    };

    const loadExistingReport = useCallback(async () => {
        if (!appointmentId) {
            setLoadingReport(false);
            return;
        }
        setLoadingReport(true);
        try {
            const report = await api.getConsultationByAppointment(appointmentId);
            if (report?.id) applyReportToForm(report);
        } catch {
            // No report yet
        } finally {
            setLoadingReport(false);
        }
    }, [appointmentId]);

    useFocusEffect(
        useCallback(() => {
            loadExistingReport();
        }, [loadExistingReport])
    );

    const resetServiceModal = (type: 'lab' | 'radiology') => {
        setServiceType(type);
        setSelectedExamIds([]);
        setCustomExamName('');
        setServiceNotes('');
    };

    const toggleExam = (id: string) => {
        setSelectedExamIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
        );
    };

    const openServiceModal = (type: 'lab' | 'radiology') => {
        resetServiceModal(type);
        setShowServiceModal(true);
    };

    const addPendingPrescription = () => {
        const validMeds = medications.filter(m => m.name.trim());
        if (!validMeds.length) {
            Alert.alert('تنبيه', 'أضف دواءً واحداً على الأقل، أو اضغط «تخطي» إذا لا توجد وصفة');
            return;
        }
        setPendingPrescription({ medications: validMeds, notes: prescNotes.trim() });
        setShowPrescModal(false);
        setMedications([{ name: '', dosage: '', duration: '' }]);
        setPrescNotes('');
        Alert.alert('✅ تمت الإضافة', 'تمت إضافة الوصفة — سيُولَّد رمز RX عند حفظ التقرير');
    };

    const handleSaveReport = async () => {
        if (!conditionSummary && !isHealthy) {
            Alert.alert('تنبيه', 'يرجى إدخال ملخص الحالة أو تحديد أن المريض بصحة جيدة');
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                appointment_id: appointmentId,
                doctor_id: user?.id,
                patient_id: patientId,
                condition_summary: isHealthy ? 'المريض بصحة جيدة' : conditionSummary,
                is_healthy: isHealthy,
                notes,
                follow_up: followUp,
            };
            if (pendingPrescription?.medications?.length) {
                payload.medications = pendingPrescription.medications;
                payload.prescription_notes = pendingPrescription.notes;
            }
            if (pendingServiceRequests.length) {
                payload.service_requests = pendingServiceRequests.map(p => ({
                    request_type: p.request_type,
                    service_name: p.service_name,
                    notes: p.notes,
                }));
            }
            const report = await api.createConsultationReport(payload);
            const wasUpdate = !!savedReportId;
            applyReportToForm(report);
            const codes: string[] = [];
            if (report.prescription?.prescription_code) codes.push(`وصفة: ${report.prescription.prescription_code}`);
            (report.service_requests || []).forEach((sr: any) => {
                if (sr.reference_code) codes.push(`${sr.request_type === 'lab' ? 'تحليل' : 'أشعة'}: ${sr.reference_code}`);
            });
            Alert.alert(
                '✅ تم حفظ التقرير',
                wasUpdate
                    ? 'تم تحديث التقرير بنجاح'
                    : codes.length
                        ? `تم إنهاء الجلسة.\n\n${codes.join('\n')}`
                        : 'تم إنهاء الجلسة وحفظ التقرير بنجاح',
            );
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل حفظ التقرير');
        } finally {
            setSaving(false);
        }
    };

    const handleAddServiceRequest = () => {
        if (!selectedExamIds.length) {
            Alert.alert('تنبيه', 'يرجى اختيار فحص واحد على الأقل من القائمة');
            return;
        }
        if (selectedExamIds.includes('other') && !customExamName.trim()) {
            Alert.alert('تنبيه', 'يرجى كتابة اسم الفحص في حقل «أخرى»');
            return;
        }
        const newItems: PendingServiceRequest[] = [];
        const ts = Date.now();
        selectedExamIds.forEach((examId, idx) => {
            if (examId === 'other') {
                if (!customExamName.trim()) return;
                newItems.push({
                    localId: `pending_${ts}_${idx}`,
                    request_type: serviceType,
                    service_name: customExamName.trim(),
                    notes: serviceNotes.trim(),
                    exam_id: 'other',
                });
                return;
            }
            newItems.push({
                localId: `pending_${ts}_${idx}`,
                request_type: serviceType,
                service_name: getExamLabel(examOptions, examId),
                notes: serviceNotes.trim(),
                exam_id: examId,
            });
        });
        if (!newItems.length) return;
        setPendingServiceRequests(prev => [...prev, ...newItems]);
        setShowServiceModal(false);
        resetServiceModal(serviceType);
        Alert.alert(
            '✅ تمت الإضافة',
            `تمت إضافة ${newItems.length} ${serviceType === 'lab' ? 'تحليل' : 'أشعة'} — سيُولَّد رمز ${serviceType === 'lab' ? 'LAB' : 'RAD'} لكل فحص عند الحفظ`,
        );
    };

    const removePendingRequest = (localId: string) => {
        setPendingServiceRequests(prev => prev.filter(p => p.localId !== localId));
    };

    const activePrescription = savedPrescription || pendingPrescription;
    const hasOptionalItems =
        !!activePrescription ||
        serviceRequests.length > 0 ||
        pendingServiceRequests.length > 0;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-forward" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>تقرير الاستشارة</Text>
                <View style={{ width: 40 }} />
            </LinearGradient>

            {loadingReport ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator color="#1E88E5" size="large" />
                </View>
            ) : (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
            <ScrollView
                style={styles.content}
                contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 48 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
            >
                {showSavedSummary && savedReportId && (
                    <View style={styles.savedSummaryCard}>
                        <View style={styles.savedSummaryHeader}>
                            <MaterialCommunityIcons name="check-circle" size={28} color="#16A34A" />
                            <Text style={styles.savedSummaryTitle}>تم حفظ التقرير</Text>
                        </View>
                        {isHealthy ? (
                            <Text style={styles.savedSummaryText}>المريض بصحة جيدة</Text>
                        ) : conditionSummary ? (
                            <Text style={styles.savedSummaryText}>{conditionSummary}</Text>
                        ) : null}
                        {savedPrescription?.prescription_code ? (
                            <Text style={styles.codeLine}>رمز الوصفة: {savedPrescription.prescription_code}</Text>
                        ) : null}
                        {serviceRequests.map((sr, i) => (
                            <Text key={sr.id || i} style={styles.codeLine}>
                                رمز {sr.request_type === 'lab' ? 'تحليل' : 'أشعة'}: {sr.reference_code}
                            </Text>
                        ))}
                    </View>
                )}

                <View style={styles.patientCard}>
                    <MaterialCommunityIcons name="account-circle" size={40} color="#1E88E5" />
                    <View style={styles.patientInfo}>
                        <Text style={styles.patientName}>{patientName || 'المريض'}</Text>
                        <Text style={styles.patientSub}>إنهاء الجلسة — تقرير للمريض</Text>
                    </View>
                </View>

                <Text style={[styles.stepLabel, { marginBottom: 10 }]}>الخطوة ١ — التقرير الطبي *</Text>

                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <Switch
                            value={isHealthy}
                            onValueChange={setIsHealthy}
                            trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                            thumbColor={isHealthy ? '#22C55E' : '#9CA3AF'}
                        />
                        <Text style={styles.cardLabel}>المريض بصحة جيدة</Text>
                    </View>
                </View>

                {!isHealthy && (
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>ملخص الحالة *</Text>
                        <TextInput
                            style={styles.textArea}
                            placeholder="اكتب ملخص الحالة الطبية..."
                            value={conditionSummary}
                            onChangeText={setConditionSummary}
                            multiline
                            textAlign="right"
                            textAlignVertical="top"
                        />
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>ملاحظات وتعليمات</Text>
                    <TextInput
                        style={styles.textArea}
                        placeholder="تعليمات للمريض..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        textAlign="right"
                        textAlignVertical="top"
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>موعد المتابعة</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="مثال: بعد أسبوعين"
                        value={followUp}
                        onChangeText={setFollowUp}
                        textAlign="right"
                    />
                </View>

                <View style={styles.card}>
                    <Text style={styles.stepLabel}>الخطوة ٢ — إضافات اختيارية</Text>
                    <Text style={styles.stepHint}>
                        الوصفة والتحليل والأشعة كلها اختيارية — اختر من القوائم (مع خيار أخرى). تُصدر الرموز عند الحفظ مثل الصيدلية.
                    </Text>

                    {hasOptionalItems && (
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryTitle}>ملخص الإضافات</Text>
                            {savedPrescription ? (
                                <View style={styles.summaryRow}>
                                    <MaterialCommunityIcons name="prescription" size={18} color="#8B5CF6" />
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.summaryItem}>
                                            وصفة — {savedPrescription.medications?.length || 0} دواء
                                        </Text>
                                        <Text style={styles.codeSmall}>RX: {savedPrescription.prescription_code}</Text>
                                    </View>
                                </View>
                            ) : pendingPrescription ? (
                                <View style={styles.summaryRow}>
                                    <TouchableOpacity onPress={() => setPendingPrescription(null)}>
                                        <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                    <MaterialCommunityIcons name="prescription" size={18} color="#8B5CF6" />
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.summaryItem}>
                                            وصفة — {pendingPrescription.medications.length} دواء (بانتظار الحفظ)
                                        </Text>
                                        <Text style={styles.codePending}>رمز RX عند الحفظ</Text>
                                    </View>
                                </View>
                            ) : null}
                            {serviceRequests.map((sr, i) => (
                                <View key={sr.id || i} style={styles.summaryRow}>
                                    <MaterialCommunityIcons
                                        name={sr.request_type === 'lab' ? 'flask' : 'radiology-box-outline'}
                                        size={18}
                                        color="#1E88E5"
                                    />
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.summaryItem}>{sr.service_name}</Text>
                                        <Text style={styles.codeSmall}>{sr.reference_code}</Text>
                                    </View>
                                </View>
                            ))}
                            {pendingServiceRequests.map(sr => (
                                <View key={sr.localId} style={styles.summaryRow}>
                                    <TouchableOpacity onPress={() => removePendingRequest(sr.localId)}>
                                        <MaterialCommunityIcons name="close-circle" size={18} color="#94A3B8" />
                                    </TouchableOpacity>
                                    <MaterialCommunityIcons
                                        name={sr.request_type === 'lab' ? 'flask' : 'radiology-box-outline'}
                                        size={18}
                                        color="#0EA5E9"
                                    />
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.summaryItem}>{sr.service_name}</Text>
                                        <Text style={styles.codePending}>
                                            رمز {sr.request_type === 'lab' ? 'LAB' : 'RAD'} عند الحفظ
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => {
                                if (pendingPrescription || savedPrescription) {
                                    Alert.alert('تنبيه', 'يوجد وصفة مضافة بالفعل');
                                    return;
                                }
                                setShowPrescModal(true);
                            }}
                        >
                            <MaterialCommunityIcons name="prescription" size={28} color="#8B5CF6" />
                            <Text style={styles.actionCardText}>وصفة (اختياري)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard} onPress={() => openServiceModal('lab')}>
                            <MaterialCommunityIcons name="flask" size={28} color="#0EA5E9" />
                            <Text style={styles.actionCardText}>تحليل (اختياري)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard} onPress={() => openServiceModal('radiology')}>
                            <MaterialCommunityIcons name="radiology-box-outline" size={28} color="#8E24AA" />
                            <Text style={styles.actionCardText}>أشعة (اختياري)</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.saveSection}>
                    <Text style={styles.stepLabel}>الخطوة ٣ — حفظ التقرير وإنهاء الجلسة</Text>
                    {(pendingPrescription || pendingServiceRequests.length > 0) && !savedReportId ? (
                        <Text style={styles.savePendingNote}>
                            سيتم إصدار رموز RX / LAB / RAD للمريض عند الحفظ
                        </Text>
                    ) : null}
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveReport} disabled={saving}>
                        <LinearGradient colors={['#1E88E5', '#43A047']} style={styles.saveBtnGrad}>
                            {saving ? <ActivityIndicator color="#FFF" /> : (
                                <Text style={styles.saveBtnText}>
                                    {savedReportId ? 'تحديث التقرير' : 'حفظ التقرير وإنهاء الجلسة'}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                    {savedReportId ? (
                        <TouchableOpacity
                            style={styles.doneBtn}
                            onPress={() => router.replace('/(doctor)/appointments' as any)}
                        >
                            <Text style={styles.doneBtnText}>العودة للمواعيد</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </ScrollView>
            </KeyboardAvoidingView>
            )}

            <Modal visible={showPrescModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowPrescModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>وصفة طبية (اختياري)</Text>
                        </View>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                        >
                            {medications.map((m, idx) => (
                                <View key={idx} style={styles.medRow}>
                                    <Text style={styles.medLabel}>دواء {idx + 1}</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="اسم الدواء"
                                        value={m.name}
                                        onChangeText={v => {
                                            const u = [...medications];
                                            u[idx].name = v;
                                            setMedications(u);
                                        }}
                                        textAlign="right"
                                    />
                                    <View style={{ flexDirection: 'row-reverse', gap: 8 }}>
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            placeholder="الجرعة"
                                            value={m.dosage}
                                            onChangeText={v => {
                                                const u = [...medications];
                                                u[idx].dosage = v;
                                                setMedications(u);
                                            }}
                                            textAlign="right"
                                        />
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            placeholder="المدة"
                                            value={m.duration}
                                            onChangeText={v => {
                                                const u = [...medications];
                                                u[idx].duration = v;
                                                setMedications(u);
                                            }}
                                            textAlign="right"
                                        />
                                    </View>
                                </View>
                            ))}
                            <TouchableOpacity
                                style={styles.addMedBtn}
                                onPress={() => setMedications([...medications, { name: '', dosage: '', duration: '' }])}
                            >
                                <Text style={styles.addMedText}>+ إضافة دواء</Text>
                            </TouchableOpacity>
                            <TextInput
                                style={[styles.textArea, { marginTop: 12 }]}
                                placeholder="ملاحظات الوصفة..."
                                value={prescNotes}
                                onChangeText={setPrescNotes}
                                multiline
                                textAlign="right"
                                textAlignVertical="top"
                            />
                            <TouchableOpacity style={styles.skipBtn} onPress={() => setShowPrescModal(false)}>
                                <Text style={styles.skipBtnText}>تخطي — لا وصفة</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={addPendingPrescription}>
                                <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.saveBtnGrad}>
                                    <Text style={styles.saveBtnText}>إضافة للقائمة</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={showServiceModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                                    <Ionicons name="close" size={24} color="#374151" />
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>
                                    {serviceType === 'lab' ? 'طلب تحليل (اختياري)' : 'طلب أشعة (اختياري)'}
                                </Text>
                            </View>
                            <ScrollView
                                showsVerticalScrollIndicator
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                            >
                                <Text style={styles.pickerHint}>
                                    اختر فحصاً أو أكثر — الكتابة فقط عند «أخرى»
                                    {selectedExamIds.length > 0 ? ` (${selectedExamIds.length} محدد)` : ''}
                                </Text>
                                <View style={styles.examGrid}>
                                    {examOptions.map(opt => {
                                        const selected = selectedExamIds.includes(opt.id);
                                        return (
                                            <TouchableOpacity
                                                key={opt.id}
                                                style={[styles.examChip, selected && styles.examChipActive]}
                                                onPress={() => toggleExam(opt.id)}
                                            >
                                                {selected ? (
                                                    <MaterialCommunityIcons name="check-circle" size={14} color="#1E88E5" />
                                                ) : null}
                                                <Text style={[styles.examChipText, selected && styles.examChipTextActive]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {selectedExamIds.includes('other') && (
                                    <TextInput
                                        style={styles.input}
                                        placeholder={serviceType === 'lab' ? 'اكتب اسم التحليل...' : 'اكتب نوع الأشعة...'}
                                        value={customExamName}
                                        onChangeText={setCustomExamName}
                                        textAlign="right"
                                    />
                                )}
                                <TextInput
                                    style={[styles.textArea, { marginTop: 8 }]}
                                    placeholder="ملاحظات إضافية (اختياري)..."
                                    value={serviceNotes}
                                    onChangeText={setServiceNotes}
                                    multiline
                                    textAlign="right"
                                    textAlignVertical="top"
                                />
                            </ScrollView>
                            <TouchableOpacity style={[styles.saveBtn, { marginBottom: insets.bottom || 12 }]} onPress={handleAddServiceRequest}>
                                <LinearGradient
                                    colors={serviceType === 'lab' ? ['#0EA5E9', '#0284C7'] : ['#8E24AA', '#6A1B9A']}
                                    style={styles.saveBtnGrad}
                                >
                                    <Text style={styles.saveBtnText}>
                                        {selectedExamIds.length > 1
                                            ? `إضافة ${selectedExamIds.length} فحوصات`
                                            : 'إضافة للقائمة'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, paddingHorizontal: 20 },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    content: { flex: 1, padding: 16 },
    patientCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, gap: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
    patientInfo: { flex: 1, alignItems: 'flex-end' },
    patientName: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    patientSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#6B7280' },
    card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
    cardRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    cardLabel: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    sectionTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E293B', textAlign: 'right', marginBottom: 10 },
    textArea: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', minHeight: 100, padding: 12, fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#1E293B' },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 14, color: '#1E293B', marginBottom: 8 },
    stepHint: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'right', marginBottom: 14, lineHeight: 18 },
    savePendingNote: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#0369A1', textAlign: 'right', marginBottom: 10 },
    summaryBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
    summaryTitle: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#475569', textAlign: 'right', marginBottom: 10 },
    summaryRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 8 },
    summaryItem: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#1E293B', textAlign: 'right' },
    codeSmall: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#16A34A', textAlign: 'right' },
    codePending: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#0284C7', textAlign: 'right' },
    codeLine: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#15803D', textAlign: 'right', marginTop: 4 },
    actionsGrid: { flexDirection: 'row-reverse', gap: 12, marginBottom: 4 },
    actionCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    actionCardText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#374151', textAlign: 'center' },
    saveSection: { marginBottom: 16, padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 2, borderColor: '#1E88E5', elevation: 4, shadowColor: '#1E88E5', shadowOpacity: 0.15, shadowRadius: 10 },
    stepLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#1E88E5', textAlign: 'right', marginBottom: 12 },
    saveBtn: { height: 54, borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: '#1E88E5', shadowOpacity: 0.3, shadowRadius: 8, marginBottom: 10 },
    saveBtnGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    doneBtn: { height: 54, borderRadius: 16, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' },
    doneBtnText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    skipBtn: { alignItems: 'center', paddingVertical: 12, marginBottom: 8 },
    skipBtnText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
    modalSheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 24,
        maxHeight: '88%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#1E293B' },
    pickerHint: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'right', marginBottom: 12 },
    examGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    examChip: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    examChipActive: { backgroundColor: '#DBEAFE', borderColor: '#1E88E5' },
    examChipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#475569' },
    examChipTextActive: { color: '#1E88E5' },
    medRow: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 12 },
    medLabel: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#6366F1', textAlign: 'right', marginBottom: 6 },
    addMedBtn: { alignItems: 'center', paddingVertical: 10 },
    addMedText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    savedSummaryCard: { backgroundColor: '#ECFDF5', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#86EFAC' },
    savedSummaryHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
    savedSummaryTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: '#15803D' },
    savedSummaryText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#1E293B', textAlign: 'right', lineHeight: 22, marginBottom: 8 },
});
