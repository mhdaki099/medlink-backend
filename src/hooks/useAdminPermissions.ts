import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    AdminPermissionKey,
    AdminPermissions,
    normalizeAdminPermissions,
} from '../constants/adminPermissions';

export function useAdminPermissions() {
    const { user } = useAuth();

    const isSuperAdmin = !!user?.is_super_admin
        || user?.admin_tier === 'super_admin'
        || (user?.role === 'admin' && user?.admin_tier !== 'sub_admin');

    const permissions = useMemo<AdminPermissions>(() => {
        if (!user || user.role !== 'admin') return normalizeAdminPermissions(null, false);
        return normalizeAdminPermissions(user.admin_permissions, isSuperAdmin);
    }, [user, isSuperAdmin]);

    const can = (key: AdminPermissionKey) => {
        if (!user || user.role !== 'admin') return false;
        return isSuperAdmin || !!permissions[key];
    };

    const isReady = !!user && user.role === 'admin';

    return { can, permissions, isSuperAdmin, isAdmin: user?.role === 'admin', isReady };
}
