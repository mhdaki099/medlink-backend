export type AdminPermissionKey =
    | 'dashboard_view'
    | 'users_view'
    | 'users_create'
    | 'users_edit'
    | 'users_verify'
    | 'users_toggle_active'
    | 'users_feature'
    | 'users_delete'
    | 'registrations_view'
    | 'registrations_approve'
    | 'registrations_reject'
    | 'logs_view'
    | 'sub_admins_manage';

export type AdminPermissions = Record<AdminPermissionKey, boolean>;

export const ADMIN_PERMISSION_GROUPS: {
    title: string;
    permissions: { key: AdminPermissionKey; label: string }[];
}[] = [
    {
        title: 'لوحة القيادة',
        permissions: [{ key: 'dashboard_view', label: 'عرض لوحة القيادة والإحصائيات' }],
    },
    {
        title: 'المستخدمين',
        permissions: [
            { key: 'users_view', label: 'عرض قائمة المستخدمين' },
            { key: 'users_create', label: 'إنشاء مستخدمين جدد' },
            { key: 'users_edit', label: 'تعديل بيانات المستخدمين' },
            { key: 'users_verify', label: 'توثيق الحسابات' },
            { key: 'users_toggle_active', label: 'تفعيل وتعطيل الحسابات' },
            { key: 'users_feature', label: 'تمييز الأطباء والصيدليات' },
            { key: 'users_delete', label: 'تعطيل المستخدمين' },
        ],
    },
    {
        title: 'طلبات التسجيل',
        permissions: [
            { key: 'registrations_view', label: 'عرض طلبات التسجيل' },
            { key: 'registrations_approve', label: 'الموافقة على الطلبات' },
            { key: 'registrations_reject', label: 'رفض الطلبات' },
        ],
    },
    {
        title: 'السجل',
        permissions: [{ key: 'logs_view', label: 'عرض سجل النشاط' }],
    },
];

export const SUB_ADMIN_ONLY_GROUPS: typeof ADMIN_PERMISSION_GROUPS = [
    ...ADMIN_PERMISSION_GROUPS,
    {
        title: 'المدراء',
        permissions: [{ key: 'sub_admins_manage', label: 'إدارة المدراء الفرعيين (المدير الرئيسي فقط)' }],
    },
];

export const ALL_ADMIN_PERMISSION_KEYS: AdminPermissionKey[] =
    SUB_ADMIN_ONLY_GROUPS.flatMap(g => g.permissions.map(p => p.key));

export const buildAllAdminPermissions = (enabled = true): AdminPermissions =>
    ALL_ADMIN_PERMISSION_KEYS.reduce((acc, key) => {
        acc[key] = enabled;
        return acc;
    }, {} as AdminPermissions);

export const normalizeAdminPermissions = (
    raw?: Partial<AdminPermissions> | null,
    isSuperAdmin = false,
): AdminPermissions => {
    if (isSuperAdmin) return buildAllAdminPermissions(true);
    if (!raw || Object.keys(raw).length === 0) return buildAllAdminPermissions(false);
    const base = buildAllAdminPermissions(false);
    for (const key of ALL_ADMIN_PERMISSION_KEYS) {
        if (key in raw) base[key] = !!raw[key];
    }
    return base;
};

export const countEnabledAdminPermissions = (perms: AdminPermissions) =>
    ALL_ADMIN_PERMISSION_KEYS.filter(k => perms[k]).length;

/** Main super admin — cannot be edited or deleted from the users list. */
export const isProtectedSuperAdminUser = (user: {
    role?: string;
    admin_tier?: string | null;
    is_super_admin?: boolean;
}) =>
    !!user?.is_super_admin
    || user?.admin_tier === 'super_admin'
    || (user?.role === 'admin' && user?.admin_tier !== 'sub_admin');
