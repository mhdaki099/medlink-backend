import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    AdminPermissions,
    ADMIN_PERMISSION_GROUPS,
    ALL_ADMIN_PERMISSION_KEYS,
    countEnabledAdminPermissions,
} from '../constants/adminPermissions';
import { ADMIN_THEME } from '../constants/adminTheme';

type Props = {
    permissions: AdminPermissions;
    onChange: (next: AdminPermissions) => void;
};

export default function AdminPermissionsEditor({ permissions, onChange }: Props) {
    const enabled = countEnabledAdminPermissions(permissions);
    const allSelected = enabled === ALL_ADMIN_PERMISSION_KEYS.length;

    const toggleAll = () => {
        const value = !allSelected;
        const next = { ...permissions };
        for (const key of ALL_ADMIN_PERMISSION_KEYS) {
            if (key !== 'sub_admins_manage') next[key] = value;
        }
        onChange(next);
    };

    const toggleOne = (key: keyof AdminPermissions) => {
        if (key === 'sub_admins_manage') return;
        onChange({ ...permissions, [key]: !permissions[key] });
    };

    return (
        <View style={styles.wrap}>
            <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll} activeOpacity={0.8}>
                <Switch
                    value={allSelected}
                    onValueChange={toggleAll}
                    trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                    thumbColor={allSelected ? ADMIN_THEME.accent : '#F8FAFC'}
                />
                <View style={styles.selectAllText}>
                    <Text style={styles.selectAllTitle}>تحديد الكل</Text>
                    <Text style={styles.selectAllSub}>{enabled} / {ALL_ADMIN_PERMISSION_KEYS.length - 1} صلاحية</Text>
                </View>
            </TouchableOpacity>

            {ADMIN_PERMISSION_GROUPS.map(group => (
                <View key={group.title} style={styles.group}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    {group.permissions.map(item => (
                        <TouchableOpacity
                            key={item.key}
                            style={[styles.permRow, permissions[item.key] && styles.permRowOn]}
                            onPress={() => toggleOne(item.key)}
                            activeOpacity={0.85}
                        >
                            <Switch
                                value={!!permissions[item.key]}
                                onValueChange={() => toggleOne(item.key)}
                                trackColor={{ false: '#E2E8F0', true: '#93C5FD' }}
                                thumbColor={permissions[item.key] ? ADMIN_THEME.accent : '#F8FAFC'}
                            />
                            <Text style={styles.permLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ))}

            <View style={styles.note}>
                <MaterialCommunityIcons name="information-outline" size={16} color={ADMIN_THEME.textMuted} />
                <Text style={styles.noteText}>صلاحية إدارة المدراء الفرعيين محجوزة للمدير الرئيسي فقط</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { marginTop: 8 },
    selectAllRow: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
        backgroundColor: ADMIN_THEME.surfaceMuted, borderRadius: 14, padding: 14, marginBottom: 12,
        borderWidth: 1, borderColor: ADMIN_THEME.border,
    },
    selectAllText: { flex: 1, alignItems: 'flex-end' },
    selectAllTitle: { fontFamily: 'Cairo_700Bold', fontSize: 14, color: ADMIN_THEME.text },
    selectAllSub: { fontFamily: 'Cairo_400Regular', fontSize: 12, color: ADMIN_THEME.textMuted, marginTop: 2 },
    group: { marginBottom: 12 },
    groupTitle: {
        fontFamily: 'Cairo_700Bold', fontSize: 13, color: ADMIN_THEME.accent,
        textAlign: 'right', marginBottom: 8,
    },
    permRow: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6,
        backgroundColor: ADMIN_THEME.surface, borderWidth: 1, borderColor: ADMIN_THEME.borderLight,
    },
    permRowOn: { borderColor: ADMIN_THEME.accent + '40', backgroundColor: ADMIN_THEME.infoBg },
    permLabel: { flex: 1, fontFamily: 'Cairo_600SemiBold', fontSize: 13, color: ADMIN_THEME.text, textAlign: 'right' },
    note: {
        flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
        padding: 12, backgroundColor: ADMIN_THEME.surfaceMuted, borderRadius: 12,
    },
    noteText: { flex: 1, fontFamily: 'Cairo_400Regular', fontSize: 11, color: ADMIN_THEME.textMuted, textAlign: 'right' },
});
