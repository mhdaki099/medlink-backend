import React from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import StaffAppointmentsScreen from '../../src/screens/StaffAppointmentsScreen';

export default function SecretaryHome() {
    const { user } = useAuth();
    return (
        <StaffAppointmentsScreen
            doctorId={user?.supervisor_id}
            newAppointmentPath="/(secretary)/new-appointment"
            showConsultationActions={false}
            headerTitle="إدارة المواعيد"
        />
    );
}
