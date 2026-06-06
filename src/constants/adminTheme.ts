import { Platform } from 'react-native';

export const ADMIN_THEME = {
    bg: '#F1F5F9',
    surface: '#FFFFFF',
    surfaceMuted: '#F8FAFC',
    primary: '#1E40AF',
    primaryDark: '#0F172A',
    accent: '#3B82F6',
    success: '#059669',
    successBg: '#ECFDF5',
    danger: '#DC2626',
    dangerBg: '#FEF2F2',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    info: '#6366F1',
    infoBg: '#EEF2FF',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    shadow: '#0F172A',
    headerGradient: ['#0F172A', '#1E3A8A', '#2563EB'] as const,
};

export const ADMIN_TAB_BAR_HEIGHT = 70;
export const ADMIN_TAB_BAR_BOTTOM = 20;
export const ADMIN_TAB_CLEARANCE = ADMIN_TAB_BAR_HEIGHT + ADMIN_TAB_BAR_BOTTOM + (Platform.OS === 'ios' ? 34 : 16) + 16;

export const ADMIN_ROLE_META: Record<string, { label: string; icon: string; color: string }> = {
    patient: { label: 'مريض', icon: 'account-heart', color: '#3B82F6' },
    doctor: { label: 'طبيب', icon: 'stethoscope', color: '#059669' },
    pharmacy: { label: 'صيدلية', icon: 'pill', color: '#D97706' },
    lab: { label: 'مختبر', icon: 'flask', color: '#8B5CF6' },
    radiology: { label: 'أشعة', icon: 'radioactive', color: '#7C3AED' },
    warehouse: { label: 'مستودع', icon: 'warehouse', color: '#EC4899' },
    secretary: { label: 'سكرتاريا', icon: 'account-tie', color: '#0EA5E9' },
    admin: { label: 'مدير', icon: 'shield-account', color: '#1E40AF' },
};
