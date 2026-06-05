import { Platform } from 'react-native';

/** Set EXPO_PUBLIC_API_URL (e.g. https://xxx.loca.lt/api) when the backend is tunneled for Expo Go. */
// Local Expo Go (phone on same Wi‑Fi): EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8000/api
// Example: 'http://192.168.70.73:8000/api' — use env at start instead of uncommenting below.
export const BASE_URL =
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
    // 'http://192.168.70.73:8000/api',
    'https://medlink-backend-2e7a.onrender.com/api';

class ApiClient {
    private token: string | null = null;

    setToken(token: string | null) {
        this.token = token;
    }

    private formatApiError(status: number, text: string): string {
        try {
            const json = JSON.parse(text);
            const detail = json.detail;
            if (typeof detail === 'string') return detail;
            if (Array.isArray(detail)) {
                return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
            }
            return json.message || JSON.stringify(json);
        } catch {
            return text?.substring(0, 200) || `HTTP ${status}`;
        }
    }

    private async request<T>(
        method: string,
        path: string,
        body?: any,
        options?: { silent?: boolean }
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
        let res: Response;
        try {
            res = await fetch(`${BASE_URL}${path}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });
        } catch (e: any) {
            const msg = e?.message || '';
            if (msg.includes('Network request failed') || msg.includes('Failed to fetch')) {
                throw new Error('تعذر الاتصال بالخادم. تحقق من الإنترنت أو إعدادات API.');
            }
            throw new Error(msg || 'تعذر الاتصال بالخادم');
        }

        if (!res.ok) {
            const text = await res.text();
            const errDetail = this.formatApiError(res.status, text);
            if (!options?.silent) {
                console.error(`[API ERROR] ${method} ${BASE_URL}${path} → ${res.status}:`, errDetail);
            }
            throw new Error(errDetail);
        }
        try {
            return await res.json();
        } catch {
            throw new Error('استجابة غير صالحة من الخادم');
        }
    }

    get<T>(path: string, options?: { silent?: boolean }) {
        return this.request<T>('GET', path, undefined, options);
    }
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
    getDoctors(specialization?: string, province?: string, district?: string) {
        const params: Record<string, string> = {};
        if (specialization && specialization !== 'all') params.specialization = specialization;
        if (province) params.province = province;
        if (district) params.district = district;
        const q = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
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
    getDoctorAvailability(id: string, date?: string) {
        const q = date ? `?date=${encodeURIComponent(date)}` : '';
        return this.get<any>(`/doctors/${id}/availability${q}`);
    }
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
    getPharmacies(params?: { lat?: number; lng?: number; radius_km?: number; province?: string; district?: string; area?: string }) {
        const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
        return this.get<any[]>(`/pharmacies${q ? '?' + q : ''}`);
    }
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
    adjustMedicineStock(id: string, delta: number) { return this.post<any>(`/pharmacies/medicines/${id}/stock-adjust`, { delta }); }
    setMedicineQuantity(id: string, quantity: number) { return this.post<any>(`/pharmacies/medicines/${id}/stock-adjust`, { quantity }); }
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
    getLabs(filters?: { q?: string; province?: string; district?: string; area?: string }) {
        const params = new URLSearchParams();
        if (filters?.q) params.append('q', filters.q);
        if (filters?.province) params.append('province', filters.province);
        if (filters?.district) params.append('district', filters.district);
        if (filters?.area) params.append('area', filters.area);
        const query = params.toString();
        return this.get<any[]>(`/labs${query ? '?' + query : ''}`);
    }
    getRadiologyCenters(filters?: { q?: string; province?: string; district?: string; area?: string }) {
        const params = new URLSearchParams();
        if (filters?.q) params.append('q', filters.q);
        if (filters?.province) params.append('province', filters.province);
        if (filters?.district) params.append('district', filters.district);
        if (filters?.area) params.append('area', filters.area);
        const query = params.toString();
        return this.get<any[]>(`/labs/radiology${query ? '?' + query : ''}`);
    }
    getLab(id: string) { return this.get<any>(`/labs/${id}`); }
    getLabTests(labId?: string) {
        return labId ? this.get<any[]>(`/labs/${labId}/tests`) : this.get<any[]>('/labs/tests/all');
    }
    addLabTest(providerId: string, data: any) { return this.post<any>(`/labs/${providerId}/tests`, data); }
    updateLabTest(testId: string, data: any) { return this.put<any>(`/labs/tests/${testId}`, data); }
    deleteLabTest(testId: string) { return this.delete<any>(`/labs/tests/${testId}`); }
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
    getPharmacyWarehouseOrders(pharmacyId: string) { return this.get<any[]>(`/orders/warehouse?pharmacy_id=${pharmacyId}`); }
    confirmPharmacyWarehouseOrder(orderId: string) { return this.put<any>(`/orders/warehouse/${orderId}/confirm`, {}); }

    // ── Appointments ─────────────────────────────────────────────────────────
    getAppointments(params: { patient_id?: string; doctor_id?: string; status?: string } = {}) {
        const q = new URLSearchParams(params as any).toString();
        return this.get<any[]>(`/appointments${q ? '?' + q : ''}`);
    }
    createAppointment(data: any) { return this.post<any>('/appointments', data); }
    createManualAppointment(data: any) { return this.post<any>('/appointments/manual', data); }
    async updateAppointmentStatus(
        id: string,
        status: string,
        date?: string,
        time?: string,
        rejection_note?: string,
        modification_note?: string,
    ) {
        return this.put(`/appointments/${id}/status`, { status, date, time, rejection_note, modification_note });
    }
    toggleRecordAccess(id: string, granted: boolean) {
        return this.put<any>(`/appointments/${id}/access`, { granted });
    }
    // Req #3: Reschedule & Cancel requests
    requestReschedule(id: string, date: string, time: string) {
        return this.put<any>(`/appointments/${id}/request-reschedule`, { date, time });
    }
    requestCancelAppointment(id: string, reason: string) {
        return this.put<any>(`/appointments/${id}/request-cancel`, { reason });
    }
    withdrawCancelRequest(id: string) {
        return this.put<any>(`/appointments/${id}/withdraw-cancel-request`, {});
    }
    respondReschedule(id: string, data: { action: string; date?: string; time?: string; rejection_note?: string }) {
        return this.put<any>(`/appointments/${id}/respond-reschedule`, data);
    }
    proposeScheduleChange(id: string, date: string, time: string, modification_note: string) {
        return this.put<any>(`/appointments/${id}/propose-schedule-change`, {
            date,
            time,
            modification_note,
        });
    }
    respondScheduleChange(id: string, action: 'approve' | 'reject', rejection_note?: string) {
        return this.put<any>(`/appointments/${id}/respond-schedule-change`, { action, rejection_note });
    }
    getAppointmentAudit(id: string) {
        return this.get<any[]>(`/appointments/${id}/audit`);
    }

    // Prescriptions & fulfillment
    createPrescription(data: any) {
        return this.post<any>('/prescriptions', data);
    }
    getPatientPrescriptions(patientId: string) {
        return this.get<any[]>(`/prescriptions/patient/${patientId}`);
    }
    searchPrescriptions(params: { code?: string; patient_name?: string; phone?: string }) {
        const q = new URLSearchParams(params as any).toString();
        return this.get<any[]>(`/prescriptions/search?${q}`);
    }
    dispensePrescriptionItem(prescriptionId: string, data: any) {
        return this.put<any>(`/prescriptions/${prescriptionId}/dispense`, data);
    }
    getPrescription(id: string) {
        return this.get<any>(`/prescriptions/${id}`);
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
    async getLabResults(patientId?: string) {
        if (!patientId) return [];
        try {
            return await this.get<any[]>(
                `/records/lab-results?patient_id=${patientId}`,
                { silent: true }
            );
        } catch {
            return [];
        }
    }
    getLabResult(id: string) { return this.get<any>(`/records/lab-results/${id}`); }
    async getLabBookingsByPatient(patientId: string) {
        const history = await this.getPatientHistory(patientId);
        return history?.lab_bookings || [];
    }
    bookLabTest(data: any) { return this.post<any>('/records/lab-bookings', data); }

    // ── Patients ─────────────────────────────────────────────────────────────
    getPatients() { return this.get<any[]>('/patients'); }
    getPatientProfile(id: string) { return this.get<any>(`/patients/${id}`); }
    getNotifications(patientId: string) { return this.get<any[]>(`/patients/${patientId}/notifications`); }
    getPatientHistory(patientId: string) { return this.get<any>(`/patients/${patientId}/history`); }
    getPatientVisits(patientId: string) { return this.get<any>(`/patients/${patientId}/visits`); }
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

    // ── Drug Catalog ──────────────────────────────────────────────────────────
    searchDrugs(q: string) {
        return this.get<any[]>(`/drugs/search?q=${encodeURIComponent(q)}`);
    }
    getDrugCategories() { return this.get<string[]>('/drugs/categories'); }
    getDrug(id: string) { return this.get<any>(`/drugs/${id}`); }

    // ── Lab/Radiology Service Bookings ────────────────────────────────────────
    getServiceBookings(params: { patient_id?: string; provider_id?: string } = {}) {
        const q = new URLSearchParams(params as any).toString();
        return this.get<any[]>(`/labs/service-bookings${q ? '?' + q : ''}`);
    }
    createServiceBooking(data: any) { return this.post<any>('/labs/service-bookings', data); }
    updateServiceBookingStatus(id: string, data: any) { return this.put<any>(`/labs/service-bookings/${id}/status`, data); }
    getLabsFiltered(params?: { q?: string; province?: string; district?: string }) {
        const query = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
        return this.get<any[]>(`/labs${query ? '?' + query : ''}`);
    }
    getProviderAvailability(providerId: string) { return this.get<any>(`/labs/providers/${providerId}/availability`); }
    getProviderAnalytics(providerId: string) { return this.get<any>(`/labs/${providerId}/analytics`); }

    // ── Consultation Reports ──────────────────────────────────────────────────
    createConsultationReport(data: any) { return this.post<any>('/consultations', data); }
    getConsultationByAppointment(appointmentId: string) {
        return this.get<any | null>(`/consultations/appointment/${appointmentId}`, { silent: true });
    }
    getPatientConsultations(patientId: string) { return this.get<any[]>(`/consultations/patient/${patientId}`); }
    addServiceRequest(reportId: string, data: any) { return this.post<any>(`/consultations/${reportId}/service-requests`, data); }
    getPatientServiceRequests(patientId: string) { return this.get<any[]>(`/consultations/service-requests/patient/${patientId}`); }

    // ── Patient by UID ────────────────────────────────────────────────────────
    getPatientByUID(uid: string) { return this.get<any>(`/patients/by-uid/${uid}`); }
    createProvisionalPatient(data: { name: string; phone: string }) { return this.post<any>('/patients/provisional', data); }

    getUserNotifications(userId: string) { return this.get<any[]>(`/patients/${userId}/notifications`); }
    markUserNotificationRead(id: string) { return this.put<any>(`/patients/notifications/${id}/read`, {}); }

    async bulkImportPharmacies(asset: { uri: string; name?: string }) {
        const formData = new FormData();
        formData.append('file', {
            uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
            name: asset.name || 'pharmacies.xlsx',
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as any);
        const headers: Record<string, string> = { 'Accept': 'application/json', 'Bypass-Tunnel-Reminder': 'true' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        const res = await fetch(`${BASE_URL}/admin/bulk-import/pharmacies`, { method: 'POST', headers, body: formData });
        if (!res.ok) throw new Error(await res.text() || 'Upload failed');
        return res.json();
    }
    async bulkImportWarehousesAdmin(asset: { uri: string; name?: string }) {
        const formData = new FormData();
        formData.append('file', {
            uri: Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', ''),
            name: asset.name || 'warehouses.xlsx',
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as any);
        const headers: Record<string, string> = { 'Accept': 'application/json', 'Bypass-Tunnel-Reminder': 'true' };
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        const res = await fetch(`${BASE_URL}/admin/bulk-import/warehouses`, { method: 'POST', headers, body: formData });
        if (!res.ok) throw new Error(await res.text() || 'Upload failed');
        return res.json();
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    getAdminDashboard() { return this.get<any>('/admin/dashboard'); }
    getAllUsers(role?: string) {
        const q = role ? `?role=${role}` : '';
        return this.get<any[]>(`/admin/users${q}`);
    }
    getAdminUserDetail(id: string) { return this.get<any>(`/admin/users/${id}`); }
    verifyUser(id: string) { return this.put<any>(`/admin/users/${id}/verify`, {}); }
    toggleUserActive(id: string) { return this.put<any>(`/admin/users/${id}/toggle-active`, {}); }
    toggleUserFeatured(id: string) { return this.put<any>(`/admin/users/${id}/toggle-featured`, {}); }
    deleteUser(id: string) { return this.delete<any>(`/admin/users/${id}`); }
    createAdminUser(data: any) {
        return this.post<any>('/admin/users', data);
    }
    getAuditLogs(params?: { user_id?: string; action?: string; limit?: number }) {
        const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
        return this.get<any[]>(`/admin/audit-logs${q ? '?' + q : ''}`);
    }
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
