import React from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import StaffAppointmentsScreen from '../../src/screens/StaffAppointmentsScreen';

export default function DoctorAppointments() {
    const { user } = useAuth();
    return (
        <StaffAppointmentsScreen
            doctorId={user?.id}
            newAppointmentPath="/(doctor)/new-appointment"
            consultationReportPath="/(doctor)/consultation-report"
            showConsultationActions
        />
    );
}
