import React from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl,
    ActivityIndicator, TouchableOpacity, Platform, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_THEME, ADMIN_TAB_CLEARANCE } from '../../constants/adminTheme';

type Props = {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    loading?: boolean;
    refreshing?: boolean;
    onRefresh?: () => void;
    headerRight?: React.ReactNode;
    headerLeft?: React.ReactNode;
    scroll?: boolean;
    contentStyle?: ViewStyle;
};

export function AdminSectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
    return (
        <View style={shellStyles.sectionHeader}>
            {action}
            <Text style={shellStyles.sectionTitle}>{title}</Text>
        </View>
    );
}

export function AdminCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
    return <View style={[shellStyles.card, style]}>{children}</View>;
}

export function AdminEmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
    return (
        <View style={shellStyles.empty}>
            <View style={shellStyles.emptyIcon}>
                <MaterialCommunityIcons name={icon as any} size={40} color={ADMIN_THEME.textMuted} />
            </View>
            <Text style={shellStyles.emptyTitle}>{title}</Text>
            {subtitle ? <Text style={shellStyles.emptySub}>{subtitle}</Text> : null}
        </View>
    );
}

export default function AdminShell({
    title,
    subtitle,
    children,
    loading,
    refreshing,
    onRefresh,
    headerRight,
    headerLeft,
    scroll = true,
    contentStyle,
}: Props) {
    const insets = useSafeAreaInsets();
    const bottomPad = ADMIN_TAB_CLEARANCE + insets.bottom * 0;

    const body = loading ? (
        <View style={shellStyles.loader}>
            <ActivityIndicator size="large" color={ADMIN_THEME.accent} />
            <Text style={shellStyles.loaderText}>جاري التحميل...</Text>
        </View>
    ) : (
        <View style={[shellStyles.body, contentStyle]}>{children}</View>
    );

    return (
        <View style={shellStyles.root}>
            <LinearGradient
                colors={[...ADMIN_THEME.headerGradient]}
                style={[shellStyles.header, { paddingTop: insets.top + 12 }]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={shellStyles.headerRow}>
                    <View style={shellStyles.headerSide}>{headerLeft}</View>
                    <View style={shellStyles.headerCenter}>
                        <Text style={shellStyles.headerTitle}>{title}</Text>
                        {subtitle ? <Text style={shellStyles.headerSub}>{subtitle}</Text> : null}
                    </View>
                    <View style={shellStyles.headerSide}>{headerRight}</View>
                </View>
            </LinearGradient>

            {scroll ? (
                <ScrollView
                    style={shellStyles.scroll}
                    contentContainerStyle={{ paddingBottom: bottomPad }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        onRefresh ? (
                            <RefreshControl
                                refreshing={!!refreshing}
                                onRefresh={onRefresh}
                                tintColor={ADMIN_THEME.accent}
                            />
                        ) : undefined
                    }
                >
                    {body}
                </ScrollView>
            ) : (
                <View style={[shellStyles.scroll, { paddingBottom: bottomPad }]}>{body}</View>
            )}
        </View>
    );
}

export function AdminIconButton({
    icon,
    label,
    onPress,
    variant = 'primary',
}: {
    icon: string;
    label?: string;
    onPress: () => void;
    variant?: 'primary' | 'ghost' | 'danger';
}) {
    const bg = variant === 'primary' ? ADMIN_THEME.accent
        : variant === 'danger' ? ADMIN_THEME.dangerBg
            : 'rgba(255,255,255,0.15)';
    const color = variant === 'primary' ? '#FFF'
        : variant === 'danger' ? ADMIN_THEME.danger
            : '#FFF';

    return (
        <TouchableOpacity style={[shellStyles.iconBtn, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.8}>
            <MaterialCommunityIcons name={icon as any} size={18} color={color} />
            {label ? <Text style={[shellStyles.iconBtnText, { color }]}>{label}</Text> : null}
        </TouchableOpacity>
    );
}

const shellStyles = StyleSheet.create({
    root: { flex: 1, backgroundColor: ADMIN_THEME.bg },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: {
        flexDirection: 'row-reverse',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    headerSide: { width: 88, alignItems: 'flex-start' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: {
        fontSize: 22,
        fontFamily: 'Cairo_800ExtraBold',
        color: '#FFF',
        textAlign: 'center',
    },
    headerSub: {
        fontSize: 12,
        fontFamily: 'Cairo_500Medium',
        color: 'rgba(255,255,255,0.75)',
        textAlign: 'center',
        marginTop: 4,
    },
    scroll: { flex: 1 },
    body: { paddingHorizontal: 16, paddingTop: 16 },
    loader: { alignItems: 'center', paddingTop: 80, gap: 12 },
    loaderText: { fontFamily: 'Cairo_600SemiBold', color: ADMIN_THEME.textMuted, fontSize: 14 },
    card: {
        backgroundColor: ADMIN_THEME.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: ADMIN_THEME.borderLight,
        ...Platform.select({
            ios: { shadowColor: ADMIN_THEME.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
            android: { elevation: 2 },
        }),
    },
    sectionHeader: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: 'Cairo_800ExtraBold',
        color: ADMIN_THEME.text,
        textAlign: 'right',
    },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: ADMIN_THEME.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: ADMIN_THEME.border,
    },
    emptyTitle: { fontFamily: 'Cairo_700Bold', fontSize: 16, color: ADMIN_THEME.textSecondary, textAlign: 'center' },
    emptySub: { fontFamily: 'Cairo_400Regular', fontSize: 13, color: ADMIN_THEME.textMuted, textAlign: 'center', marginTop: 6 },
    iconBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    iconBtnText: { fontFamily: 'Cairo_700Bold', fontSize: 12 },
});
