# MedLink / DrApp Syria — Production Implementation Plan

> Plan only. No code. You implement task by task. **After each task: build, smoke-test, then commit & push to git before starting the next task.**

This plan turns the requested enhancements into a sequenced, shippable task list grounded in the **actual** codebase (Expo / React Native frontend in `app/` + `src/`, FastAPI + SQLAlchemy backend in `backend/`).

---

## 0. How to read this plan

Each task has:
- **Goal** — what "done" means in business terms.
- **Backend** — changes in `backend/` (models, routers, migration).
- **Frontend** — changes in `app/` and `src/`.
- **Acceptance** — how you verify it works.
- **Commit** — suggested commit message for the git step.

### Git workflow (do this for every task)
1. Create/switch to a feature branch: `git checkout -b task/<id>-<slug>`.
2. Implement only that task.
3. Run backend (`python start_backend.py`) and the app; smoke-test the acceptance checklist.
4. `git add -p` the relevant files (avoid committing `medlink.db`, logs, `__pycache__`, `*.txt` debug dumps).
5. Commit with the message in the task, then `git push -u origin task/<id>-<slug>`.
6. Merge to `master` (PR or fast-forward) and tag phases (`v0.<phase>`).

### Pre-flight cleanup (do once, before Task 0.1)
The repo root has many one-off debug scripts and dumps that should not ship:
`check_db_users.py`, `check_pwd.py`, `check_user.py`, `clear_data.py`, `debug_*.py`, `remove_*.py`, `reset_doctor_password.py`, `verify_*.py`, `pwd_debug.txt`, `db_*.txt`, `api_test_output.json`, `backend/backend_std*.log`, `backend/test_*.py`, `backend/*.png`.
Move them into a `scripts/dev/` folder (kept out of releases) or delete, and confirm `.gitignore` covers `*.db`, `*.log`, `__pycache__/`, `.expo/`. This keeps the production diff clean.

---

## 1. Current-state assessment (what already exists)

This matters because several requirements are **partially built** — the plan reuses them instead of rebuilding.

| Area | Already in code | Gap to close |
|---|---|---|
| Location hierarchy | `User.province/district/area`; registration already collects them via modals | Two competing data sources: inline `SYRIA_LOCATIONS` in `register.tsx` **and** `src/data/syriaLocations.ts`. Must unify with the official WhatsApp table. |
| Patient unique ID | `User.patient_unique_id`, `User.qr_code_url` columns exist | No generation, no profile display, no ID-based appointment/record creation |
| Family links | `FamilyLink` model + `/patients/{id}/family` endpoints | No "link by patient ID" UX |
| Lab/Radiology booking | `ServiceBooking` model, `/labs/service-bookings`, `/labs/radiology`, `radiology` role in register | No patient booking UI, no provider approval/greying, no rejection reasons |
| Appointment condition | `Appointment.reason` column | Not required/enforced in patient booking UI |
| Slot greying | `ensure_slot_available()` + `ACTIVE_SLOT_STATUSES` + `/doctors/{id}/availability` returns `booked_slots` | Frontend doesn't fully grey/disable booked slots |
| Flexible hours/duration | `working_hours` JSON (morning/evening/off_days/slots), `consultation_duration`, `buffer_minutes`, `_generate_slots_from_working_hours()` | No doctor-facing editor UI; register only does a flat multi-select |
| Rejection reasons | `Appointment.rejection_note` (free text), reject requires a note | No structured reason types + "recommend specialty/doctor" |
| Specialties | `SPECIALIZATIONS` list (10 items) in `doctors.py` | List too short; **filter bug** below |
| Audit | `AuditLog` + `AppointmentAuditLog` | `AuditLog.details` is vague ("حجز موعد جديد"); no actor/medication/quantity detail |
| Secretary | `secretary` role, `/appointments/manual`, secretary screens exist | Limited UI; schedule editing not wired |
| Excel import | pharmacy/warehouse/admin bulk import endpoints | n/a |

### Confirmed bug — specialty filter
`app/(patient)/doctors.tsx` sets `selectedSpec = sp.name_en` (e.g. `"Cardiology"`) and calls `api.getDoctors("Cardiology")`. Backend `list_doctors` matches `specialization ILIKE %..%` OR `specialization_en ILIKE %..%`. But `register.tsx` saves only the Arabic `specialization` (`"قلبية"`) and never sets `specialization_en`, so the English filter value matches nothing → doctors only appear under "All". Fixed in **Task 2.1**.

---

## 2. Phase 0 — Foundations & shared infrastructure

These come first because many later tasks depend on them.

### Task 0.1 — Production prep & DB migration discipline
- **Goal:** Clean repo, reliable schema migrations, environment-driven config.
- **Backend:** Adopt one migration approach. Current style is hand-written `migrate_v*.py`. Either (a) keep that pattern and add a single `migrate.py` runner that applies all pending column adds idempotently, or (b) introduce Alembic. Recommend (a) for speed given existing scripts. Ensure `init_db.py` + migration run on deploy (`render.yaml` / `Procfile`).
- **Frontend:** Confirm `EXPO_PUBLIC_API_URL` is the only place the API base lives (it is, in `src/services/api.ts`). Document it in `README.md`.
- **Acceptance:** Fresh clone + migrate produces a schema matching `models.py`; app talks to backend via env var.
- **Commit:** `chore: production prep, repo cleanup, idempotent migration runner`

### Task 0.2 — Unify Syria location data (Governorate / District / Sub-district)
- **Goal:** One authoritative dataset from the WhatsApp reference table (`المحافظات و النواحي بسورية.xlsx` is already in the repo root).
- **Steps:** Convert the xlsx into `src/data/syriaLocations.ts` (full 14 governorates → districts → sub-districts). Delete the duplicated inline `SYRIA_LOCATIONS` object in `register.tsx` and import from the shared module. Optionally expose a backend `/meta/locations` endpoint so filtering stays consistent server-side.
- **Frontend:** `register.tsx` cascading pickers read from `syriaLocations.ts`.
- **Acceptance:** Every governorate/district/sub-district from the xlsx is selectable; register payload stores `province/district/area`.
- **Commit:** `feat: unify Syria location dataset from official table`

### Task 0.3 — Reusable map location picker (Google / Apple Maps)
- **Goal:** A single `<MapLocationPicker>` component used by doctor, lab, radiology, pharmacy, warehouse for choosing location (writes `lat`/`lng` + a readable address). Required by multiple account types.
- **Frontend:** New `src/components/MapLocationPicker.tsx` using `react-native-maps` (Apple Maps on iOS, Google on Android) + `expo-location` for current position. Returns `{ lat, lng, address }`. Add config to `app.json` (maps API key for Android). Replace manual `clinic_address` / location text inputs with a "Pick on map" button that opens the picker.
- **Backend:** `lat`/`lng` already exist on `User`; ensure registration + profile update persist them (extend `safe_update` allow-list if needed).
- **Acceptance:** Selecting a point stores coordinates; reopening shows the pin; address text is filled.
- **Commit:** `feat: reusable Google/Apple map location picker`

### Task 0.4 — Reusable schedule editor (working days, hours, duration, holidays, on-call)
- **Goal:** One `<ScheduleEditor>` component + a normalized `working_hours` JSON shape reused by doctor / lab / radiology / pharmacy / warehouse.
- **Shape (proposed):** `{ off_days: [..], holidays: ["YYYY-MM-DD"], morning: "08:00-14:00", evening: "17:00-21:00", consultation_duration: 25, buffer_minutes: 10, on_call_nights: [..] }`. Backend already reads `morning`/`evening`/`off_days`/`slots` in `_generate_slots_from_working_hours`; extend it to honor `holidays` and custom `consultation_duration`.
- **Frontend:** New `src/components/ScheduleEditor.tsx`: day toggles, time-range pickers for morning/evening, duration selector (15/25/45 + custom numeric), holiday date list, and (pharmacy only) on-call/night-duty section.
- **Backend:** Slot generation respects `holidays` and per-provider `consultation_duration`/`buffer_minutes`; `availability` endpoint returns `day_off`/`holiday` flags (doctor endpoint already returns `day_off`).
- **Acceptance:** A provider sets Morning 08–14 + Evening 17–21 + 25-min slots; generated slots match; holidays return empty slots.
- **Commit:** `feat: reusable schedule editor + working-hours model`

### Task 0.5 — Responsiveness & keyboard baseline
- **Goal:** Fix the keyboard covering inputs and the awkward bottom bar; make layouts adapt to screen sizes.
- **Frontend:**
  - Wrap input-heavy screens (`(auth)/login`, `(auth)/register`, booking, prescription, profile, note/report forms) in `KeyboardAvoidingView` + `react-native-keyboard-aware-scroll-view` (add dependency) so focused fields stay visible.
  - Replace fixed pixel paddings with `useSafeAreaInsets()` (react-native-safe-area-context) for tab bars and headers; ensure the bottom tab bar respects the home indicator and doesn't overlap content (`contentContainerStyle` bottom padding).
  - Replace hard-coded `Dimensions.get('window')` one-time reads with responsive units where layout breaks on small/large devices.
- **Acceptance:** On a small Android phone and a tablet, focused inputs are never hidden by the keyboard; tab bar sits above the safe area; no clipped content.
- **Commit:** `fix: keyboard avoidance + responsive safe-area layout baseline`

---

## 3. Phase 1 — Registration & patient identity

### Task 1.1 — Finalize Governorate/District/Sub-district in registration
- **Goal:** Mandatory cascading location selection saved for all roles (improves nearest-service filtering).
- **Frontend:** Uses Task 0.2 data; validation already requires `province/district/area` in `handleRegister`. Confirm the same selection appears in profile edit screens for each role.
- **Backend:** `RegistrationRequest` payload + `approve_registration` already carry `city`; extend approval to also persist `province/district/area` (currently it sets `city` only) so providers are filterable by area after approval.
- **Acceptance:** A pharmacy registered in a given district is returned by `getPharmacies({province, district, area})`.
- **Commit:** `feat: persist full location hierarchy through registration & approval`

### Task 1.2 — Patient unique ID + QR on profile
- **Goal:** Every patient gets a stable public ID shown under their name as a QR-style identifier.
- **Backend:** On patient creation (register approval + admin create), generate `patient_unique_id` (e.g. `PT-XXXXXX`, unique) and `qr_code_url` (encode the ID). Backfill existing patients via a migration. Add lookup endpoint `GET /patients/by-uid/{uid}`.
- **Frontend:** `(patient)/profile.tsx` shows the ID + a QR (add `react-native-qrcode-svg`) beneath the name, with copy/share.
- **Acceptance:** Existing and new patients show a unique ID + scannable QR; lookup endpoint returns the patient.
- **Commit:** `feat: patient unique ID generation, QR display, UID lookup`

### Task 1.3 — Family account linking via patient ID
- **Goal:** Link family members (parent ↔ child) using the unique ID; supports shared records.
- **Backend:** Reuse `FamilyLink`. Add "link by uid" path: resolve `patient_unique_id` → user, create link with `consent_status=pending`, notify the target.
- **Frontend:** In patient profile/family section, "Add family member by ID" → enter UID → confirm relation; consent approve/reject UI for the target (endpoints exist: `addFamilyLink`, `updateFamilyConsent`).
- **Acceptance:** Parent links a child by UID; child (or guardian) approves; linked records become visible per `record_owner`.
- **Commit:** `feat: family linking by patient unique ID with consent`

### Task 1.4 — Registration field corrections & required numbers
- **Goal:** Fix UX defects and add mandatory regulatory fields.
- **Frontend (`register.tsx`):**
  - Years of experience: stop showing `0`; use placeholder "أدخل سنوات الخبرة" (store empty until typed; the form currently binds `experience_years.toString()` → shows "0").
  - Replace manual clinic/center/pharmacy/warehouse location text with the Task 0.3 map picker.
  - Add fields by role: **doctor** → "رقم العضوية بالنقابة" (medical association reg. no., mandatory); **lab/radiology** → association reg. no. **and** license no. (mandatory); **pharmacy** → pharmacy registration no. (mandatory); **warehouse** → license no. (mandatory).
- **Backend:** Add columns `association_no` (and reuse `license_no`) to `User`; persist through `RegistrationRequest` → `approve_registration`; validate presence per role at registration.
- **Acceptance:** Cannot register a doctor/center/pharmacy/warehouse without the required number; values visible to admin (Task 7.2).
- **Commit:** `feat: registration regulatory fields + experience placeholder + map location`

### Task 1.5 — Expand medical specialties
- **Goal:** Complete specialty list for doctor registration & patient filter.
- **Backend:** Extend `SPECIALIZATIONS` in `doctors.py` with the missing specialties (add Arabic + `name_en` + icon for each). This list feeds both the register picker and the patient filter, so keeping `name_en` accurate is what makes Task 2.1 work.
- **Frontend:** Register specialty modal reads from `/doctors/specializations` (single source) instead of any hard-coded list.
- **Acceptance:** All required specialties selectable at registration and present as filter chips.
- **Commit:** `feat: expand medical specialties catalog`

---

## 4. Phase 2 — Discovery & filtering

### Task 2.1 — Fix doctor specialty filtering + dropdown + "Show all"
- **Goal:** Doctors appear under their specialty (not only "All"); specialties shown as a dropdown filter; "Show all" works or is removed.
- **Root cause:** English/Arabic mismatch (see §1). Fix by making the filter value and stored value consistent.
- **Backend:** When a doctor registers/approves, populate **both** `specialization` (Arabic) and `specialization_en` from the chosen `SPECIALIZATIONS` entry. Backfill existing doctors with a migration mapping Arabic→`name_en`. `list_doctors` already matches either column, so this alone fixes filtering.
- **Frontend (`doctors.tsx`):** Convert the horizontal chip row into a proper dropdown filter; make the chip value/selection use a stable key (specialization id or Arabic name) consistently with what the backend stores; ensure "الكل/All" resets to `undefined`. Remove the dead "عرض الكل" link next to التخصصات or wire it to open the dropdown.
- **Acceptance:** Registering a "قلبية" doctor then filtering by Cardiology shows that doctor; "All" shows everyone; dropdown reflects the full Task 1.5 list.
- **Commit:** `fix: specialty filter matching (ar/en) + dropdown + show-all`

### Task 2.2 — Lab & Radiology listing + search
- **Goal:** Patients can browse and search Laboratory and Radiology centers.
- **Backend:** `/labs` and `/labs/radiology` exist; add optional `q`, `province/district/area` query filters to both (mirror pharmacy filtering).
- **Frontend:** `(patient)/labs.tsx` and `(patient)/radiology.tsx` get a search bar + location filter; detail screens `(patient)/labs/[id].tsx` (exists) and a new `(patient)/radiology/[id].tsx`.
- **Acceptance:** Searching by name/area returns matching centers; detail screens open.
- **Commit:** `feat: lab & radiology search and listing with filters`

---

## 5. Phase 3 — Appointments

### Task 3.1 — Require condition description at booking
- **Goal:** Patient must describe their condition (so a different specialty can be suggested).
- **Frontend:** In the patient booking flow (doctor detail `(patient)/doctors/[id].tsx`), add a required multiline "وصف الحالة" field; block submit if empty; send as `reason` (column already exists and `create_appointment` already stores it).
- **Backend:** Validate non-empty `reason` for patient-initiated bookings.
- **Acceptance:** Cannot book without a description; description shows to the doctor on the appointment and later in records.
- **Commit:** `feat: mandatory condition description on appointment booking`

### Task 3.2 — Grey out booked slots
- **Goal:** Once a slot is booked/approved it is unavailable to others.
- **Backend:** Already enforced server-side via `ensure_slot_available` + `ACTIVE_SLOT_STATUSES`; `/doctors/{id}/availability` returns `booked_slots`.
- **Frontend:** Booking UI must mark slots present in `booked_slots` (for the selected date) as disabled/greyed and non-selectable; show a "محجوز" label. Refresh availability after each booking.
- **Acceptance:** Booking a slot greys it for a second patient; attempting it returns the 409 message gracefully.
- **Commit:** `feat: grey out unavailable appointment slots`

### Task 3.3 — Flexible working hours + custom consultation duration (doctor)
- **Goal:** Doctors define Morning/Evening windows and pick 15/25/45/custom minute slots.
- **Frontend:** `(doctor)/profile.tsx` integrates the Task 0.4 `<ScheduleEditor>`; saves `working_hours` + `consultation_duration` + `buffer_minutes` via `updateDoctorProfile`.
- **Backend:** `_generate_slots_from_working_hours` already supports this; verify custom duration and buffer flow through; ensure availability reflects new schedule.
- **Acceptance:** Doctor sets two windows + 25-min slots; patient sees correctly generated, spaced slots.
- **Commit:** `feat: doctor flexible working hours & custom duration`

### Task 3.4 — Structured rejection / cancellation reasons (doctor)
- **Goal:** Rejecting/cancelling requires a reason from a defined set.
- **Backend:** Add `rejection_reason_type` to `Appointment` (`booked_by_phone` | `wrong_specialty` | `other`) plus optional `recommended_specialty` / `recommended_doctor_id`. `update_appointment_status` already requires a note on reject; extend to require a reason type and validate the recommendation fields when `wrong_specialty`.
- **Frontend:** Doctor appointment screen reject action opens a modal: choose reason; if "wrong specialty" show specialty + doctor recommendation pickers; if "other" show a text field. Patient notification includes the recommendation.
- **Acceptance:** Each reason path stores structured data; patient sees the recommended specialty/doctor when applicable.
- **Commit:** `feat: structured appointment rejection reasons + referral`

### Task 3.5 — Lab & Radiology appointment booking, approval, greying, rejection
- **Goal:** Bring lab/radiology bookings up to doctor-level: flexible schedule, approval, slot greying, rejection reasons.
- **Backend:** `ServiceBooking` currently defaults to `status="booked"` with no approval lifecycle. Add statuses (`pending`→`confirmed`/`rejected`/`completed`), a slot-availability check (reuse the doctor pattern keyed on `provider_id`), an availability endpoint for labs/radiology (reuse `working_hours`), and a status-update endpoint with structured rejection (`test_unavailable`/`service_unavailable` + optional `recommended_provider_id`). Notify patient on each transition.
- **Frontend:** Patient booking UI on lab/radiology detail screens (date/time from provider schedule, greyed booked slots). Provider booking management in `(lab)/bookings.tsx` and a new radiology bookings screen: approve/reject with reasons. 
- **Acceptance:** Patient books a lab slot → provider approves → slot greys for others; rejection with "test unavailable" + recommendation reaches the patient.
- **Commit:** `feat: lab/radiology booking approval, slot greying, rejection reasons`

---

## 6. Phase 4 — Consultation & medical records

### Task 4.1 — "End Session" → consultation report flow
- **Goal:** Completing an appointment opens a report page where the doctor documents the condition, writes a prescription, and requests lab/imaging studies with reference codes.
- **Backend:** Add a `ConsultationReport` model (`appointment_id`, `doctor_id`, `patient_id`, `condition_summary`, `is_healthy`, `notes`, `follow_up`, `created_at`) and endpoints to create/fetch it. Reuse `Prescription` (already generates `prescription_code`). For lab/imaging requests, create `ServiceRequest` records (or reuse `ServiceBooking` with a `request_code`) that generate reference codes the patient/center can use. On report save, set the appointment `status=completed` and write structured audit (Task 7.3).
- **Frontend:** New `(doctor)/consultation-report.tsx` reached from the appointment's "إنهاء الجلسة" action: sections for condition/healthy toggle, prescription builder (reuse `new-prescription.tsx` logic), and "request tests/imaging" with generated reference codes. Redirect here after End Session.
- **Acceptance:** Ending a session lands on the report; saving creates the report + optional prescription + test/imaging requests with codes; appointment becomes completed.
- **Commit:** `feat: consultation report flow with prescription & test/imaging requests`

### Task 4.2 — Patient Records section (full visit history, both sides)
- **Goal:** A complete records view, newest first, showing name, contact, visit date, complaint, consultation report, prescribed meds, notes/follow-up, and requested tests/imaging — visible to both doctor and patient.
- **Backend:** Add `GET /patients/{id}/visits` (or extend `/patients/{id}/history`) that joins appointments + consultation reports + prescriptions + lab/imaging requests + notes into one descending timeline. Enforce access (doctor must have an appointment/`record_access_granted`; patient sees own).
- **Frontend:** Doctor `(doctor)/patients.tsx` → patient detail timeline; patient `(patient)/records.tsx` / `(patient)/history.tsx` show the same data. Reports and prescriptions appear in both accounts.
- **Acceptance:** A visit shows complaint (from booking `reason`), report, meds, notes, and any test/imaging requests; identical data on both sides.
- **Commit:** `feat: unified patient records timeline (doctor + patient views)`

### Task 4.3 — Radiology results upload + report to patient file
- **Goal:** Radiology centers upload imaging results and a report directly into the patient's medical file.
- **Backend:** Extend results upload (mirror `LabResult` / `/labs/{id}/results`) to accept image/PDF uploads + `radiology_report` text, writing a `MedicalRecord` of type `imaging` for the patient. Link to the originating request/reference code.
- **Frontend:** Radiology results screen (new, parallel to `(lab)/results.tsx`) with file upload + report text; result appears in the patient's records timeline (Task 4.2).
- **Acceptance:** Uploaded imaging + report appear in the patient's file and the requesting doctor's view.
- **Commit:** `feat: radiology results & report upload to patient file`

---

## 7. Phase 5 — Pharmacy & Warehouse scheduling

### Task 5.1 — Pharmacy schedules, on-call/night-duty, location, registration number
- **Goal:** Pharmacies manage working days/hours/holidays, on-call/night-duty schedule, map location, and a mandatory registration number.
- **Backend:** Reuse `working_hours` JSON (incl. `on_call_nights`, `holidays`). `license_no`/`association_no` from Task 1.4 used for the pharmacy registration number; persist `lat/lng`.
- **Frontend:** `(pharmacy)/index.tsx` or a settings screen integrates `<ScheduleEditor>` (with the on-call section enabled) + `<MapLocationPicker>`; registration number shown/edited.
- **Acceptance:** Pharmacy sets night-duty days + holidays + location; admin and patients can see open/on-call status.
- **Commit:** `feat: pharmacy schedules, on-call, map location, registration no.`

### Task 5.2 — Warehouse working schedule, location, license number
- **Goal:** Warehouses manage working days/hours/holidays, map location, mandatory license number.
- **Backend:** Same `working_hours` shape; `license_no` mandatory; persist `lat/lng`.
- **Frontend:** Warehouse settings screen integrates `<ScheduleEditor>` + `<MapLocationPicker>`; license number field.
- **Acceptance:** Warehouse schedule + location + license saved and visible to admin.
- **Commit:** `feat: warehouse schedule, map location, license no.`

---

## 8. Phase 6 — Secretary

### Task 6.1 — Secretary capabilities
- **Goal:** Secretary can approve/reject appointments, modify working hours/schedules, and create appointments using a patient's registration ID.
- **Backend:** `update_appointment_status` uses `get_current_user` (no role lock) so secretary can already act — add an explicit ownership check that the secretary's `supervisor_id` matches the appointment's doctor. Allow secretary to update the supervising doctor's `working_hours` (extend `updateDoctorProfile` permission to a linked secretary). Manual creation already exists via `/appointments/manual`; combine with the UID lookup from Task 1.2 and auto-create a medical record if none exists.
- **Frontend:** `(secretary)/appointments.tsx` gets approve/reject (with Task 3.4 reasons) and a schedule editor for the supervising doctor; "create appointment by patient ID" form (enter UID → resolve patient → pick slot → confirm).
- **Acceptance:** Secretary approves/rejects only their doctor's appointments, edits that doctor's schedule, and books by UID (auto-creating a record when needed).
- **Commit:** `feat: secretary approvals, schedule editing, book-by-UID`

---

## 9. Phase 7 — Admin

### Task 7.1 — Radiology account type in admin
- **Goal:** Admin can view/manage Radiology/Imaging centers as a distinct type.
- **Backend:** `dashboard` currently lumps labs+radiology; add a `radiology` count and ensure `/admin/users?role=radiology` works (it does generically). 
- **Frontend:** `(admin)/users.tsx` + dashboard get a Radiology category/tab and registration-request handling for `radiology` (approval already maps radiology fields).
- **Acceptance:** Radiology centers are listed, filterable, and approvable as their own type.
- **Commit:** `feat: admin radiology account type management`

### Task 7.2 — Full account info & documents in admin
- **Goal:** Admin sees complete provider info, not just approve/reject.
- **Backend:** Ensure `/admin/users` (and a `GET /admin/users/{id}`) return phone, address, `province/district/area`, `license_no`, `association_no`, `working_hours`, and uploaded document URLs (documents are uploaded at registration; ensure they're persisted/retrievable — currently `documents` go to `RegistrationRequest.data` but aren't stored on the approved `User`; add a `documents` JSON column on `User` and copy them on approval).
- **Frontend:** Admin user detail screen showing all fields + document viewer/links.
- **Acceptance:** Opening any provider shows full profile + their uploaded certificates/license docs.
- **Commit:** `feat: admin full account detail view with documents`

### Task 7.3 — Improved audit log
- **Goal:** Replace vague entries (e.g. "P1 requested medication") with rich, queryable detail: actor identity, items, quantities, related transaction.
- **Backend:** Standardize audit writes to include structured `details` (JSON): `{actor_id, actor_name, role, entity, entity_id, items:[{name, qty}], amount, ref}`. Update each write site (appointments, orders, prescriptions, dispensing) to emit this. Add `GET /admin/audit-logs` filters (by user, type, date) + pagination.
- **Frontend:** `(admin)/logs.tsx` renders the structured fields (who did what to whom, with quantities and links to the transaction) + filters.
- **Note:** The "pharmaceutical BI dataset" idea (selling aggregated demand data to manufacturers/distributors) is a **business/privacy decision** — flag for discussion; do not expose patient-identifiable data in any export. Keep this task to clear, complete internal logging only.
- **Acceptance:** A medication order log shows the user, drug names, quantities, and links to the order; logs are filterable.
- **Commit:** `feat: structured, detailed audit logging + admin filters`

---

## 10. Phase 8 — Unregistered patients

### Task 8.1 — Shadow records for unregistered patients + registration nudge
- **Goal:** Let a doctor create a file for a patient who isn't registered yet, and make it easy to convert that file once they register.
- **Backend:** Introduce a "provisional patient" concept: a `User` with `role=patient`, `is_active=false`, `verified=false`, no password, flagged `is_provisional=true`, identified by phone + generated `patient_unique_id`. Records/prescriptions attach to this provisional ID. On real registration with the same phone, merge/claim the provisional account (transfer records, set credentials, clear the flag) — keep a migration/merge endpoint.
- **Frontend:** Doctor/secretary "create patient by phone" flow when UID lookup finds nobody; generates a provisional file + a shareable registration link/QR encoding the phone + UID. Registration screen pre-fills and claims when that link is used.
- **Privacy:** Only the creating provider sees provisional records until the patient claims the account.
- **Acceptance:** Doctor creates a file for an unregistered phone; later registration with that phone inherits the records.
- **Commit:** `feat: provisional patient records with claim-on-registration`

---

## 11. Phase 9 — Hardening & release

### Task 9.1 — Responsiveness & keyboard pass (full sweep)
- **Goal:** Apply Task 0.5 patterns to every remaining screen.
- **Frontend:** Audit all `app/(role)/*` screens for keyboard overlap, safe-area, small/large screen behavior, and the bottom bar; fix stragglers.
- **Acceptance:** Manual pass on a small phone + a tablet for every role; no hidden inputs, no clipped tab bar.
- **Commit:** `fix: full responsiveness & keyboard sweep`

### Task 9.2 — Security, QA & production build
- **Goal:** Ship-ready build.
- **Checks:**
  - Authorization: every provider/admin endpoint enforces role + ownership (note `appointments` status/access endpoints currently use bare `get_current_user` — add ownership checks).
  - Secrets/config via env; CORS locked to the app origins; rate-limit auth endpoints.
  - Remove debug scripts/dumps (Pre-flight cleanup) and verify `.gitignore`.
  - Run backend `test_*` suite (move kept tests under `backend/tests/`), exercise main flows end-to-end.
  - `eas build` (config in `eas.json`) for store builds; verify `render.yaml` deploy.
- **Acceptance:** Clean build, green smoke tests, no unauthorized endpoints, no secrets in repo.
- **Commit:** `chore: security review, QA, production build config`

---

## 12. Suggested execution order (dependency-aware)

1. **0.1 → 0.2 → 0.3 → 0.4 → 0.5** (foundations everything else builds on)
2. **1.1 → 1.5 → 1.2 → 1.3 → 1.4** (identity & registration; 1.5 before 2.1)
3. **2.1 → 2.2**
4. **3.1 → 3.2 → 3.3 → 3.4 → 3.5**
5. **4.1 → 4.2 → 4.3**
6. **5.1 → 5.2**
7. **6.1**
8. **7.1 → 7.2 → 7.3**
9. **8.1**
10. **9.1 → 9.2**

Tag a release after each phase (`v0.1` … `v0.9`). Phases 0–4 deliver the highest-impact patient/doctor value; 5–9 complete the provider/admin and production story.

---

## 13. Cross-cutting risks & decisions to confirm

- **Maps:** Google Maps needs an API key (billing) for Android; iOS uses Apple Maps free. Confirm key provisioning before Task 0.3.
- **DB:** SQLite (`medlink.db`) is fine for pilot but for production consider Postgres (Render supports it) — affects migration approach in Task 0.1.
- **WhatsApp location table:** Task 0.2 depends on importing `المحافظات و النواحي بسورية.xlsx` accurately — confirm it's the final version.
- **Audit/BI dataset (admin req):** legal/privacy review required before any data sharing; plan keeps logging internal-only.
- **Provisional patients (Task 8.1):** confirm the claim/merge rule (match by phone) and consent expectations.
