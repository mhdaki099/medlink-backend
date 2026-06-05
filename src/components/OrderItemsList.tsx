import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function getOrderItemName(item: any): string {
    return item?.medicine?.name || item?.name || item?.medicine_name || 'دواء';
}

type Props = {
    items?: any[];
    compact?: boolean;
};

export default function OrderItemsList({ items = [], compact }: Props) {
    if (!items.length) {
        return (
            <Text style={styles.empty}>لا توجد أصناف في الطلب</Text>
        );
    }

    return (
        <View style={styles.wrap}>
            {items.map((item, idx) => {
                const qty = item.qty ?? item.quantity ?? 1;
                const price = Number(item.price || item.medicine?.price || 0);
                const lineTotal = price * qty;
                return (
                    <View key={`${item.medicine_id || item.id || idx}`} style={[styles.row, compact && styles.rowCompact]}>
                        <View style={styles.rowRight}>
                            <MaterialCommunityIcons name="pill" size={14} color="#1E88E5" style={{ marginLeft: 6 }} />
                            <Text style={styles.name} numberOfLines={2}>{getOrderItemName(item)}</Text>
                        </View>
                        <View style={styles.rowLeft}>
                            <Text style={styles.qty}>×{qty}</Text>
                            <Text style={styles.lineTotal}>{lineTotal.toLocaleString()} ل.س</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 10,
        marginTop: 8,
        marginBottom: 4,
        gap: 6,
    },
    row: {
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F7',
    },
    rowCompact: { paddingVertical: 2 },
    rowRight: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center' },
    rowLeft: { alignItems: 'flex-end', marginLeft: 8 },
    name: { flex: 1, fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#1E293B', textAlign: 'right' },
    qty: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#64748B' },
    lineTotal: { fontSize: 12, fontFamily: 'Cairo_700Bold', color: '#1E88E5', marginTop: 2 },
    empty: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#94A3B8', textAlign: 'right', marginTop: 6 },
});
