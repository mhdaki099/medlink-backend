import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Share, Platform, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ModernSheet from './ModernSheet';

type Promoter = {
    id?: string | null;
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
        promo?.name ? `المندوب: ${promo.name} — عمولة ${promo.commission_percent ?? 0}% = ${(promo.commission_amount || 0).toLocaleString()} ل.س` : '',
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
        <div class="meta">المندوب: <b>${promo.name}</b> — عمولة ${promo.commission_percent ?? 0}% = ${(promo.commission_amount || 0).toLocaleString()} ل.س</div>
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

export default function WarehouseInvoiceSheet({ visible, onClose, invoice, editable, promoters = [], onSave, saving }: Props) {
    const [draft, setDraft] = useState<Invoice | null>(invoice);
    const [selectedPromoterId, setSelectedPromoterId] = useState<string | null>(null);
    const [customPercent, setCustomPercent] = useState('');

    useEffect(() => {
        setDraft(invoice);
        const p = invoice?.promoter;
        setSelectedPromoterId(p?.id || null);
        setCustomPercent(p?.commission_percent != null ? String(p.commission_percent) : '');
    }, [invoice, visible]);

    if (!draft) return null;

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
            return;
        }
        const p = promoters.find(x => x.id === promoterId);
        if (!p) return;
        const pct = pctOverride !== undefined ? (parseFloat(pctOverride) || 0) : (parseFloat(customPercent) || p.commission_percent || 0);
        setCustomPercent(String(pct));
        const total = draft.total || 0;
        setDraft(prev => prev ? {
            ...prev,
            promoter: {
                id: p.id,
                name: p.name,
                phone: p.phone,
                commission_percent: pct,
                commission_amount: calcCommission(total, pct),
            },
        } : prev);
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
        } else if (draft.promoter?.name) {
            payload.clear_promoter = true;
        }
        await onSave(payload);
    };

    const activePromoters = promoters.filter(p => p.is_active !== false);

    return (
        <ModernSheet
            visible={visible}
            onClose={onClose}
            title={`فاتورة ${draft.number || ''}`}
            subtitle={`${draft.pharmacy?.name || 'الصيدلية'} ← ${draft.warehouse?.name || 'المستودع'}`}
            icon="file-document-outline"
            iconColors={['#1E88E5', '#6366F1']}
            actions={editable ? [
                { label: 'إلغاء', onPress: onClose, variant: 'secondary' },
                { label: 'حفظ الفاتورة', onPress: handleSave, variant: 'primary', loading: saving },
            ] : [
                { label: 'مشاركة', onPress: shareInvoice, variant: 'secondary' },
                { label: 'طباعة PDF', onPress: printInvoice, variant: 'primary' },
            ]}
        >
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
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

                {(draft.items || []).map((it: any) => (
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
                ))}

                <View style={styles.totalBox}>
                    <Text style={styles.totalLabel}>إجمالي الفاتورة</Text>
                    <Text style={styles.totalVal}>{(draft.total || 0).toLocaleString()} ل.س</Text>
                </View>

                {editable && (
                    <View style={styles.promoterSection}>
                        <Text style={styles.promoterTitle}>المندوب / المسوق</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoterChips}>
                            <TouchableOpacity
                                style={[styles.promoterChip, !selectedPromoterId && styles.promoterChipActive]}
                                onPress={() => applyPromoter(null)}
                            >
                                <Text style={[styles.promoterChipText, !selectedPromoterId && styles.promoterChipTextActive]}>بدون</Text>
                            </TouchableOpacity>
                            {activePromoters.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.promoterChip, selectedPromoterId === p.id && styles.promoterChipActive]}
                                    onPress={() => applyPromoter(p.id)}
                                >
                                    <Text style={[styles.promoterChipText, selectedPromoterId === p.id && styles.promoterChipTextActive]}>
                                        {p.name} ({p.commission_percent}%)
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {selectedPromoterId ? (
                            <View style={styles.percentRow}>
                                <Text style={styles.label}>نسبة العمولة %</Text>
                                <TextInput
                                    style={[styles.input, { maxWidth: 80 }]}
                                    value={customPercent}
                                    onChangeText={onPercentChange}
                                    keyboardType="decimal-pad"
                                    textAlign="center"
                                />
                            </View>
                        ) : null}
                    </View>
                )}

                {draft.promoter?.name ? (
                    <View style={styles.commissionBox}>
                        <MaterialCommunityIcons name="account-tie" size={18} color="#F59E0B" />
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                            <Text style={styles.commissionName}>{draft.promoter.name}</Text>
                            <Text style={styles.commissionDetail}>
                                عمولة {draft.promoter.commission_percent ?? 0}% = {(draft.promoter.commission_amount || 0).toLocaleString()} ل.س
                            </Text>
                        </View>
                    </View>
                ) : null}

                {editable ? (
                    <TextInput
                        style={[styles.input, { marginTop: 8, minHeight: 60 }]}
                        placeholder="ملاحظات الفاتورة"
                        value={draft.notes || ''}
                        onChangeText={v => setDraft(p => p ? { ...p, notes: v } : p)}
                        textAlign="right"
                        multiline
                    />
                ) : draft.notes ? (
                    <Text style={styles.notes}>ملاحظات: {draft.notes}</Text>
                ) : null}
            </ScrollView>
        </ModernSheet>
    );
}

const styles = StyleSheet.create({
    body: { maxHeight: 400 },
    poBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#1E88E512', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#1E88E530' },
    poLabel: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#64748B' },
    poVal: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: '#1E88E5' },
    fieldRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    label: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    value: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A' },
    input: { flex: 1, marginRight: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 8 : 6, fontFamily: 'Cairo_400Regular' },
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
    promoterSection: { marginTop: 12, gap: 8 },
    promoterTitle: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A', textAlign: 'right' },
    promoterChips: { flexDirection: 'row-reverse', gap: 8, paddingVertical: 4 },
    promoterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    promoterChipActive: { backgroundColor: '#1E88E518', borderColor: '#1E88E5' },
    promoterChipText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#64748B' },
    promoterChipTextActive: { color: '#1E88E5' },
    percentRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
    commissionBox: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#F59E0B12', borderRadius: 12, padding: 12, marginTop: 8 },
    commissionName: { fontSize: 13, fontFamily: 'Cairo_700Bold', color: '#0F172A' },
    commissionDetail: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: '#F59E0B' },
    notes: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#64748B', textAlign: 'right', marginTop: 8 },
});
