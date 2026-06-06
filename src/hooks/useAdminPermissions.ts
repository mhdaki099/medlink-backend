import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    AdminPermissionKey,
    AdminPermissions,
    normalizeAdminPermissions,
} from '../constants/adminPermissions';

export function useAdminPermissions() {
    const { user } = useAuth();

    const isSuperAdmin = !!user?.is_super_admin || user?.admin_tier === 'super_admin';

    const permissions = useMemo<AdminPermissions>(() => {
        if (!user || user.role !== 'admin') return normalizeAdminPermissions(null, false);
        return normalizeAdminPermissions(user.admin_permissions, isSuperAdmin);
    }, [user, isSuperAdmin]);

    const can = (key: AdminPermissionKey) => isSuperAdmin || !!permissions[key];

    return { can, permissions, isSuperAdmin, isAdmin: user?.role === 'admin' };
}
