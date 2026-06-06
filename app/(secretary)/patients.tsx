import React from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import StaffPatientsScreen from '../../src/screens/StaffPatientsScreen';

export default function SecretaryPatients() {
    const { user } = useAuth();
    return (
        <StaffPatientsScreen
            doctorId={user?.supervisor_id}
            headerTitle="مرضى العيادة"
        />
    );
}
