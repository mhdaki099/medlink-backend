import React from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import StaffPatientsScreen from '../../src/screens/StaffPatientsScreen';

export default function DoctorPatients() {
    const { user } = useAuth();
    return <StaffPatientsScreen doctorId={user?.id} headerTitle="مرضاي" />;
}
