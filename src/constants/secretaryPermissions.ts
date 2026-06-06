export type SecretaryPermissionKey =
    | 'appointments_accept'
    | 'appointments_reject'
    | 'appointments_create'
    | 'appointments_edit'
    | 'appointments_remove'
    | 'appointments_respond'
    | 'reports_view'
    | 'reports_edit'
    | 'history_view'
    | 'history_request'
    | 'prescriptions_view'
    | 'prescriptions_create'
    | 'notes_view'
    | 'notes_create'
    | 'analysis_view'
    | 'photos_view'
    | 'call_patient';

export type SecretaryPermissions = Record<SecretaryPermissionKey, boolean>;

export const SECRETARY_PERMISSION_GROUPS: {
    title: string;
    permissions: { key: SecretaryPermissionKey; label: string }[];
}[] = [
    {
        title: 'المواعيد',
        permissions: [
            { key: 'appointments_accept', label: 'تأكيد المواعيد' },
            { key: 'appointments_reject', label: 'رفض المواعيد' },
            { key: 'appointments_create', label: 'إنشاء مواعيد جديدة' },
            { key: 'appointments_edit', label: 'تعديل وإعادة الجدولة' },
            { key: 'appointments_remove', label: 'إلغاء المواعيد' },
            { key: 'appointments_respond', label: 'الرد على طلبات المريض' },
        ],
    },
    {
        title: 'التقارير والسجل',
        permissions: [
            { key: 'reports_view', label: 'عرض تقارير الاستشارة' },
            { key: 'reports_edit', label: 'تعديل التقارير وإنهاء الجلسات' },
            { key: 'history_view', label: 'عرض السجل الطبي والزيارات' },
            { key: 'history_request', label: 'طلب الوصول للسجل' },
        ],
    },
    {
        title: 'الوصفات والملاحظات',
        permissions: [
            { key: 'prescriptions_view', label: 'عرض الوصفات' },
            { key: 'prescriptions_create', label: 'إصدار وصفات طبية' },
            { key: 'notes_view', label: 'عرض ملاحظات المريض' },
            { key: 'notes_create', label: 'إضافة ملاحظات' },
        ],
    },
    {
        title: 'التحاليل والمرفقات',
        permissions: [
            { key: 'analysis_view', label: 'عرض التحاليل والأشعة' },
            { key: 'photos_view', label: 'عرض الصور والمرفقات' },
            { key: 'call_patient', label: 'الاتصال بالمريض' },
        ],
    },
];

export const ALL_SECRETARY_PERMISSION_KEYS: SecretaryPermissionKey[] =
    SECRETARY_PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

export const buildAllPermissions = (enabled = true): SecretaryPermissions =>
    ALL_SECRETARY_PERMISSION_KEYS.reduce((acc, key) => {
        acc[key] = enabled;
        return acc;
    }, {} as SecretaryPermissions);

export const normalizeSecretaryPermissions = (
    raw?: Partial<SecretaryPermissions> | null,
): SecretaryPermissions => {
    if (!raw || Object.keys(raw).length === 0) {
        return buildAllPermissions(true);
    }
    const base = buildAllPermissions(false);
    for (const key of ALL_SECRETARY_PERMISSION_KEYS) {
        if (key in raw) {
            base[key] = !!raw[key];
        }
    }
    return base;
};

export const countEnabledPermissions = (perms: SecretaryPermissions) =>
    ALL_SECRETARY_PERMISSION_KEYS.filter(k => perms[k]).length;
