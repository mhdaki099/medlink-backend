# MedLink — free online testing (100% free tier)

## Live services

| What | URL |
|------|-----|
| **API (Render free)** | https://medlink-backend-2e7a.onrender.com/api |
| **Web app (recommended — iPhone/Android)** | https://dist-two-mu-55.vercel.app/ |
| **Web (GitHub Pages mirror)** | https://mhdaki099.github.io/medlink-backend/ |
| **Download hub** | https://mhdaki099.github.io/medlink-backend/download.html |
| **Android APK (download)** | https://github.com/mhdaki099/medlink-backend/releases/latest |
| **Expo builds (optional EAS)** | https://expo.dev/accounts/mohamad_ani/projects/meddling/builds |

First API request after idle may take **~30–60s** (Render free cold start).

## iPhone (free — no App Store)

Apple does **not** allow a public “download IPA” link without a **paid** Apple Developer account ($99/year).

For free testing on iPhone use:

1. **Web app (recommended)** — open in Safari, optionally **Add to Home Screen**:
   https://mhdaki099.github.io/medlink-backend/
2. **Expo Go** (dev) — install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from the App Store, then run the project locally with `npx expo start` on the same Wi‑Fi.

## Android (free)

1. Run workflow **Deploy Test (Web + Android APK)** on GitHub (Actions tab).
2. When finished, download **medlink-debug.apk** from **Artifacts**.
3. On the phone: allow “Install unknown apps” for your browser/files app, then install the APK.

## One-click deploy from GitHub

1. **Actions** → **Deploy Test (Web + Android APK)** → **Run workflow**.
2. Wait ~15–25 minutes (web + APK build).
3. Use the Pages URL above and the APK artifact.

Ensure **Settings → Pages → Build and deployment → Source: GitHub Actions** is enabled (once per repo).

## Demo logins (password `123456`)

| Role | Email |
|------|--------|
| Patient | ahmed@medlink.sy |
| Doctor | dr.karim@medlink.sy |
| Pharmacy | pharma.nour@medlink.sy |
| Admin | admin@medlink.sy |

## Backend on Render

`render.yaml` defines the free Python API. Connect the repo at https://dashboard.render.com if you need a fresh deploy.
