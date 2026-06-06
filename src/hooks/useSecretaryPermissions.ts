import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    SecretaryPermissionKey,
    SecretaryPermissions,
    buildAllPermissions,
    normalizeSecretaryPermissions,
} from '../constants/secretaryPermissions';

export function useSecretaryPermissions(): {
    isSecretary: boolean;
    permissions: SecretaryPermissions;
    can: (key: SecretaryPermissionKey) => boolean;
} {
    const { user } = useAuth();

    const permissions = useMemo(() => {
        if (!user || user.role !== 'secretary') {
            return buildAllPermissions(true);
        }
        return normalizeSecretaryPermissions(user.secretary_permissions);
    }, [user]);

    const isSecretary = user?.role === 'secretary';

    const can = (key: SecretaryPermissionKey) => {
        if (!isSecretary) return true;
        return !!permissions[key];
    };

    return { isSecretary, permissions, can };
}
