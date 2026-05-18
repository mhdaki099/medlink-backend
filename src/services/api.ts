import { Platform } from 'react-native';

/** Set EXPO_PUBLIC_API_URL (e.g. https://xxx.loca.lt/api) when the backend is tunneled for Expo Go. */
export const BASE_URL =
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
    'https://medlink-backend-2e7a.onrender.com/api';

class ApiClient {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T>(
        method: string,
        path: string,
        body?: any
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'MedLinkMobileApp/1.0'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        console.log(`[API] ${method} ${BASE_URL}${path}`);
        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            const text = await res.text();
            let errDetail = 'Network error';
            try {
                const json = JSON.parse(text);
                errDetail = json.detail || JSON.stringify(json);
            } catch (e) {
                errDetail = text.substring(0, 100) || `HTTP ${res.status}`;
            }
            console.error(`[API ERROR] ${res.status}:`, errDetail);
            throw new Error(errDetail);
        }
        return res.json();
    }

    get<T>(path: string) { return this.request<T>('GET', path); }
    post<T>(path: string, body: any) { return this.request<T>('POST', path, body); }
    put<T>(path: string, body: any) { return this.request<T>('PUT', path, body); }
    delete<T>(path: string) { return this.request<T>('DELETE', path); }

    // ── Auth ─────────────────────────────────────────────────────────────────
    login(email: string, password: string) {
        return this.post<{ access_token: string; user: any }>('/auth/login', { email, password });
    }
    register(data: any) {
        return this.post<{ access_token?: string; user?: any; status?: string; message?: string }>('/auth/register', data);
    }

    async uploadFile(uri: string, type: 'photo' | 'document') {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'upload';
        const match = /\.(\w+)$/.exec(filename);
        const fileExt = match ? match[1] : 'jpg';
        const fileType = fileExt === 'pdf' ? 'application/pdf' : `image/${fileExt}`;

        // React Native FormData require an object with uri, name, type
        formData.append('file', {
            uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
            name: filename,
            type: fileType,
        } as any);

        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Bypass-Tunnel-Reminder': 'true',
            'ngrok-skip-browser-warning': 'true',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const res = await fetch(`${BASE_URL}/auth/upload?type=${type}`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || 'Upload failed');
        }
        return res.json();
    }

    // ── Doctors ──────────────────────────────────────────────────────────────
    getDoctors(specialization?: string) {
        const q = specialization ? `?specialization=${encodeURIComponent(specialization)}` : '';
        return this.get<any[]>(`/doctors${q}`);
    }
    getDoctor(id: string, patientId?: string) {
        const q = patientId ? `?patient_id=${patientId}` : '';
        return this.get<any>(`/doctors/${id}${q}`);
    }
    toggleDoctorFavorite(id: string, patientId: string) {
        return this.post<{ is_favorite: boolean }>(`/doctors/${id}/favorite?patient_id=${patientId}`, {});
    }
    getDoctorFavorites(patientId: string) {
        return this.get<any[]>(`/doctors/favorites/${patientId}`);
    }
    getDoctorAvailability(id: string) { return this.get<any>(`/doctors/${id}/availability`); }
    getSpecializations() { return this.get<any[]>('/doctors/specializations'); }
    addDoctorReview(id: string, data: { patient_id: string; rating: number; comment?: string }) {
        return this.post<any>(`/doctors/${id}/reviews`, data);
    }
    updateDoctorProfile(id: string, data: any) {
        return this.put<any>(`/doctors/${id}/profile`, data);
    }
    getDoctorAnalytics(id: string) { return this.get<any>(`/doctors/${id}/analytics`); }
    getSecretaries(doctorId: string) { return this.get<any[]>(`/doctors/secretaries?doctor_id=${doctorId}`); }
    addSecretary(doctorId: string, data: any) {
        return this.post<any>(`/doctors/secretary?doctor_id=${doctorId}`, data);
    }
    addPrescription(doctorId: string, patientId: string, medications: any[], notes: string) {
        return this.post<any>(`/doctors/prescription?doctor_id=${doctorId}&patient_id=${patientId}`, {
            medications,
            notes
        });
    }
    addPatientNote(doctorId: string, patientId: string, noteText: string) {
        return this.post<any>(`/doctors/notes?doctor_id=${doctorId}&patient_id=${patientId}&note_text=${encodeURIComponent(noteText)}`, {});
    }
    getPatientNotes(doctorId: string, patientId: string) {
        return this.get<any[]>(`/doctors/notes/${patientId}?doctor_id=${doctorId}`);
    }

    // ── Pharmacies & Medicines ───────────────────────────────────────────────
    getPharmacies() { return this.get<any[]>('/pharmacies'); }
    getPharmacy(id: string) { return this.get<any>(`/pharmacies/${id}`); }
    getPharmacyAnalytics(id: string) { return this.get<any>(`/pharmacies/${id}/analytics`); }
    getPharmacyMedicines(id: string, category?: string) {
        const q = category ? `?category=${encodeURIComponent(category)}` : '';
        return this.get<any[]>(`/pharmacies/${id}/medicines${q}`);
    }
    getAllMedicines(category?: string) {
        const q = category ? `?category=${encodeURIComponent(category)}` : '';
        return this.get<any[]>(`/pharmacies/medicines/all${q}`);
    }
    addMedicine(data: any) { return this.post<any>('/pharmacies/medicines', data); }
    updateMedicine(id: string, data: any) { return this.put<any>(`/pharmacies/medicines/${id}`, data); }
    deleteMedicine(id: string) { return this.delete<any>(`/pharmacies/medicines/${id}`); }
    async uploadMedicineExcel(pharmacyId: string, asset: { uri: string; name?: string }) {
        const formData = new FormData();
        formData.append('file', {
            uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
            name: asset.name || 'medicines.xlsx',
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as any);
        const headers: Record<string, string> = { 'Accept': 'application/json', 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        const res = await fetch(`${BASE_URL}/pharmacies/medicines/upload-excel?pharmacy_id=${pharmacyId}`, { method: 'POST', headers, body: formData });
        if (!res.ok) throw new Error(await res.text() || 'Upload failed');
        return res.json();
    }

    toggleMedicineFavorite(id: string, patientId: string) {
        return this.post<{ is_favorite: boolean }>(`/pharmacies/medicines/${id}/favorite?patient_id=${patientId}`, {});
    }
    getMedicineFavorites(patientId: string) {
        return this.get<any[]>(`/pharmacies/medicines/favorites/${patientId}`);
    }

    // ── Cart ─────────────────────────────────────────────────────────────────
    getCart(patientId: string) { return this.get<any[]>(`/pharmacies/medicines/cart/${patientId}`); }
    addToCart(medicineId: string, patientId: string) {
        return this.post<any>(`/pharmacies/medicines/cart/add/${medicineId}?patient_id=${patientId}`, {});
    }
    decreaseCartItem(medicineId: string, patientId: string) {
        return this.post<any>(`/pharmacies/medicines/cart/decrease/${medicineId}?patient_id=${patientId}`, {});
    }
    removeFromCart(medicineId: string, patientId: string) {
        return this.delete<any>(`/pharmacies/medicines/cart/remove/${medicineId}?patient_id=${patientId}`);
    }

    // ── Labs ─────────────────────────────────────────────────────────────────
    getLabs() { return this.get<any[]>('/labs'); }
    getLab(id: string) { return this.get<any>(`/labs/${id}`); }
    getLabTests(labId?: string) {
        return labId ? this.get<any[]>(`/labs/${labId}/tests`) : this.get<any[]>('/labs/tests/all');
    }
    getLabBookings(labId: string) { return this.get<any[]>(`/labs/${labId}/bookings`); }
    uploadLabResult(labId: string, result: any) { return this.post<any>(`/labs/${labId}/results`, result); }
    updateBookingStatus(id: string, status: string) {
        return this.put<any>(`/labs/bookings/${id}/status`, { status });
    }

    // ── Warehouses ───────────────────────────────────────────────────────────
    getWarehouses() { return this.get<any[]>('/warehouses'); }
    getWarehouseInventory(id: string) { return this.get<any[]>(`/warehouses/${id}/inventory`); }
    addWarehouseInventory(id: string, data: any) { return this.post<any>(`/warehouses/${id}/inventory`, data); }
    updateWarehouseInventoryItem(id: string, data: any) { return this.put<any>(`/warehouses/inventory/${id}`, data); }
    async uploadWarehouseExcel(warehouseId: string, asset: { uri: string; name?: string }) {
        const formData = new FormData();
        formData.append('file', {
            uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
            name: asset.name || 'inventory.xlsx',
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as any);
        const headers: Record<string, string> = { 'Accept': 'application/json', 'Bypass-Tunnel-Reminder': 'true', 'ngrok-skip-browser-warning': 'true' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        const res = await fetch(`${BASE_URL}/warehouses/${warehouseId}/inventory/upload-excel`, { method: 'POST', headers, body: formData });
        if (!res.ok) throw new Error(await res.text() || 'Upload failed');
        return res.json();
    }
    getWarehouseOrders(id: string) { return this.get<any[]>(`/warehouses/${id}/orders`); }
    updateWarehouseOrderStatus(id: string, status: string, deliveryTime?: string) {
        return this.put<any>(`/warehouses/orders/${id}/status`, { status, delivery_time: deliveryTime });
    }
    createWarehouseOrder(data: any) { return this.post<any>('/orders/warehouse', data); }

    // ── Appointments ─────────────────────────────────────────────────────────
    getAppointments(params: { patient_id?: string; doctor_id?: string; status?: string } = {}) {
        const q = new URLSearchParams(params as any).toString();
        return this.get<any[]>(`/appointments${q ? '?' + q : ''}`);
    }
    createAppointment(data: any) { return this.post<any>('/appointments', data); }
    createManualAppointment(data: any) { return this.post<any>('/appointments/manual', data); }
    async updateAppointmentStatus(id: string, status: string, date?: string, time?: string, rejection_note?: string) {
        return this.put(`/appointments/${id}/status`, { status, date, time, rejection_note });
    }
    toggleRecordAccess(id: string, granted: boolean) {
        return this.put<any>(`/appointments/${id}/access`, { granted });
    }
    // Req #3: Reschedule & Cancel requests
    requestReschedule(id: string, date: string, time: string) {
        return this.put<any>(`/appointments/${id}/request-reschedule`, { date, time });
    }
    requestCancelAppointment(id: string) {
        return this.put<any>(`/appointments/${id}/request-cancel`, {});
    }

    // Prescriptions
    createPrescription(data: any) {
        return this.post<any>('/prescriptions', data);
    }
    getPatientPrescriptions(patientId: string) {
        return this.get<any[]>(`/prescriptions/patient/${patientId}`);
    }
    cancelAppointment(id: string) { return this.delete<any>(`/appointments/${id}`); }

    // ── Orders ───────────────────────────────────────────────────────────────
    getOrders(params: { patient_id?: string; pharmacy_id?: string } = {}) {
        const q = new URLSearchParams(params as any).toString();
        return this.get<any[]>(`/orders${q ? '?' + q : ''}`);
    }
    createOrder(data: any) { return this.post<any>('/orders', data); }
    updateOrderStatus(id: string, status: string) {
        return this.put<any>(`/orders/${id}/status`, { status });
    }

    // ── Records & Lab Results ─────────────────────────────────────────────────
    getMedicalRecords(patientId?: string, recordOwner?: string) {
        const params = new URLSearchParams();
        if (patientId) params.set('patient_id', patientId);
        if (recordOwner) params.set('record_owner', recordOwner);
        const q = params.toString();
        return this.get<any[]>(`/records${q ? '?' + q : ''}`);
    }
    uploadRecord(data: any) { return this.post<any>('/records', data); }
    updateRecordSharing(id: string, sharedWith: string[]) {
        return this.put<any>(`/records/${id}/share`, { shared_with: sharedWith });
    }
    revokeAccess(recordId: string, doctorId: string) {
        return this.delete<any>(`/records/${recordId}/share/${doctorId}`);
    }
    getLabResults(patientId?: string) {
        const q = patientId ? `?patient_id=${patientId}` : '';
        return this.get<any[]>(`/records/lab-results${q}`);
    }
    getLabResult(id: string) { return this.get<any>(`/records/lab-results/${id}`); }
    getLabBookingsByPatient(patientId: string) {
        return this.get<any[]>(`/records/lab-bookings?patient_id=${patientId}`);
    }
    bookLabTest(data: any) { return this.post<any>('/records/lab-bookings', data); }

    // ── Patients ─────────────────────────────────────────────────────────────
    getPatients() { return this.get<any[]>('/patients'); }
    getPatientProfile(id: string) { return this.get<any>(`/patients/${id}`); }
    getNotifications(patientId: string) { return this.get<any[]>(`/patients/${patientId}/notifications`); }
    getPatientHistory(patientId: string) { return this.get<any>(`/patients/${patientId}/history`); }
    requestMedicalHistory(patientId: string, doctorId: string) {
        return this.post<any>('/patients/history-request', { patient_id: patientId, doctor_id: doctorId });
    }
    getPatientHistoryRequests(patientId: string) {
        return this.get<any[]>(`/history-requests/patient/${patientId}`);
    }
    getFamilyLinks(patientId: string) {
        return this.get<any[]>(`/patients/${patientId}/family`);
    }
    addFamilyLink(patientId: string, data: any) {
        return this.post<any>(`/patients/${patientId}/family`, data);
    }
    updateFamilyConsent(linkId: string, status: 'approved' | 'rejected') {
        return this.put<any>(`/patients/family/${linkId}/consent`, { status });
    }
    getDoctorHistoryRequests(doctorId: string) {
        return this.get<any[]>(`/history-requests/doctor/${doctorId}`);
    }
    updateHistoryRequestStatus(requestId: string, status: string) { return this.put<any>(`/history-requests/${requestId}/status?status=${status}`, {}); }
    updatePatient(id: string, data: any) { return this.put<any>(`/patients/${id}`, data); }

    // Req #5: My Doctors
    getMyDoctors(patientId: string) {
        return this.get<any[]>(`/doctors/my-doctors?patient_id=${patientId}`);
    }

    // Req #13: Medicine details
    getMedicineDetails(id: string) {
        return this.get<any>(`/pharmacies/medicines/${id}/details`);
    }

    // Mark notification as read
    markNotificationRead(id: string) {
        return this.put<any>(`/patients/notifications/${id}/read`, {});
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    getAdminDashboard() { return this.get<any>('/admin/dashboard'); }
    getAllUsers(role?: string) {
        const q = role ? `?role=${role}` : '';
        return this.get<any[]>(`/admin/users${q}`);
    }
    verifyUser(id: string) { return this.put<any>(`/admin/users/${id}/verify`, {}); }
    toggleUserActive(id: string) { return this.put<any>(`/admin/users/${id}/toggle-active`, {}); }
    toggleUserFeatured(id: string) { return this.put<any>(`/admin/users/${id}/toggle-featured`, {}); }
    deleteUser(id: string) { return this.delete<any>(`/admin/users/${id}`); }
    createAdminUser(data: any) {
        return this.post<any>('/admin/users', data);
    }
    getAuditLogs() { return this.get<any[]>('/admin/audit-logs'); }
    getAdminStats() { return this.get<any>('/admin/stats'); }

    // ── Registration Requests ────────────────────────────────────────────────
    getRegistrationRequests() {
        return this.get<any[]>('/admin/registration-requests');
    }
    approveRegistration(id: string) {
        return this.post<any>(`/admin/registration-requests/${id}/approve`, {});
    }
    rejectRegistration(id: string) {
        return this.post<any>(`/admin/registration-requests/${id}/reject`, {});
    }
}

export const api = new ApiClient();
