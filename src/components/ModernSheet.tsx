import React from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
    ActivityIndicator, Platform, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Action = {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
    disabled?: boolean;
};

type Props = {
    visible: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: IconName;
    iconColors?: [string, string];
    children?: React.ReactNode;
    actions?: Action[];
};

export default function ModernSheet({
    visible, onClose, title, subtitle, icon = 'information-outline',
    iconColors = ['#1E88E5', '#43A047'], children, actions = [],
}: Props) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
                    <View style={styles.handle} />
                    <LinearGradient colors={iconColors} style={styles.iconCircle}>
                        <MaterialCommunityIcons name={icon} size={32} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.title}>{title}</Text>
                    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                    {children ? (
                        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                            {children}
                        </ScrollView>
                    ) : null}
                    {actions.length > 0 && (
                        <View style={styles.actions}>
                            {actions.map((action, i) => {
                                const isPrimary = action.variant === 'primary' || (!action.variant && i === actions.length - 1);
                                const isDanger = action.variant === 'danger';
                                if (isPrimary) {
                                    return (
                                        <TouchableOpacity
                                            key={action.label}
                                            style={[styles.primaryBtn, (action.loading || action.disabled) && { opacity: 0.7 }]}
                                            onPress={action.onPress}
                                            disabled={action.loading || action.disabled}
                                            activeOpacity={0.88}
                                        >
                                            <LinearGradient colors={isDanger ? ['#EF4444', '#DC2626'] : iconColors} style={styles.primaryGrad}>
                                                {action.loading ? (
                                                    <ActivityIndicator color="#FFF" />
                                                ) : (
                                                    <Text style={styles.primaryText}>{action.label}</Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    );
                                }
                                return (
                                    <TouchableOpacity
                                        key={action.label}
                                        style={styles.secondaryBtn}
                                        onPress={action.onPress}
                                        disabled={action.loading || action.disabled}
                                    >
                                        <Text style={styles.secondaryText}>{action.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(15,23,42,0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        paddingTop: 12,
        maxHeight: '88%',
    },
    handle: {
        width: 44, height: 5, borderRadius: 3,
        backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16,
    },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
        marginBottom: 14,
    },
    title: {
        fontSize: 20, fontFamily: 'Cairo_700Bold', color: '#0F172A',
        textAlign: 'center', marginBottom: 6,
    },
    subtitle: {
        fontSize: 14, fontFamily: 'Cairo_400Regular', color: '#64748B',
        textAlign: 'center', lineHeight: 22, marginBottom: 12,
    },
    body: { maxHeight: 280, marginBottom: 8 },
    actions: { gap: 10, marginTop: 8 },
    primaryBtn: { borderRadius: 16, overflow: 'hidden' },
    primaryGrad: { paddingVertical: 15, alignItems: 'center' },
    primaryText: { color: '#FFF', fontSize: 15, fontFamily: 'Cairo_700Bold' },
    secondaryBtn: {
        borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0',
        paddingVertical: 14, alignItems: 'center', backgroundColor: '#F8FAFC',
    },
    secondaryText: { color: '#475569', fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
});
