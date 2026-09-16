# SIMBA Mobile (parents)

Native app for parents, built with **Expo SDK 57 / React Native 0.86 / expo-router**. It talks to the same
FastAPI backend as the Health Manager web portal and only uses the `/api/v1/user/*` endpoints.

## What it does

| Tab / screen | Features |
|---|---|
| **Home** | Greeting, child switcher, latest measurement with WFA/HFA/BFA z-scores and Permenkes status, quick actions, top alerts, 7-day nutrition vs AKG, immunization and KPSP summary |
| **Growth** | WHO growth chart (weight / height / BMI-for-age with 3rd–97th and 15th–85th bands, your child's curve), latest z-score grid, full history; **Log measurement** modal returns the classification immediately |
| **Nutrition** | Day picker, daily totals vs AKG 2019 with progress bars, meals grouped by type, swipe-free delete; **Add meal** searches the 1,600-item toddler-safe food database with a servings stepper |
| **Growth+ (Development)** | KPSP checklist for the child's age bracket, Yes / Not yet answers saved instantly, interpretation (Sesuai / Meragukan / Penyimpangan) with guidance |
| **More** | Immunization (Kemenkes schedule, tap to mark a dose given / undo), Calendar (visits, checkups, done-toggle), Alerts, Growth report with **Share PDF**, Explore articles, edit / add children, sign out |
| **Auth** | Sign in, create account (then add first child), secure token storage (`expo-secure-store`), automatic sign-out on 401 |

## Run it

```bash
cd mobile
npm install
cp .env.example .env         # set EXPO_PUBLIC_API_URL (see below)
npx expo start               # press a = Android emulator, i = iOS simulator, w = web, or scan with Expo Go
```

The app finds the backend automatically: on a phone or emulator it uses the machine that serves the Expo
bundle (your PC's LAN IP) on port 8000; on web it uses the browser's host. Only set `EXPO_PUBLIC_API_URL` in
`.env` if the backend runs somewhere else (then restart `expo start` — env values are baked into the bundle).

For a real phone, start the backend on all interfaces and allow the port through Windows Firewall once:

```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```
```powershell
netsh advfirewall firewall add rule name="SIMBA API 8000" dir=in action=allow protocol=TCP localport=8000
```

Requests time out after 15 s with a message that names the URL being tried, so a wrong address is visible
instead of an endless spinner.

Test account on the dev database: `uitest_0914@example.com` / `secret123` (children Sari and Budi).

## Project layout

```
mobile/
  app/                     expo-router file routes
    _layout.tsx            providers (auth, children) + root stack
    index.tsx              splash → redirect to tabs or login
    login.tsx  register.tsx  add-child.tsx
    (tabs)/                index (Home), growth, nutrition, development, more
    measurement.tsx  meal.tsx           modals
    immunization.tsx calendar.tsx alerts.tsx reports.tsx explore.tsx
    article/[id].tsx  child/[id].tsx
  src/
    lib/api.ts             typed API client (mirror of frontend/src/lib/api.ts, parent endpoints only)
    lib/storage.ts         SecureStore on device, AsyncStorage on web
    lib/format.ts theme.ts
    state/auth.tsx child.tsx           React context providers
    components/ui.tsx      Screen, Card, Button, Field, Pill, Segmented, Stat, ListItem, Progress…
    components/GrowthChart.tsx         react-native-svg WHO chart
    components/ChildSwitcher.tsx
  assets/                  icon, adaptive icon, splash, logo_mark (generated from frontend/src/imports/logo_mark.png)
```

## Checks

```bash
npm run typecheck        # tsc --noEmit (strict, typed routes)
```

## Building a store binary

Use EAS: `npm i -g eas-cli && eas build -p android --profile preview` (creates an APK you can sideload).
`app.json` already has `android.package` / `ios.bundleIdentifier` = `id.simba.parent`.
