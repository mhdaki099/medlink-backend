import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    SecretaryPermissions,
    SECRETARY_PERMISSION_GROUPS,
    ALL_SECRETARY_PERMISSION_KEYS,
    countEnabledPermissions,
} from '../constants/secretaryPermissions';

type Props = {
    permissions: SecretaryPermissions;
    onChange: (next: SecretaryPermissions) => void;
};

export default function SecretaryPermissionsEditor({ permissions, onChange }: Props) {
    const allSelected = countEnabledPermissions(permissions) === ALL_SECRETARY_PERMISSION_KEYS.length;

    const toggleAll = () => {
        const next = { ...permissions };
        const value = !allSelected;
        for (const key of ALL_SECRETARY_PERMISSION_KEYS) {
            next[key] = value;
        }
        onChange(next);
    };

    const toggleOne = (key: keyof SecretaryPermissions) => {
        onChange({ ...permissions, [key]: !permissions[key] });
    };

    return (
        <View style={styles.wrap}>
            <TouchableOpacity style={styles.selectAllRow} onPress={toggleAll} activeOpacity={0.8}>
                <Switch
                    value={allSelected}
                    onValueChange={toggleAll}
                    trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
                    thumbColor={allSelected ? '#16A34A' : '#F8FAFC'}
                />
                <View style={styles.selectAllText}>
                    <Text style={styles.selectAllTitle}>تحديد الكل</Text>
                    <Text style={styles.selectAllSub}>
                        {countEnabledPermissions(permissions)} / {ALL_SECRETARY_PERMISSION_KEYS.length} صلاحية
                    </Text>
                </View>
                <MaterialCommunityIcons
                    name={allSelected ? 'checkbox-multiple-marked' : 'checkbox-multiple-blank-outline'}
                    size={22}
                    color={allSelected ? '#16A34A' : '#94A3B8'}
                />
            </TouchableOpacity>

            {SECRETARY_PERMISSION_GROUPS.map(group => (
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
                                thumbColor={permissions[item.key] ? '#1E88E5' : '#F8FAFC'}
                            />
                            <Text style={styles.permLabel}>{item.label}</Text>
                            <MaterialCommunityIcons
                                name={permissions[item.key] ? 'check-circle' : 'circle-outline'}
                                size={20}
                                color={permissions[item.key] ? '#1E88E5' : '#CBD5E1'}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { gap: 12 },
    selectAllRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#BBF7D0',
        gap: 12,
    },
    selectAllText: { flex: 1, alignItems: 'flex-end' },
    selectAllTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#166534' },
    selectAllSub: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: '#4ADE80', marginTop: 2 },
    group: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    groupTitle: {
        fontSize: 13,
        fontFamily: 'Cairo_700Bold',
        color: '#475569',
        textAlign: 'right',
        marginBottom: 8,
    },
    permRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 12,
        gap: 10,
        marginBottom: 4,
    },
    permRowOn: { backgroundColor: '#EFF6FF' },
    permLabel: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Cairo_600SemiBold',
        color: '#1E293B',
        textAlign: 'right',
    },
});
