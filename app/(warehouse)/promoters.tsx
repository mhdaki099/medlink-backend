import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, RefreshControl, Alert, Platform, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useSubscreenBottomPadding } from '../../src/constants/layout';

const C = {
    primary: '#1E88E5', accent: '#43A047', success: '#10B981', danger: '#EF4444',
    warning: '#F59E0B', purple: '#6366F1', bg: '#F8FAFC', white: '#FFF',
    text: '#0F172A', textSec: '#64748B', border: '#E2E8F0', muted: '#94A3B8',
};

const COMMISSION_PRESETS = [3, 5, 7, 10, 12, 15, 20];
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function clampPct(v: number) {
    return Math.min(100, Math.max(0, Math.round(v * 10) / 10));
}

function currentYm() {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function shiftMonth(year: number, month: number, delta: number) {
    let m = month + delta;
    let y = year;
    while (m < 1) { m += 12; y -= 1; }
    while (m > 12) { m -= 12; y += 1; }
    return { year: y, month: m };
}

export default function WarehousePromoters() {
    const { user } = useAuth();
    const router = useRouter();
    const bottomPad = useSubscreenBottomPadding();
    const [promoters, setPromoters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', commission_percent: '' });
    const [reportYm, setReportYm] = useState(currentYm);
    const [commissions, setCommissions] = useState<any | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const commissionNum = useMemo(() => {
        const n = parseFloat(form.commission_percent);
        return isNaN(n) ? 0 : clampPct(n);
    }, [form.commission_percent]);

    const loadCommissions = async (ym = reportYm) => {
        try {
            const report = await api.getWarehousePromoterCommissions(ym.year, ym.month);
            setCommissions(report);
        } catch (e) {
            console.warn(e);
            setCommissions(null);
        }
    };

    const load = async () => {
        try {
            const rows = await api.getWarehousePromoters();
            setPromoters(rows.filter((r: any) => r.is_active !== false));
            await loadCommissions();
        } catch (e: any) {
            console.warn(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [user]);

    useEffect(() => { if (!loading) loadCommissions(); }, [reportYm.year, reportYm.month]);

    const commissionByPromoter = useMemo(() => {
        const map: Record<string, any> = {};
        (commissions?.summary || []).forEach((s: any) => {
            if (s.promoter_id) map[s.promoter_id] = s;
        });
        return map;
    }, [commissions]);

    const openAdd = () => {
        setEditing(null);
        setForm({ name: '', phone: '', commission_percent: '5' });
        setShowForm(true);
    };

    const openEdit = (row: any) => {
        setEditing(row);
        setForm({
            name: row.name || '',
            phone: row.phone || '',
            commission_percent: String(row.commission_percent ?? ''),
        });
        setShowForm(true);
    };

    const setCommission = (pct: number) => {
        setForm(f => ({ ...f, commission_percent: String(clampPct(pct)) }));
    };

    const adjustCommission = (delta: number) => {
        setCommission(commissionNum + delta);
    };

    const save = async () => {
        const name = form.name.trim();
        const pct = commissionNum;
        if (!name) { Alert.alert('تنبيه', 'اسم المندوب مطلوب'); return; }
        if (pct < 0 || pct > 100) { Alert.alert('تنبيه', 'نسبة العمولة بين 0 و 100'); return; }
        setSaving(true);
        try {
            const payload = { name, phone: form.phone.trim() || undefined, commission_percent: pct };
            if (editing) {
                await api.updateWarehousePromoter(editing.id, payload);
            } else {
                await api.createWarehousePromoter(payload);
            }
            setShowForm(false);
            load();
        } catch (e: any) {
            Alert.alert('خطأ', e.message);
        } finally {
            setSaving(false);
        }
    };

    const remove = (row: any) => {
        Alert.alert('حذف المندوب', `إزالة ${row.name} من القائمة؟`, [
            { text: 'إلغاء', style: 'cancel' },
            {
                text: 'حذف', style: 'destructive', onPress: async () => {
                    try {
                        await api.deleteWarehousePromoter(row.id);
                        load();
                    } catch (e: any) { Alert.alert('خطأ', e.message); }
                },
            },
        ]);
    };

    const previewInitial = form.name.trim() ? form.name.trim().charAt(0) : '?';

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F172A', '#1E3A5F', C.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
                <View style={styles.headerBlob} />
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-right" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.headerBtn, styles.headerBtnAccent]} onPress={openAdd}>
                        <MaterialCommunityIcons name="account-plus" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.headerTitle}>المندوبون والمسوقون</Text>
                        <Text style={styles.headerSub}>{promoters.length} مندوب • نسب العمولة للفواتير</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: bottomPad }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.howToBox}>
                    <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={C.primary} />
                    <Text style={styles.howToText}>
                        لإضافة المندوب للفاتورة: طلبات الشحن → شحن الطلب → اختر المندوب في الفاتورة → حفظ. تُحسب العمولة = إجمالي الفاتورة × النسبة.
                    </Text>
                </View>

                <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.reportTitle}>تقرير العمولات الشهري</Text>
                        <Text style={styles.reportTotal}>
                            {(commissions?.grand_total_commission || 0).toLocaleString()} ل.س
                        </Text>
                    </View>
                    <View style={styles.monthNav}>
                        <TouchableOpacity
                            style={styles.monthBtn}
                            onPress={() => setReportYm(shiftMonth(reportYm.year, reportYm.month, 1))}
                        >
                            <MaterialCommunityIcons name="chevron-left" size={22} color={C.primary} />
                        </TouchableOpacity>
                        <View style={styles.monthCenter}>
                            <Text style={styles.monthLabel}>{AR_MONTHS[reportYm.month - 1]} {reportYm.year}</Text>
                            <Text style={styles.monthSub}>
                                {commissions?.orders_with_promoter || 0} فاتورة • مبيعات {(commissions?.grand_total_sales || 0).toLocaleString()} ل.س
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.monthBtn}
                            onPress={() => setReportYm(shiftMonth(reportYm.year, reportYm.month, -1))}
                        >
                            <MaterialCommunityIcons name="chevron-right" size={22} color={C.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} size="large" />
                ) : promoters.length === 0 ? (
                    <View style={styles.empty}>
                        <LinearGradient colors={[C.purple + '20', C.primary + '15']} style={styles.emptyIconWrap}>
                            <MaterialCommunityIcons name="account-group-outline" size={48} color={C.purple} />
                        </LinearGradient>
                        <Text style={styles.emptyTitle}>لا يوجد مندوبون بعد</Text>
                        <Text style={styles.emptySub}>أضف مندوباً أو مسوقاً لربطه بفواتير طلبات الصيدليات</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={openAdd} activeOpacity={0.88}>
                            <LinearGradient colors={[C.purple, C.primary]} style={styles.emptyBtnGrad}>
                                <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                                <Text style={styles.emptyBtnText}>إضافة مندوب</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : promoters.map((row: any) => {
                    const monthly = commissionByPromoter[row.id];
                    const isExpanded = expandedId === row.id;
                    return (
                    <View key={row.id} style={styles.card}>
                        <LinearGradient
                            colors={[C.purple + '08', C.primary + '05']}
                            style={styles.cardAccent}
                            start={{ x: 1, y: 0 }}
                            end={{ x: 0, y: 1 }}
                        />
                        <View style={styles.cardTop}>
                            <LinearGradient colors={[C.warning + '30', C.warning + '10']} style={styles.pctBadge}>
                                <Text style={styles.pctVal}>{row.commission_percent ?? 0}%</Text>
                                <Text style={styles.pctLbl}>عمولة</Text>
                            </LinearGradient>
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.cardName}>{row.name}</Text>
                                {row.phone ? (
                                    <View style={styles.phoneRow}>
                                        <Text style={styles.phoneText}>{row.phone}</Text>
                                        <MaterialCommunityIcons name="phone-outline" size={13} color={C.textSec} />
                                    </View>
                                ) : (
                                    <Text style={styles.noPhone}>بدون رقم هاتف</Text>
                                )}
                            </View>
                            <LinearGradient colors={[C.purple, C.primary]} style={styles.avatar}>
                                <Text style={styles.avatarLetter}>{(row.name || '?').charAt(0)}</Text>
                            </LinearGradient>
                        </View>

                        <TouchableOpacity
                            style={styles.monthlyRow}
                            onPress={() => setExpandedId(isExpanded ? null : row.id)}
                            activeOpacity={0.85}
                        >
                            <MaterialCommunityIcons
                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={C.muted}
                            />
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={styles.monthlyLabel}>عمولة {AR_MONTHS[reportYm.month - 1]}</Text>
                                <Text style={styles.monthlyVal}>
                                    {(monthly?.total_commission || 0).toLocaleString()} ل.س
                                    {monthly?.orders_count ? ` • ${monthly.orders_count} فاتورة` : ' • لا فواتير'}
                                </Text>
                            </View>
                            <MaterialCommunityIcons name="cash-multiple" size={18} color={C.success} />
                        </TouchableOpacity>

                        {isExpanded && monthly?.orders?.length > 0 && (
                            <View style={styles.ordersBreakdown}>
                                {monthly.orders.map((o: any) => (
                                    <View key={o.order_id} style={styles.orderLine}>
                                        <Text style={styles.orderCommission}>{o.commission_amount.toLocaleString()} ل.س</Text>
                                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                            <Text style={styles.orderPharmacy}>{o.pharmacy_name}</Text>
                                            <Text style={styles.orderMeta}>
                                                {o.purchase_order_number || o.invoice_number} • {o.commission_percent}%
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                        {isExpanded && (!monthly?.orders?.length) && (
                            <Text style={styles.noOrdersHint}>لا توجد فواتير مرتبطة بهذا المندوب هذا الشهر</Text>
                        )}

                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(row)}>
                                <MaterialCommunityIcons name="pencil-outline" size={16} color={C.primary} />
                                <Text style={styles.editBtnText}>تعديل</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.delBtn} onPress={() => remove(row)}>
                                <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>
                );})}
            </ScrollView>

            <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
                <Pressable style={styles.overlay} onPress={() => setShowForm(false)}>
                    <Pressable style={styles.formSheet} onPress={e => e.stopPropagation()}>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.formHandle} />

                            <LinearGradient colors={[C.purple, C.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.formHero}>
                                <View style={styles.formHeroBlob} />
                                <View style={styles.formHeroIcon}>
                                    <MaterialCommunityIcons name={editing ? 'account-edit' : 'account-plus'} size={28} color="#FFF" />
                                </View>
                                <Text style={styles.formHeroTitle}>{editing ? 'تعديل المندوب' : 'مندوب جديد'}</Text>
                                <Text style={styles.formHeroSub}>يُربط تلقائياً بفواتير طلبات الصيدليات</Text>
                            </LinearGradient>

                            <View style={styles.previewCard}>
                                <LinearGradient colors={[C.purple, C.primary]} style={styles.previewAvatar}>
                                    <Text style={styles.previewAvatarText}>{previewInitial}</Text>
                                </LinearGradient>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text style={styles.previewName}>{form.name.trim() || 'اسم المندوب'}</Text>
                                    <Text style={styles.previewPhone}>{form.phone.trim() || 'رقم الهاتف (اختياري)'}</Text>
                                </View>
                                <View style={styles.previewPct}>
                                    <Text style={styles.previewPctVal}>{commissionNum}%</Text>
                                    <Text style={styles.previewPctLbl}>عمولة</Text>
                                </View>
                            </View>

                            <Text style={styles.fieldLabel}>اسم المندوب / المسوق *</Text>
                            <View style={styles.inputWrap}>
                                <MaterialCommunityIcons name="account-tie" size={20} color={C.muted} />
                                <TextInput
                                    style={styles.input}
                                    value={form.name}
                                    onChangeText={v => setForm(f => ({ ...f, name: v }))}
                                    placeholder="مثال: أحمد محمد"
                                    placeholderTextColor={C.muted}
                                    textAlign="right"
                                />
                            </View>

                            <Text style={styles.fieldLabel}>رقم الهاتف</Text>
                            <View style={styles.inputWrap}>
                                <MaterialCommunityIcons name="phone-outline" size={20} color={C.muted} />
                                <TextInput
                                    style={styles.input}
                                    value={form.phone}
                                    onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                                    placeholder="09xxxxxxxx"
                                    placeholderTextColor={C.muted}
                                    keyboardType="phone-pad"
                                    textAlign="right"
                                />
                            </View>

                            <View style={styles.commissionHeader}>
                                <Text style={styles.fieldLabel}>نسبة العمولة</Text>
                                <Text style={styles.commissionHint}>من إجمالي الفاتورة</Text>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
                                {COMMISSION_PRESETS.map(p => {
                                    const active = commissionNum === p;
                                    return (
                                        <TouchableOpacity
                                            key={p}
                                            style={[styles.presetChip, active && styles.presetChipActive]}
                                            onPress={() => setCommission(p)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={[styles.presetText, active && styles.presetTextActive]}>{p}%</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            <View style={styles.stepperBox}>
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustCommission(-1)} activeOpacity={0.8}>
                                    <MaterialCommunityIcons name="minus" size={22} color={C.primary} />
                                </TouchableOpacity>
                                <View style={styles.stepperCenter}>
                                    <TextInput
                                        style={styles.stepperInput}
                                        value={form.commission_percent}
                                        onChangeText={v => setForm(f => ({ ...f, commission_percent: v }))}
                                        keyboardType="decimal-pad"
                                        textAlign="center"
                                    />
                                    <Text style={styles.stepperUnit}>%</Text>
                                </View>
                                <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustCommission(1)} activeOpacity={0.8}>
                                    <MaterialCommunityIcons name="plus" size={22} color={C.primary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.exampleBox}>
                                <MaterialCommunityIcons name="calculator-variant-outline" size={20} color={C.purple} />
                                <Text style={styles.exampleText}>
                                    مثال: فاتورة 500,000 ل.س → عمولة {(500000 * commissionNum / 100).toLocaleString()} ل.س
                                </Text>
                            </View>

                            <View style={styles.tipBox}>
                                <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={C.warning} />
                                <Text style={styles.tipText}>اختر المندوب عند تعديل الفاتورة بعد شحن الطلب</Text>
                            </View>

                            <View style={styles.formBtns}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                                    <Text style={styles.cancelText}>إلغاء</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, saving && { opacity: 0.75 }]}
                                    onPress={save}
                                    disabled={saving}
                                    activeOpacity={0.88}
                                >
                                    <LinearGradient colors={[C.purple, C.primary]} style={styles.saveBtnGrad}>
                                        {saving ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name={editing ? 'content-save' : 'account-check'} size={20} color="#FFF" />
                                                <Text style={styles.saveText}>{editing ? 'حفظ التعديل' : 'إضافة المندوب'}</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: 20, paddingHorizontal: 16, overflow: 'hidden' },
    headerBlob: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)', top: -20, left: -10 },
    headerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
    headerBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    headerBtnAccent: { backgroundColor: C.purple },
    headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    headerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    list: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
    howToBox: {
        flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10,
        backgroundColor: C.primary + '10', borderRadius: 14, padding: 12,
        marginBottom: 12, borderWidth: 1, borderColor: C.primary + '25',
    },
    howToText: { flex: 1, fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right', lineHeight: 20 },
    reportCard: {
        backgroundColor: C.white, borderRadius: 18, padding: 14, marginBottom: 14,
        borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
    },
    reportHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    reportTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text },
    reportTotal: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.success },
    monthNav: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    monthBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
    monthCenter: { flex: 1, alignItems: 'center' },
    monthLabel: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text },
    monthSub: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec, marginTop: 2 },
    monthlyRow: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
        marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    },
    monthlyLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec },
    monthlyVal: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: C.success, marginTop: 2 },
    ordersBreakdown: { marginTop: 8, gap: 6 },
    orderLine: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
        backgroundColor: C.bg, borderRadius: 10, padding: 10,
    },
    orderCommission: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: C.warning, minWidth: 72, textAlign: 'left' },
    orderPharmacy: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.text },
    orderMeta: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: C.textSec, marginTop: 2 },
    noOrdersHint: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.muted, textAlign: 'right', marginTop: 8 },
    empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24, gap: 10 },
    emptyIconWrap: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    emptyTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: C.text },
    emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'center', lineHeight: 22 },
    emptyBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
    emptyBtnGrad: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
    emptyBtnText: { fontFamily: 'Cairo_700Bold', color: '#FFF', fontSize: 15 },
    card: { backgroundColor: C.white, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, elevation: 3 },
    cardAccent: { position: 'absolute', top: 0, right: 0, width: 4, height: '100%' },
    cardTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
    avatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    avatarLetter: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    cardName: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.text },
    phoneRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 3 },
    phoneText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec },
    noPhone: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.muted, marginTop: 3 },
    pctBadge: { alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, minWidth: 68 },
    pctVal: { fontSize: 17, fontFamily: 'Cairo_700Bold', color: C.warning },
    pctLbl: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: C.textSec },
    cardActions: { flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
    editBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: C.primary + '12' },
    editBtnText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: C.primary },
    delBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.danger + '12', alignItems: 'center', justifyContent: 'center' },

    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    formSheet: {
        backgroundColor: C.white,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '92%',
        paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    },
    formHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.border, alignSelf: 'center', marginTop: 12, marginBottom: 0 },
    formHero: { marginHorizontal: 16, marginTop: 16, borderRadius: 20, padding: 20, alignItems: 'center', overflow: 'hidden' },
    formHeroBlob: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)', top: -30, right: -20 },
    formHeroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    formHeroTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    formHeroSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' },

    previewCard: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
        marginHorizontal: 16, marginTop: 16, marginBottom: 4,
        backgroundColor: C.bg, borderRadius: 18, padding: 14,
        borderWidth: 1, borderColor: C.border,
    },
    previewAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    previewAvatarText: { fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    previewName: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: C.text },
    previewPhone: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: C.textSec, marginTop: 2 },
    previewPct: { alignItems: 'center', backgroundColor: C.warning + '18', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    previewPctVal: { fontSize: 16, fontFamily: 'Cairo_700Bold', color: C.warning },
    previewPctLbl: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: C.textSec },

    fieldLabel: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: C.text, textAlign: 'right', marginBottom: 6, marginTop: 14, marginHorizontal: 16 },
    inputWrap: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
        marginHorizontal: 16, backgroundColor: C.bg, borderRadius: 16,
        borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 4 : 2,
    },
    input: { flex: 1, paddingVertical: 12, fontSize: 15, fontFamily: 'Cairo_400Regular', color: C.text },

    commissionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 14 },
    commissionHint: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.muted },

    presetRow: { flexDirection: 'row-reverse', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
    presetChip: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
        backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    },
    presetChipActive: { backgroundColor: C.purple, borderColor: C.purple },
    presetText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: C.textSec },
    presetTextActive: { color: '#FFF' },

    stepperBox: {
        flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 16,
        marginHorizontal: 16, marginTop: 4, backgroundColor: C.bg, borderRadius: 18,
        padding: 12, borderWidth: 1, borderColor: C.border,
    },
    stepperBtn: {
        width: 48, height: 48, borderRadius: 14, backgroundColor: C.white,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: C.primary + '40',
    },
    stepperCenter: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 2, minWidth: 100, justifyContent: 'center' },
    stepperInput: { fontSize: 32, fontFamily: 'Cairo_700Bold', color: C.purple, minWidth: 60, padding: 0 },
    stepperUnit: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: C.textSec },

    exampleBox: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
        marginHorizontal: 16, marginTop: 12, backgroundColor: C.purple + '10',
        borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.purple + '25',
    },
    exampleText: { flex: 1, fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: C.purple, textAlign: 'right', lineHeight: 20 },

    tipBox: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
        marginHorizontal: 16, marginTop: 10, paddingHorizontal: 4,
    },
    tipText: { flex: 1, fontSize: 11, fontFamily: 'Cairo_400Regular', color: C.textSec, textAlign: 'right' },

    formBtns: { flexDirection: 'row-reverse', gap: 10, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
    cancelBtn: {
        flex: 1, borderRadius: 16, borderWidth: 1.5, borderColor: C.border,
        paddingVertical: 15, alignItems: 'center', backgroundColor: C.bg,
    },
    cancelText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', color: C.textSec },
    saveBtn: { flex: 2, borderRadius: 16, overflow: 'hidden' },
    saveBtnGrad: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
    saveText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#FFF' },
});
