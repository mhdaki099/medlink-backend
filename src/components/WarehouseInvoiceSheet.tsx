import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Share, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ModernSheet from './ModernSheet';

type Promoter = {
    id?: string | null;
    code?: string;
    name?: string;
    phone?: string;
    commission_percent?: number;
    commission_amount?: number;
};

type Invoice = {
    number?: string;
    date?: string;
    order_id?: string;
    purchase_order_number?: string;
    warehouse?: { name?: string; phone?: string; address?: string };
    pharmacy?: { name?: string; phone?: string; address?: string };
    items?: any[];
    subtotal?: number;
    total?: number;
    promoter?: Promoter;
    notes?: string;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    invoice: Invoice | null;
    editable?: boolean;
    promoters?: any[];
    onSave?: (data: any) => Promise<void>;
    saving?: boolean;
};

function calcCommission(total: number, pct: number) {
    return Math.round(total * pct / 100 * 100) / 100;
}

function invoiceText(inv: Invoice): string {
    const promo = inv.promoter;
    const lines = [
        `فاتورة توريد — ${inv.number || ''}`,
        `التاريخ: ${inv.date || ''}`,
        `أمر الشراء: ${inv.purchase_order_number || ''}`,
        `رقم الطلب: ${inv.order_id || ''}`,
        '',
        `المستودع: ${inv.warehouse?.name || ''}`,
        `الصيدلية: ${inv.pharmacy?.name || ''}`,
        '',
        'الأصناف:',
        ...(inv.items || []).map((it: any) =>
            `• ${it.name} × ${it.qty} — ${(it.unit_price || 0).toLocaleString()} ل.س = ${(it.line_total || 0).toLocaleString()} ل.س`
        ),
        '',
        `المجموع: ${(inv.total || 0).toLocaleString()} ل.س`,
        promo?.name ? `المندوب: ${promo.name}${promo.code ? ` (${promo.code})` : ''} — عمولة ${promo.commission_percent ?? 0}% = ${(promo.commission_amount || 0).toLocaleString()} ل.س` : '',
        inv.notes ? `\nملاحظات: ${inv.notes}` : '',
    ];
    return lines.filter(Boolean).join('\n');
}

function invoiceHtml(inv: Invoice): string {
    const promo = inv.promoter;
    const rows = (inv.items || []).map((it: any) => `
        <tr>
            <td>${it.name || ''}</td>
            <td>${it.qty || 0}</td>
            <td>${(it.unit_price || 0).toLocaleString()} ل.س</td>
            <td>${(it.line_total || 0).toLocaleString()} ل.س</td>
        </tr>
    `).join('');
    const promoBlock = promo?.name ? `
        <div class="meta">المندوب: <b>${promo.name}</b>${promo.code ? ` — كود: <b>${promo.code}</b>` : ''} — عمولة ${promo.commission_percent ?? 0}% = ${(promo.commission_amount || 0).toLocaleString()} ل.س</div>
    ` : '';
    return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
    <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{color:#1E88E5;margin-bottom:4px} .meta{color:#555;font-size:14px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #ddd;padding:8px;text-align:right}
        th{background:#f5f5f5}.total{font-size:18px;font-weight:bold;margin-top:16px;color:#EA580C}
        .po{color:#1E88E5;font-weight:bold}
    </style></head><body>
        <h1>فاتورة توريد أدوية</h1>
        <div class="meta">رقم الفاتورة: <b>${inv.number || ''}</b></div>
        <div class="meta">التاريخ: ${inv.date || ''}</div>
        <div class="meta po">أمر الشراء (PO): ${inv.purchase_order_number || ''}</div>
        <div class="meta">رقم الطلب: ${inv.order_id || ''}</div>
        <div class="meta">المستودع: ${inv.warehouse?.name || ''} — ${inv.warehouse?.phone || ''}</div>
        <div class="meta">الصيدلية: ${inv.pharmacy?.name || ''} — ${inv.pharmacy?.phone || ''}</div>
        <table><thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="total">الإجمالي: ${(inv.total || 0).toLocaleString()} ل.س</div>
        ${promoBlock}
        ${inv.notes ? `<p>ملاحظات: ${inv.notes}</p>` : ''}
    </body></html>`;
}

function PromoterPicker({
    promoters,
    selectedPromoterId,
    promoterCodeInput,
    customPercent,
    onCodeChange,
    onApplyCode,
    onSelect,
    onPercentChange,
}: {
    promoters: any[];
    selectedPromoterId: string | null;
    promoterCodeInput: string;
    customPercent: string;
    onCodeChange: (v: string) => void;
    onApplyCode: () => void;
    onSelect: (id: string | null) => void;
    onPercentChange: (v: string) => void;
}) {
    const activePromoters = promoters.filter(p => p.is_active !== false);

    return (
        <View style={pickerStyles.card}>
            <LinearGradient colors={['#6366F1', '#1E88E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={pickerStyles.cardHeader}>
                <MaterialCommunityIcons name="account-tie" size={22} color="#FFF" />
                <Text style={pickerStyles.cardHeaderText}>المندوب / المسوق</Text>
            </LinearGradient>

            <View style={pickerStyles.cardBody}>
                <Text style={pickerStyles.hint}>أدخل كود المندوب أو اختره من القائمة</Text>

                <View style={pickerStyles.codeSearchRow}>
                    <TouchableOpacity style={pickerStyles.codeSearchBtn} onPress={onApplyCode}>
                        <MaterialCommunityIcons name="check" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TextInput
                        style={pickerStyles.codeInput}
                        value={promoterCodeInput}
                        onChangeText={onCodeChange}
                        placeholder="كود المندوب — مثال: P-A1B2"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                        textAlign="right"
                        onSubmitEditing={onApplyCode}
                    />
                    <MaterialCommunityIcons name="barcode" size={18} color="#64748B" />
                </View>

                {activePromoters.length === 0 ? (
                    <View style={pickerStyles.emptyBox}>
                        <MaterialCommunityIcons name="account-off-outline" size={20} color="#94A3B8" />
                        <Text style={pickerStyles.emptyText}>لا يوجد مندوبون — أضفهم من صفحة المندوبين أولاً</Text>
                    </View>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={pickerStyles.chips}>
                        <TouchableOpacity
                            style={[pickerStyles.chip, !selectedPromoterId && pickerStyles.chipActive]}
                            onPress={() => onSelect(null)}
                        >
                            <Text style={[pickerStyles.chipText, !selectedPromoterId && pickerStyles.chipTextActive]}>بدون</Text>
                        </TouchableOpacity>
                        {activePromoters.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={[pickerStyles.chip, selectedPromoterId === p.id && pickerStyles.chipActive]}
                                onPress={() => onSelect(p.id)}
                            >
                                <Text style={[pickerStyles.chipText, selectedPromoterId === p.id && pickerStyles.chipTextActive]}>
                                    {p.name}{p.code ? ` • ${p.code}` : ''} ({p.commission_percent}%)
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                {(selectedPromoterId || promoterCodeInput.trim()) ? (
                    <View style={pickerStyles.percentRow}>
                        <Text style={pickerStyles.percentLbl}>نسبة العمولة %</Text>
                        <TextInput
                            style={pickerStyles.percentInput}
                            value={customPercent}
                            onChangeText={onPercentChange}
                            keyboardType="decimal-pad"
                            textAlign="center"
                        />
                    </View>
                ) : null}
            </View>
        </View>
    );
}

export default function WarehouseInvoiceSheet({ visible, onClose, invoice, editable, promoters = [], onSave, saving }: Props) {
    const [draft, setDraft] = useState<Invoice | null>(invoice);
    const [selectedPromoterId, setSelectedPromoterId] = useState<string | null>(null);
    const [customPercent, setCustomPercent] = useState('');
    const [promoterCodeInput, setPromoterCodeInput] = useState('');

    useEffect(() => {
        setDraft(invoice);
        const p = invoice?.promoter;
        setSelectedPromoterId(p?.id || null);
        setCustomPercent(p?.commission_percent != null ? String(p.commission_percent) : '');
        setPromoterCodeInput(p?.code || '');
    }, [invoice, visible]);

    if (!draft) return null;

    const activePromoters = promoters.filter(p => p.is_active !== false);

    const shareInvoice = async () => {
        try {
            await Share.share({ message: invoiceText(draft), title: `فاتورة ${draft.number}` });
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const printInvoice = async () => {
        try {
            const { uri } = await Print.printToFileAsync({ html: invoiceHtml(draft) });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'فاتورة المستودع' });
            } else {
                Alert.alert('تم', 'تم إنشاء ملف الفاتورة');
            }
        } catch (e: any) { Alert.alert('خطأ', e.message); }
    };

    const applyPromoter = (promoterId: string | null, pctOverride?: string) => {
        setSelectedPromoterId(promoterId);
        if (!promoterId) {
            setDraft(prev => prev ? { ...prev, promoter: {} } : prev);
            setCustomPercent('');
            setPromoterCodeInput('');
            return;
        }
        const p = promoters.find(x => x.id === promoterId);
        if (!p) return;
        const pct = pctOverride !== undefined ? (parseFloat(pctOverride) || 0) : (parseFloat(customPercent) || p.commission_percent || 0);
        setCustomPercent(String(pct));
        const total = draft.total || 0;
        setPromoterCodeInput(p.code || '');
        setDraft(prev => prev ? {
            ...prev,
            promoter: {
                id: p.id,
                code: p.code,
                name: p.name,
                phone: p.phone,
                commission_percent: pct,
                commission_amount: calcCommission(total, pct),
            },
        } : prev);
    };

    const applyPromoterByCode = () => {
        const code = promoterCodeInput.trim().toUpperCase().replace(/\s+/g, '-');
        if (!code) {
            Alert.alert('تنبيه', 'أدخل كود المندوب');
            return;
        }
        const p = activePromoters.find(x => (x.code || '').toUpperCase() === code);
        if (!p) {
            Alert.alert('غير موجود', `لا يوجد مندوب بالكود ${code}`);
            return;
        }
        applyPromoter(p.id);
    };

    const updateItem = (itemId: string, field: string, value: string) => {
        setDraft(prev => {
            if (!prev) return prev;
            const items = (prev.items || []).map(it => {
                if (it.item_id !== itemId) return it;
                const next = { ...it, [field]: field.includes('price') || field === 'unit_price' ? parseFloat(value) || 0 : value };
                if (field === 'unit_price' || field === 'qty') {
                    next.line_total = (parseFloat(next.unit_price) || 0) * (parseInt(next.qty) || 1);
                }
                return next;
            });
            const subtotal = items.reduce((s, it) => s + (it.line_total || 0), 0);
            const promoter = prev.promoter?.id ? {
                ...prev.promoter,
                commission_amount: calcCommission(subtotal, prev.promoter.commission_percent || 0),
            } : prev.promoter;
            return { ...prev, items, subtotal, total: subtotal, promoter };
        });
    };

    const onPercentChange = (v: string) => {
        setCustomPercent(v);
        if (selectedPromoterId) {
            const p = promoters.find(x => x.id === selectedPromoterId);
            if (p) {
                const pct = parseFloat(v) || 0;
                setDraft(prev => prev ? {
                    ...prev,
                    promoter: {
                        id: p.id,
                        code: p.code,
                        name: p.name,
                        phone: p.phone,
                        commission_percent: pct,
                        commission_amount: calcCommission(prev.total || 0, pct),
                    },
                } : prev);
            }
        }
    };

    const handleSave = async () => {
        if (!onSave || !draft) return;
        const payload: any = {
            number: draft.number,
            date: draft.date,
            notes: draft.notes,
            total: draft.total,
            items: (draft.items || []).map(it => ({
                item_id: it.item_id,
                unit_price: it.unit_price,
                qty: it.qty,
                retail_unit_price: it.retail_unit_price,
            })),
        };
        if (selectedPromoterId) {
            payload.promoter_id = selectedPromoterId;
            payload.commission_percent = parseFloat(customPercent) || 0;
        } else if (promoterCodeInput.trim()) {
            payload.promoter_code = promoterCodeInput.trim().toUpperCase().replace(/\s+/g, '-');
            payload.commission_percent = parseFloat(customPercent) || 0;
        } else if (draft.promoter?.name) {
            payload.clear_promoter = true;
        }
        await onSave(payload);
    };

    const lineItems = (draft.items || []).map((it: any) => (
        <View key={it.item_id || it.name} style={styles.lineCard}>
            <Text style={styles.lineName}>{it.name}</Text>
            <View style={styles.lineGrid}>
                <View style={styles.lineCell}>
                    <Text style={styles.cellLbl}>الكمية</Text>
                    {editable ? (
                        <TextInput style={styles.cellInput} value={String(it.qty || '')} keyboardType="numeric"
                            onChangeText={v => updateItem(it.item_id, 'qty', v)} textAlign="center" />
                    ) : (
                        <Text style={styles.cellVal}>{it.qty}</Text>
                    )}
                </View>
                <View style={styles.lineCell}>
                    <Text style={styles.cellLbl}>سعر الجملة</Text>
                    {editable ? (
                        <TextInput style={styles.cellInput} value={String(it.unit_price || '')} keyboardType="numeric"
                            onChangeText={v => updateItem(it.item_id, 'unit_price', v)} textAlign="center" />
                    ) : (
                        <Text style={styles.cellVal}>{(it.unit_price || 0).toLocaleString()}</Text>
                    )}
                </View>
                <View style={styles.lineCell}>
                    <Text style={styles.cellLbl}>سعر البيع</Text>
                    {editable ? (
                        <TextInput style={styles.cellInput} value={String(it.retail_unit_price || '')} keyboardType="numeric"
                            onChangeText={v => updateItem(it.item_id, 'retail_unit_price', v)} textAlign="center" />
                    ) : (
                        <Text style={styles.cellVal}>{it.retail_unit_price ? it.retail_unit_price.toLocaleString() : '—'}</Text>
                    )}
                </View>
            </View>
            <Text style={styles.lineTotal}>إجمالي السطر: {(it.line_total || 0).toLocaleString()} ل.س</Text>
        </View>
    ));

    return (
        <ModernSheet
            visible={visible}
            onClose={onClose}
            title={`فاتورة ${draft.number || ''}`}
            subtitle={`${draft.pharmacy?.name || 'الصيدلية'} ← ${draft.warehouse?.name || 'المستودع'}`}
            icon="file-document-outline"
            iconColors={['#1E88E5', '#6366F1']}
            bodyMaxHeight={Platform.OS === 'ios' ? 520 : 500}
            actions={editable ? [
                { label: 'إلغاء', onPress: onClose, variant: 'secondary' },
                { label: 'حفظ الفاتورة', onPress: handleSave, variant: 'primary', loading: saving },
            ] : [
                { label: 'مشاركة', onPress: shareInvoice, variant: 'secondary' },
                { label: 'طباعة PDF', onPress: printInvoice, variant: 'primary' },
            ]}
        >
            <View style={styles.poBox}>
                <MaterialCommunityIcons name="file-sign" size={18} color="#1E88E5" />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Text style={styles.poLabel}>أمر الشراء (PO)</Text>
                    <Text style={styles.poVal}>{draft.purchase_order_number || '—'}</Text>
                </View>
            </View>

            <View style={styles.fieldRow}>
                <Text style={styles.label}>رقم الفاتورة</Text>
                {editable ? (
                    <TextInput style={styles.input} value={draft.number || ''} onChangeText={v => setDraft(p => p ? { ...p, number: v } : p)} textAlign="right" />
                ) : (
                    <Text style={styles.value}>{draft.number}</Text>
                )}
            </View>
            <View style={styles.fieldRow}>
                <Text style={styles.label}>التاريخ</Text>
                {editable ? (
                    <TextInput style={styles.input} value={draft.date || ''} onChangeText={v => setDraft(p => p ? { ...p, date: v } : p)} textAlign="right" />
                ) : (
                    <Text style={styles.value}>{draft.date}</Text>
                )}
            </View>

            {editable ? (
                <PromoterPicker
                    promoters={promoters}
                    selectedPromoterId={selectedPromoterId}
                    promoterCodeInput={promoterCodeInput}
                    customPercent={customPercent}
                    onCodeChange={setPromoterCodeInput}
                    onApplyCode={applyPromoterByCode}
                    onSelect={applyPromoter}
                    onPercentChange={onPercentChange}
                />
            ) : null}

            <Text style={styles.sectionTitle}>أصناف الفاتورة ({(draft.items || []).length})</Text>
            {lineItems}

            <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>إجمالي الفاتورة</Text>
                <Text style={styles.totalVal}>{(draft.total || 0).toLocaleString()} ل.س</Text>
            </View>

            {draft.promoter?.name ? (
                <View style={styles.commissionBox}>
                    <MaterialCommunityIcons name="account-tie" size={18} color="#F59E0B" />
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.commissionName}>
                            {draft.promoter.name}{draft.promoter.code ? ` — ${draft.promoter.code}` : ''}
                        </Text>
                        <Text style={styles.commissionDetail}>
                            عمولة {draft.promoter.commission_percent ?? 0}% = {(draft.promoter.commission_amount || 0).toLocaleString()} ل.س
                        </Text>
                    </View>
                </View>
            ) : null}

            {editable ? (
                <TextInput
                    style={[styles.notesInput, { marginTop: 8 }]}
                    placeholder="ملاحظات الفاتورة"
                    value={draft.notes || ''}
                    onChangeText={v => setDraft(p => p ? { ...p, notes: v } : p)}
                    textAlign="right"
                    multiline
                />
            ) : draft.notes ? (
                <Text style={styles.notes}>ملاحظات: {draft.notes}</Text>
            ) : null}

            <View style={{ height: 12 }} />
        </ModernSheet>
    );
}

const pickerStyles = StyleSheet.create({
    card: { marginTop: 12, marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: '#6366F140' },
    cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
    cardHeaderText: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#FFF' },
    cardBody: { backgroundColor: '#F8FAFC', padding: 12, gap: 10 },
    hint: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'right' },
    codeSearchRow: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
        backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
        paddingHorizontal: 10, paddingVertical: 6,
    },
    codeInput: { flex: 1, fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: '#0F172A', paddingVertical: 8 },
    codeSearchBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E88E5', alignItems: 'center', justifyContent: 'center' },
    chips: { flexDirection: 'row-reverse', gap: 8, paddingVertical: 2 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0' },
    chipActive: { backgroundColor: '#1E88E518', borderColor: '#1E88E5' },
    chipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    chipTextActive: { color: '#1E88E5' },
    percentRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    percentLbl: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    percentInput: { width: 80, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 8, fontFamily: 'Cairo_700Bold', fontSize: 16, color: '#6366F1' },
    emptyBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 8 },
    emptyText: { flex: 1, fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#94A3B8', textAlign: 'right' },
});

const styles = StyleSheet.create({
    poBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#1E88E512', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1E88E530' },
    poLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    poVal: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    fieldRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    label: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    value: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A' },
    input: { flex: 1, marginRight: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 6, fontFamily: 'Cairo_400Regular' },
    sectionTitle: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A', textAlign: 'right', marginTop: 4, marginBottom: 8 },
    lineCard: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    lineName: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A', textAlign: 'right', marginBottom: 8 },
    lineGrid: { flexDirection: 'row-reverse', gap: 8 },
    lineCell: { flex: 1, alignItems: 'center', gap: 4 },
    cellLbl: { fontSize: 10, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    cellVal: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#0F172A' },
    cellInput: { width: '100%', backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 6, fontFamily: 'Cairo_600SemiBold', fontSize: 12 },
    lineTotal: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', color: '#EA580C', textAlign: 'right', marginTop: 8 },
    totalBox: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E88E512', borderRadius: 14, padding: 14, marginTop: 4 },
    totalLabel: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    totalVal: { fontSize: 18, fontFamily: 'Cairo_700Bold', color: '#EA580C' },
    commissionBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#F59E0B12', borderRadius: 12, padding: 12, marginTop: 8 },
    commissionName: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A' },
    commissionDetail: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#F59E0B' },
    notesInput: { backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 10, minHeight: 60, fontFamily: 'Cairo_400Regular', fontSize: 14 },
    notes: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'right', marginTop: 8 },
});
