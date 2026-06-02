# Build MedLink Android APK

The mobile app talks to the production API on Render:

- **API base:** `https://medlink-backend-2e7a.onrender.com/api`
- **Expo project:** [mohamad_ani / meddling](https://expo.dev/accounts/mohamad_ani/projects/meddling)
- **Builds dashboard:** https://expo.dev/accounts/mohamad_ani/projects/meddling/builds

API URL is set in `eas.json` (`apk` profile) and defaults in `src/services/api.ts`.

## Why builds sit in “Queued” (free tier)

EAS puts **Free plan** builds in a **low-priority queue**. At busy times (US daytime), waits of **30–60+ minutes** are normal — not a bug and not because “other builds” are blocking you on the project alone.

What *does* block you:

1. **Only one Android build runs per Expo account at a time** on the free tier. Extra submissions stay queued behind the first.
2. **Several queued builds** you started earlier still count — cancel the extras (below).
3. **Wrong Expo project** in `app.json` (`owner`, `slug`, `extra.eas.projectId`) — builds show on a different dashboard.

See [EAS build queues](https://github.com/expo/fyi/blob/main/eas-build-queues.md) and [build status](https://expo.dev/eas-build-status).

## Option A — EAS Build (cloud)

### One-time: link this repo to `meddling`

If you see **Entity not authorized** for project `d742f235-...`, that ID belongs to another account (`mhdaki099`). Remove `extra.eas.projectId` from `app.json` (already done in this repo), then:

```bash
cd medlink-backend
npm install
npx eas login    # use mohamad_ani
npx eas init     # choose existing project "meddling" (writes a new projectId)
```

### Build APK (recommended flow)

```bash
# 1. Cancel any old queued APK builds (skips if none; safe to run)
npm run build:apk:cancel

# 2. Start a fresh build
npm run build:apk

# 3. Optional: block terminal until finished
npm run build:apk:wait
```

Check status anytime:

```bash
npm run build:apk:list
```

When the build finishes, open the builds page above and download the `.apk`.

### CI / non-interactive

1. Create a token: https://expo.dev/settings/access-tokens (account **mohamad_ani**)
2. `export EXPO_TOKEN=your_token`
3. `npm run build:apk:cancel && npm run build:apk`

Or run the GitHub Action **Build Android APK** with `EXPO_TOKEN` as a repository secret.

### Faster queue (optional)

- **Starter plan** ($19/mo): high-priority queue — https://expo.dev/pricing
- **Off-peak**: late evening / early morning in US timezones
- **Local EAS build** (needs Java 17 + Android SDK): `eas build --platform android --profile apk --local`

## Option B — Local release APK

Requires **Java 17+**, **Android SDK**, and Android Studio.

```bash
cd medlink-backend
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

APK: `android/app/build/outputs/apk/release/app-release.apk`

## Verify API before installing

```bash
curl -s https://medlink-backend-2e7a.onrender.com/api/doctors/specializations | head -c 120
```

## Demo logins (password `123456`)

| Role     | Email                 |
|----------|-----------------------|
| Patient  | ahmed@medlink.sy      |
| Doctor   | dr.karim@medlink.sy   |
| Pharmacy | pharma.nour@medlink.sy|
| Admin    | admin@medlink.sy      |
