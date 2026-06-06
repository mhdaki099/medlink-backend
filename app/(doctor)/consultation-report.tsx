import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, ActivityIndicator, Platform, Switch, Modal, KeyboardAvoidingView,
    Image, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, BASE_URL } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import {
    LAB_EXAM_OPTIONS,
    RADIOLOGY_EXAM_OPTIONS,
    getExamLabel,
} from '../../src/constants/consultationCatalog';

const param = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

type MedRow = { name: string; dosage: string; duration: string; medicineId?: string };

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

type ReportAttachment = {
    id: string;
    name: string;
    url: string;
    type: 'photo' | 'pdf';
    mime_type?: string;
    uploaded_at?: string;
};

const getFullUrl = (path?: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const root = BASE_URL.replace('/api', '');
    return `${root}${path}`;
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
    const doctorId = user?.role === 'secretary' ? user?.supervisor_id : user?.id;
    const appointmentsHome = user?.role === 'secretary' ? '/(secretary)/' : '/(doctor)/appointments';

    const [isHealthy, setIsHealthy] = useState(false);
    const [conditionSummary, setConditionSummary] = useState('');
    const [notes, setNotes] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [saving, setSaving] = useState(false);

    const [showPrescModal, setShowPrescModal] = useState(false);
    const [medications, setMedications] = useState<MedRow[]>([{ name: '', dosage: '', duration: '' }]);
    const [prescNotes, setPrescNotes] = useState('');
    const [medicineCatalog, setMedicineCatalog] = useState<any[]>([]);
    const [medSearch, setMedSearch] = useState('');
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
    const [editingServiceType, setEditingServiceType] = useState<'lab' | 'radiology' | null>(null);
    const [attachments, setAttachments] = useState<ReportAttachment[]>([]);
    const [uploadingFile, setUploadingFile] = useState(false);

    const examOptions = serviceType === 'lab' ? LAB_EXAM_OPTIONS : RADIOLOGY_EXAM_OPTIONS;

    useEffect(() => {
        api.getAllMedicines().then(setMedicineCatalog).catch(() => setMedicineCatalog([]));
    }, []);

    const filteredMedicines = medicineCatalog.filter(m => {
        if (!medSearch.trim()) return true;
        const q = medSearch.trim();
        return m.name?.includes(q) || m.category?.includes(q);
    }).slice(0, 24);

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
        if (report.attachments?.length) {
            setAttachments(report.attachments);
        }
    };

    const pickPhoto = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('تنبيه', 'يرجى السماح بالوصول للصور');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images' as any,
                quality: 0.85,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            setUploadingFile(true);
            const uploaded = await api.uploadFile(asset.uri, 'photo');
            setAttachments(prev => [...prev, {
                id: `att_${Date.now()}`,
                name: asset.fileName || 'صورة مرفقة',
                url: uploaded.url,
                type: 'photo',
                mime_type: asset.mimeType || 'image/jpeg',
                uploaded_at: new Date().toISOString(),
            }]);
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل رفع الصورة');
        } finally {
            setUploadingFile(false);
        }
    };

    const pickPdf = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            const isPdf = (asset.mimeType || '').includes('pdf') || asset.name?.toLowerCase().endsWith('.pdf');
            setUploadingFile(true);
            const uploaded = await api.uploadFile(asset.uri, isPdf ? 'document' : 'photo');
            setAttachments(prev => [...prev, {
                id: `att_${Date.now()}`,
                name: asset.name || (isPdf ? 'ملف PDF' : 'صورة مرفقة'),
                url: uploaded.url,
                type: isPdf ? 'pdf' : 'photo',
                mime_type: asset.mimeType,
                uploaded_at: new Date().toISOString(),
            }]);
        } catch (e: any) {
            Alert.alert('خطأ', e.message || 'فشل رفع الملف');
        } finally {
            setUploadingFile(false);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => prev.filter(a => a.id !== id));
    };

    const openAttachment = (att: ReportAttachment) => {
        const url = getFullUrl(att.url);
        if (!url) return;
        Linking.openURL(url).catch(() => Alert.alert('تنبيه', 'تعذر فتح الملف'));
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
        setEditingServiceType(null);
        resetServiceModal(type);
        setShowServiceModal(true);
    };

    const openPrescriptionModal = () => {
        setMedSearch('');
        setMedications([{ name: '', dosage: '', duration: '' }]);
        setPrescNotes('');
        setShowPrescModal(true);
    };

    const editPrescription = () => {
        const src = pendingPrescription || savedPrescription;
        if (!src) {
            openPrescriptionModal();
            return;
        }
        const meds = (src.medications || []).map((m: any) => ({
            name: m.name || '',
            dosage: m.dosage || m.strength || '',
            duration: m.duration || m.freq || '',
            medicineId: m.medicine_id,
        }));
        setMedications(meds.length ? meds : [{ name: '', dosage: '', duration: '' }]);
        setPrescNotes(src.notes || '');
        setMedSearch('');
        setShowPrescModal(true);
    };

    const editPendingServices = (type: 'lab' | 'radiology') => {
        const items = pendingServiceRequests.filter(p => p.request_type === type);
        if (!items.length) return;
        setEditingServiceType(type);
        setServiceType(type);
        setSelectedExamIds([...new Set(items.map(i => i.exam_id || 'other'))]);
        const otherItem = items.find(i => i.exam_id === 'other');
        setCustomExamName(otherItem?.service_name || '');
        setServiceNotes(items[0]?.notes || '');
        setShowServiceModal(true);
    };

    const selectCatalogMedicine = (rowIdx: number, med: any) => {
        const u = [...medications];
        u[rowIdx] = {
            name: med.name,
            dosage: med.dosage || med.strength || '',
            duration: u[rowIdx].duration,
            medicineId: med.id,
        };
        setMedications(u);
    };

    const removeMedication = (idx: number) => {
        const next = medications.filter((_, i) => i !== idx);
        setMedications(next.length ? next : [{ name: '', dosage: '', duration: '' }]);
    };

    const addPendingPrescription = () => {
        const validMeds = medications.filter(m => m.name.trim());
        const wasEdit = !!(pendingPrescription || savedPrescription);
        if (!validMeds.length) {
            if (wasEdit) {
                setPendingPrescription(null);
                setSavedPrescription(null);
                setShowPrescModal(false);
                setMedications([{ name: '', dosage: '', duration: '' }]);
                setPrescNotes('');
                setMedSearch('');
                Alert.alert('✅ تم', 'تم حذف الوصفة من الملخص');
                return;
            }
            Alert.alert('تنبيه', 'اختر دواءً واحداً على الأقل من قائمة الأدوية، أو اضغط «تخطي»');
            return;
        }
        setPendingPrescription({ medications: validMeds, notes: prescNotes.trim() });
        if (savedPrescription) setSavedPrescription(null);
        setShowPrescModal(false);
        setMedications([{ name: '', dosage: '', duration: '' }]);
        setPrescNotes('');
        setMedSearch('');
        Alert.alert('✅ تم', wasEdit ? 'تم تحديث الوصفة في الملخص' : 'تمت إضافة الوصفة — سيُولَّد رمز RX عند الحفظ');
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
                doctor_id: doctorId,
                patient_id: patientId,
                condition_summary: isHealthy ? 'المريض بصحة جيدة' : conditionSummary,
                is_healthy: isHealthy,
                notes,
                follow_up: followUp,
                attachments,
            };
            if (pendingPrescription?.medications?.length) {
                payload.medications = pendingPrescription.medications.map(m => ({
                    name: m.name,
                    dosage: m.dosage,
                    duration: m.duration,
                    medicine_id: m.medicineId,
                }));
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
        const wasEdit = !!editingServiceType;
        setPendingServiceRequests(prev => {
            const base = editingServiceType
                ? prev.filter(p => p.request_type !== editingServiceType)
                : prev;
            return [...base, ...newItems];
        });
        setEditingServiceType(null);
        setShowServiceModal(false);
        resetServiceModal(serviceType);
        Alert.alert(
            '✅ تم',
            wasEdit
                ? `تم تحديث ${serviceType === 'lab' ? 'التحاليل' : 'الأشعة'} في الملخص`
                : `تمت إضافة ${newItems.length} ${serviceType === 'lab' ? 'تحليل' : 'أشعة'} — رمز ${serviceType === 'lab' ? 'LAB' : 'RAD'} عند الحفظ`,
        );
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
                        {attachments.length > 0 ? (
                            <Text style={styles.codeLine}>مرفقات: {attachments.length} ملف</Text>
                        ) : null}
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
                    <Text style={styles.sectionTitle}>مرفقات (اختياري)</Text>
                    <Text style={styles.stepHint}>أضف صوراً أو ملفات PDF للتقرير — يمكن للمريض والطبيب الاطلاع عليها لاحقاً</Text>
                    <View style={styles.attachActions}>
                        <TouchableOpacity
                            style={[styles.attachBtn, uploadingFile && { opacity: 0.6 }]}
                            onPress={pickPhoto}
                            disabled={uploadingFile}
                        >
                            <MaterialCommunityIcons name="image-plus" size={22} color="#1E88E5" />
                            <Text style={styles.attachBtnText}>صورة</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.attachBtn, uploadingFile && { opacity: 0.6 }]}
                            onPress={pickPdf}
                            disabled={uploadingFile}
                        >
                            <MaterialCommunityIcons name="file-pdf-box" size={22} color="#DC2626" />
                            <Text style={styles.attachBtnText}>PDF / ملف</Text>
                        </TouchableOpacity>
                    </View>
                    {uploadingFile ? (
                        <View style={styles.uploadingRow}>
                            <ActivityIndicator size="small" color="#1E88E5" />
                            <Text style={styles.uploadingText}>جاري رفع الملف...</Text>
                        </View>
                    ) : null}
                    {attachments.length > 0 ? (
                        <View style={styles.attachList}>
                            {attachments.map(att => (
                                <View key={att.id} style={styles.attachItem}>
                                    <TouchableOpacity onPress={() => removeAttachment(att.id)} style={styles.attachRemove}>
                                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.attachPreview} onPress={() => openAttachment(att)}>
                                        {att.type === 'photo' ? (
                                            <Image source={{ uri: getFullUrl(att.url) }} style={styles.attachThumb} />
                                        ) : (
                                            <View style={styles.pdfThumb}>
                                                <MaterialCommunityIcons name="file-pdf-box" size={28} color="#DC2626" />
                                            </View>
                                        )}
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            <Text style={styles.attachName} numberOfLines={1}>{att.name}</Text>
                                            <Text style={styles.attachType}>{att.type === 'pdf' ? 'PDF' : 'صورة'}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.attachEmpty}>لا توجد مرفقات بعد</Text>
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.stepLabel}>الخطوة ٢ — إضافات اختيارية</Text>
                    <Text style={styles.stepHint}>
                        الوصفة والتحليل والأشعة كلها اختيارية — اختر من القوائم (مع خيار أخرى). تُصدر الرموز عند الحفظ مثل الصيدلية.
                    </Text>

                    {hasOptionalItems && (
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryTitle}>ملخص الإضافات</Text>
                            {(savedPrescription || pendingPrescription) ? (
                                <View style={styles.summaryRow}>
                                    <TouchableOpacity onPress={editPrescription} style={styles.editBtn}>
                                        <Text style={styles.editBtnText}>تعديل</Text>
                                    </TouchableOpacity>
                                    <MaterialCommunityIcons name="prescription" size={18} color="#8B5CF6" />
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.summaryItem}>
                                            وصفة — {(pendingPrescription || savedPrescription).medications?.length || 0} دواء
                                        </Text>
                                        {savedPrescription?.prescription_code ? (
                                            <Text style={styles.codeSmall}>RX: {savedPrescription.prescription_code}</Text>
                                        ) : (
                                            <Text style={styles.codePending}>رمز RX عند الحفظ</Text>
                                        )}
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
                            {pendingServiceRequests.some(p => p.request_type === 'lab') && (
                                <View style={styles.summaryRow}>
                                    <TouchableOpacity onPress={() => editPendingServices('lab')} style={styles.editBtn}>
                                        <Text style={styles.editBtnText}>تعديل</Text>
                                    </TouchableOpacity>
                                    <MaterialCommunityIcons name="flask" size={18} color="#0EA5E9" />
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.summaryItem}>
                                            تحاليل — {pendingServiceRequests.filter(p => p.request_type === 'lab').length} فحص
                                        </Text>
                                        <Text style={styles.codePending}>رمز LAB عند الحفظ</Text>
                                    </View>
                                </View>
                            )}
                            {pendingServiceRequests.some(p => p.request_type === 'radiology') && (
                                <View style={styles.summaryRow}>
                                    <TouchableOpacity onPress={() => editPendingServices('radiology')} style={styles.editBtn}>
                                        <Text style={styles.editBtnText}>تعديل</Text>
                                    </TouchableOpacity>
                                    <MaterialCommunityIcons name="radiology-box-outline" size={18} color="#8E24AA" />
                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <Text style={styles.summaryItem}>
                                            أشعة — {pendingServiceRequests.filter(p => p.request_type === 'radiology').length} فحص
                                        </Text>
                                        <Text style={styles.codePending}>رمز RAD عند الحفظ</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => (pendingPrescription || savedPrescription) ? editPrescription() : openPrescriptionModal()}
                        >
                            <MaterialCommunityIcons name="prescription" size={28} color="#8B5CF6" />
                            <Text style={styles.actionCardText}>
                                {(pendingPrescription || savedPrescription) ? 'تعديل الوصفة' : 'وصفة (اختياري)'}
                            </Text>
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
                            onPress={() => router.replace(appointmentsHome as any)}
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
                            <Text style={styles.pickerHint}>ابحث واختر من أدوية البرنامج — لا إدخال يدوي لاسم الدواء</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="بحث عن دواء..."
                                value={medSearch}
                                onChangeText={setMedSearch}
                                textAlign="right"
                            />
                            {medications.map((m, idx) => (
                                <View key={idx} style={styles.medRow}>
                                    <View style={styles.medRowHeader}>
                                        <Text style={styles.medLabel}>دواء {idx + 1}</Text>
                                        {(medications.length > 1 || m.name.trim()) ? (
                                            <TouchableOpacity
                                                onPress={() => removeMedication(idx)}
                                                style={styles.removeMedBtn}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                <Text style={styles.removeMedText}>حذف</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.medChipScroll}
                                    >
                                        {filteredMedicines.map(med => (
                                            <TouchableOpacity
                                                key={`${idx}-${med.id}`}
                                                style={[styles.medChip, m.medicineId === med.id && styles.medChipActive]}
                                                onPress={() => selectCatalogMedicine(idx, med)}
                                            >
                                                <Text style={[styles.medChipText, m.medicineId === med.id && styles.medChipTextActive]}>
                                                    {med.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="الدواء المختار"
                                        value={m.name}
                                        editable={false}
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
                                            placeholder="المدة / التكرار"
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
                                    <Text style={styles.saveBtnText}>
                                        {(pendingPrescription || savedPrescription) ? 'حفظ التعديل' : 'إضافة للقائمة'}
                                    </Text>
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
                                        {editingServiceType
                                            ? 'حفظ التعديل'
                                            : selectedExamIds.length > 1
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
    editBtn: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    editBtnText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#4F46E5' },
    medChipScroll: { flexDirection: 'row-reverse', gap: 8, paddingBottom: 8 },
    medChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    medChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    medChipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#475569' },
    medChipTextActive: { color: '#FFF' },
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
    medRowHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    medLabel: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#6366F1', textAlign: 'right' },
    removeMedBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: '#FEF2F2',
    },
    removeMedText: { fontSize: 11, fontFamily: 'Cairo_700Bold', color: '#EF4444' },
    addMedBtn: { alignItems: 'center', paddingVertical: 10 },
    addMedText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    savedSummaryCard: { backgroundColor: '#ECFDF5', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#86EFAC' },
    savedSummaryHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 12 },
    savedSummaryTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: '#15803D' },
    savedSummaryText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#1E293B', textAlign: 'right', lineHeight: 22, marginBottom: 8 },
    attachActions: { flexDirection: 'row-reverse', gap: 10, marginBottom: 12 },
    attachBtn: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    attachBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#374151' },
    uploadingRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 10 },
    uploadingText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#1E88E5' },
    attachList: { gap: 10 },
    attachItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    attachRemove: { padding: 4 },
    attachPreview: {
        flex: 1,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    attachThumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#E2E8F0' },
    pdfThumb: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    attachName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#1E293B', maxWidth: 180 },
    attachType: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#64748B', marginTop: 2 },
    attachEmpty: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },
});
