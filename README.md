# MedLink Healthcare Super App 🏥

**منصة الرعاية الصحية الشاملة — سوريا**

---

## 🚀 Quick Start

### Step 1 — Update Node.js (Required!)
**Your current Node.js (v20.16.0) is too old.** Expo SDK 55 requires **Node.js >= 20.19.4 (LTS)**.

Download the latest LTS from: https://nodejs.org/en/download

After installing, verify: `node --version` → should be `20.19.x` or higher.

---

### Step 2 — Start the Backend (Terminal 1)
```bash
cd C:\Users\mohamad.al\.gemini\antigravity\scratch\medlink
python start_backend.py
```
✅ Backend runs on **http://localhost:8000**
📖 API Docs: **http://localhost:8000/docs**

---

### Step 3 — Start the Frontend (Terminal 2)
```bash
cd C:\Users\mohamad.al\.gemini\antigravity\scratch\medlink
npx expo start --web --port 8081
```
🌐 Web app runs on **http://localhost:8081**

---

## 🔑 Demo Accounts (password: `123456` for all)

| الدور | البريد الإلكتروني |
|-------|-------------------|
| مريض | ahmed@medlink.sy |
| طبيب | dr.karim@medlink.sy |
| صيدلية | pharma.nour@medlink.sy |
| مختبر | lab.fadi@medlink.sy |
| مستودع | wh.main@medlink.sy |
| مدير | admin@medlink.sy |

> **Tip:** Use the Quick Login chips on the login screen — no typing needed!

---

## 📱 Expo Go (Mobile Testing)

1. Install **Expo Go** from App Store / Google Play
2. Run: `npx expo start` (without --web flag)
3. Scan the QR code with Expo Go

> **Note:** For Expo Go to connect to the backend, make sure your phone and PC are on the same Wi-Fi network, and change `localhost` in `src/services/api.ts` to your PC's local IP (e.g., `http://192.168.1.X:8000/api`)

---

## 🏗️ Project Structure

```
medlink/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout (RTL + AuthProvider)
│   ├── index.tsx           # Animated landing page
│   ├── (auth)/             # Login, Register
│   ├── (patient)/          # Patient: Home, Doctors, Pharmacies, Labs, Records, History
│   ├── (doctor)/           # Doctor: Dashboard, Appointments, Patients, Profile
│   ├── (pharmacy)/         # Pharmacy: Dashboard, Medicines, Orders, Warehouse
│   ├── (lab)/              # Lab: Dashboard, Bookings, Tests, Results
│   ├── (warehouse)/        # Warehouse: Dashboard, Inventory, Orders
│   └── (admin)/            # Admin: Dashboard, Users, Audit Logs
├── src/
│   ├── theme/index.ts      # Design tokens (colors, spacing, shadows)
│   ├── services/api.ts     # Full API client for all backend endpoints
│   └── contexts/           # AuthContext (login/register/logout)
└── backend/
    ├── main.py             # FastAPI app
    ├── database.py         # In-memory DB with 15+ test users
    ├── auth_utils.py       # JWT authentication
    └── routers/            # 10 routers (auth, patients, doctors, etc.)
```

---

## 🌟 Features by Role

### 🧑‍⚕️ Patient
- Browse & filter doctors by specialization
- One-tap appointment booking
- Browse medicines with cart & order system
- Book lab tests (with prep instructions)
- View medical records + lab results
- Full history (appointments, orders, lab tests)
- Revoke doctor access to medical records

### 👨‍⚕️ Doctor
- Dashboard with appointment stats
- Accept / reject / complete appointments
- View patient list with allergies & medical info
- Request access to patient medical records
- Full profile display

### 💊 Pharmacy
- Manage incoming medicine orders (accept/deliver)
- Manage medicine inventory with stock status
- Add new medicines
- Order supplies from warehouses

### 🧪 Lab
- Manage test bookings (start / complete)
- Upload detailed test results with values
- Color-coded result parameters (normal/high/low)

### 🏭 Warehouse
- Dashboard with inventory stats + low-stock alerts
- Accept / ship / confirm delivery of pharmacy orders
- Full inventory view

### 🛠️ Admin
- System health dashboard (user counts, appointment stats)
- Manage all users (verify, activate/deactivate, delete)
- Filter users by role
- Full color-coded audit log

---

## 🌍 Arabic RTL Support
The app is fully right-to-left with `I18nManager.forceRTL(true)`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Framework | React Native + Expo SDK 55 |
| Navigation | Expo Router (file-based) |
| Backend | FastAPI (Python) |
| Auth | JWT + bcrypt |
| Styling | StyleSheet (RTL-ready) |
| State | React Context API |
| Data | In-memory (no DB needed) |
