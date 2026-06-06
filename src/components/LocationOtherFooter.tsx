import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LOCATION_OTHER_LABEL } from '../constants/locationPicker';

type Props = {
    placeholder: string;
    onConfirm: (value: string) => void;
};

export default function LocationOtherFooter({ placeholder, onConfirm }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [text, setText] = useState('');

    if (!expanded) {
        return (
            <TouchableOpacity style={styles.otherBtn} onPress={() => setExpanded(true)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="pencil-plus" size={20} color="#1E88E5" />
                <Text style={styles.otherBtnText}>{LOCATION_OTHER_LABEL}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.customBox}>
            <Text style={styles.customLabel}>{placeholder}</Text>
            <TextInput
                style={styles.customInput}
                value={text}
                onChangeText={setText}
                placeholder={placeholder}
                textAlign="right"
                autoFocus
            />
            <View style={styles.customActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setExpanded(false); setText(''); }}>
                    <Text style={styles.cancelText}>إلغاء</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.confirmBtn, !text.trim() && { opacity: 0.5 }]}
                    disabled={!text.trim()}
                    onPress={() => {
                        onConfirm(text.trim());
                        setExpanded(false);
                        setText('');
                    }}
                >
                    <Text style={styles.confirmText}>تأكيد</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    otherBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        marginTop: 8,
    },
    otherBtnText: { fontSize: 15, fontFamily: 'Cairo_700Bold', color: '#1E88E5', flex: 1, textAlign: 'right' },
    customBox: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 8 },
    customLabel: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: '#6B7280', textAlign: 'right', marginBottom: 8 },
    customInput: {
        backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
        height: 48, paddingHorizontal: 14, fontFamily: 'Cairo_400Regular', fontSize: 15, color: '#111827',
    },
    customActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 12 },
    confirmBtn: { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#1E88E5', justifyContent: 'center', alignItems: 'center' },
    confirmText: { fontFamily: 'Cairo_700Bold', color: '#FFF', fontSize: 14 },
    cancelBtn: { paddingHorizontal: 16, height: 44, borderRadius: 12, justifyContent: 'center', backgroundColor: '#F3F4F6' },
    cancelText: { fontFamily: 'Cairo_600SemiBold', color: '#6B7280', fontSize: 14 },
});
