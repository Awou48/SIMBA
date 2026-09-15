# SIMBA — Step-by-step test guide

This guide walks through every feature, in the order a real user would meet it. Each step says **what to do**
and **what you should see**. Steps marked 🔍 are optional API checks you can run in Swagger
(`http://127.0.0.1:8000/docs`) to confirm the data behind the screen.

Estimated time for the full pass: ~30 minutes.

---

## 0. Setup (once)

### 0.1 Prerequisites
- PostgreSQL running locally with a database named `simba_db` (any empty database works).
- Python 3.12+, Node 20+.

### 0.2 Backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate        # Windows Git Bash — use venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env                # edit DATABASE_URL, SECRET_KEY, FIRST_ADMIN_* if you like
python seed_db.py
```
**Expect:** the seeder prints something like
```
superadmin         seeded 1 rows
foods              seeded 1651 rows
akg_targets        seeded 4 rows
growth_standards   seeded 366 rows
milestones         seeded 20 rows
articles           seeded 4 rows
superadmin login: admin@simba.id / (FIRST_ADMIN_PASSWORD from .env)
```
Run it a second time: every line should say `skipped (already populated)` — seeding is idempotent.

```bash
uvicorn main:app --reload
```
**Expect:** `http://127.0.0.1:8000/health` returns `{"status":"ok"}`; `http://127.0.0.1:8000/docs` shows the Swagger UI
with tag groups *User Authentication … Admin System*.

### 0.3 Automated tests (no Postgres needed)
```bash
cd backend && pytest
```
**Expect:** `82 passed`.

### 0.4 Frontend
```bash
cd frontend
cp .env.example .env                # optional — defaults to http://127.0.0.1:8000
npm install
npm run typecheck                   # expect: no output, exit 0
npm run dev                         # http://localhost:5173
```
**Expect:** `http://localhost:5173` shows the parent app (phone mock-up) with the SIMBA splash screen, then the
onboarding slides; `http://localhost:5173/hm/login` shows the Health Manager web portal sign-in page.

> If a screen ever shows **"Cannot reach the SIMBA server"**, the backend isn't running on port 8000.
> If a page 404s right after you pulled new code, restart `uvicorn` — its file watcher on Windows sometimes misses new route files.

---

## 1. Authentication & security

| # | Do | Expect |
|---|----|--------|
| 1.1 | Splash → onboarding → **Log In** → tap **Create Account**. Enter a name, email `parent1@test.com`, password `secret123`, tap **Create Account 🌟**. | Redirected to the login screen. |
| 1.2 | Try to register **the same email again**. | Red banner: *Email already registered*. |
| 1.3 | Try to register with password `123`. | Red banner mentioning `password` / string too short (validation from the API). |
| 1.4 | Log in as Parent with a **wrong password**. | Red banner: *Incorrect email or password*. |
| 1.5 | Log in with the correct password. | You land on **Home** with an "➕ Add a Child Profile" button. |
| 1.6 | In the browser, open `http://localhost:5173/hm/dashboard` directly while logged in as a parent. | You are bounced to `/login` (role guard). |
| 1.7 | Log out (Settings → **Secure Log Out**), then open `http://localhost:5173/home` directly. | Bounced to `/login`. |
| 1.8 | 🔍 In Swagger, call `GET /api/v1/admin/foods` **without** authorizing. | `401 Unauthorized`. |
| 1.9 | 🔍 Authorize Swagger with the parent's token (use the *User Authentication* login), then call `GET /api/v1/admin/foods`. | Still `401` — parent tokens are rejected by admin routes. |
| 1.10 | 🔍 `POST /api/v1/admin/auth/register` with a parent or plain-admin token. | `401` / `403` — only a superadmin may create admins. |

Session expiry: tokens last 7 days; an expired/invalid token on any screen clears the session and returns you to login.

---

## 2. Child profiles

| # | Do | Expect |
|---|----|--------|
| 2.1 | Home → **Add a Child Profile**. Name `Sari`, date of birth **exactly 12 months ago today**, area `Tangerang Selatan`, gender Girl → **Let's Go!** | Back on Home; the header pill shows **Sari · 1 year, 0 months old**. |
| 2.2 | Add a second child `Budi`, born 24 months ago, Boy, area `Kota Tangerang`. | Home now shows Budi as active and "· 2 profiles" in the pill. |
| 2.3 | Tap the child pill. | A dropdown lists Sari and Budi with a ✓ on the active one and an **Add another child** row. |
| 2.4 | Pick **Sari**. Reload the page. | Sari stays active after reload (selection is persisted). |
| 2.5 | Settings tab. | Both children are listed with age, gender and area; the active one has an orange ring and "· Active". Tapping the other one switches. |
| 2.6 | 🔍 Log in as a **second parent** in Swagger and call `GET /api/v1/user/children/{Sari's id}`. | `404` — children are invisible to other parents (never `403`, to avoid id enumeration). |

---

## 3. Growth tracker (WHO z-scores)

Use **Sari (12 months, girl)** for the numbers below.

| # | Do | Expect |
|---|----|--------|
| 3.1 | Home → **Log Weight & Height** (or **Data** tab). Enter weight `8.9`, height `74`, date = today → **Save Entry**. | Green card: *Height-for-age z ≈ 0.0 · Normal*, *Weight-for-age z ≈ 0.0 · Berat Badan Normal*, *Weight-for-height z ≈ 0 · Gizi Baik*, *BMI 16.25 (z ≈ 0)*. These are the WHO medians for a 12-month-old girl. |
| 3.2 | Log a second entry **dated 6 months ago**: weight `7.3`, height `65.7`. | Saved; the **history list** now has two rows, newest first, with WFA/HFA/WFH z-scores and a status badge each. |
| 3.3 | Look at the **chart**. Switch tabs **Weight / Height / BMI**. | A shaded band (WHO 3rd–97th percentile), a dashed median line, and Sari's points inside the band. The x-axis is age in months. |
| 3.4 | Log an entry with height `66` at today's date. | The saved card shows **Pendek/Sangat Pendek** in red; the WHO verdict chips under the form turn red; the history badge is red. |
| 3.5 | Try a **future date**. | Red banner: *Measurement date cannot be in the future*. |
| 3.6 | Try weight `0`. | Red banner mentioning `weight_kg`. |
| 3.7 | Go to **Home**. | The dark **Growth Overview** card shows the latest weight/height, a sparkline of weights and a status line (e.g. *Normal · Berat Badan Normal · Gizi Baik*). |
| 3.8 | 🔍 `GET /api/v1/user/child/{id}/measurements` | Each row includes `wfa_zscore, lhfa_zscore, wfh_zscore, bfa_zscore, bmi` and four status strings. |

---

## 4. Food diary & nutrition (AKG)

| # | Do | Expect |
|---|----|--------|
| 4.1 | Home → **Log Meals**. | Empty diary for **Today**; the teal card shows `0 kcal` and **Target: 1350 kcal (1-3 tahun)** (Sari is 12 months → the 1–3 year AKG bracket). Protein/Carbs/Fat bars at 0%. |
| 4.2 | Tap **Add food to Breakfast**. Type `bubur ayam`. | A bottom sheet lists matches such as *super bubur rasa ayam* — multi-word search matches all words in any order. Flagged (not toddler-safe) foods show ⚠️. |
| 4.3 | Pick a food, set servings to **1.5** with the ＋ button. | The line under the stepper shows the scaled kcal / P / C / F. |
| 4.4 | Tap **Log this food**. | Sheet closes; the item appears under **Breakfast · 1**; the summary card and AKG bars update; the donut shows the macro split. |
| 4.5 | Switch to **Snack**, add a fruit (search `pisang`). | Snack tab shows `· 1`; totals increase. |
| 4.6 | Tap the 🗑 on the snack. | Removed; totals decrease immediately. |
| 4.7 | Use **‹** to go to **Yesterday**. | Empty diary for yesterday (meals are per day); you can still add foods to past days. Go forward: the **›** button is disabled on Today. |
| 4.8 | Go to **Home**. | **Today's Nutrition** bars show real values, e.g. `255/1350 kcal`. |
| 4.9 | 🔍 Delete the food you logged from the **admin** Food Database (section 9.3), then `GET /child/{id}/meals`. | The meal is still there with its `food_name` and nutrients (snapshotted), `food_id` is `null`. |

---

## 5. Development milestones (KPSP)

| # | Do | Expect |
|---|----|--------|
| 5.1 | Home → purple **Development Milestones** card (or `/milestones`). | The **12–24 mo** chip is marked ✦ (Sari's bracket), 5 questions in Indonesian, each with **Yes / Not yet**. Summary card: `0/5 achieved`. |
| 5.2 | Answer **Yes** to 4 and **Not yet** to 1. | Summary: `4/5 achieved` 🤔 **KPSP result: Meragukan (needs re-check in 2 weeks)** and an orange guidance card. |
| 5.3 | Change the last one to **Yes**. | `5/5` 🎉 **Sesuai (on track)**; the guidance card disappears. Each question shows *Answered <date>*. |
| 5.4 | Tap the **2–3 yr** chip. | Different 5 questions (bracket override); answers are stored per question so switching back keeps your answers. |
| 5.5 | Go to **Home**. | The milestones card reads `12 - 24 Months: 5/5 achieved · Sesuai`. |

---

## 6. Immunization & health calendar

| # | Do | Expect |
|---|----|--------|
| 6.1 | Home → **Immunization Schedule** (Calendar tab). | Orange coverage card: `0/20 doses given`, with counts of overdue/due/upcoming and **Next: Hepatitis B (dose 0) · overdue**. For a 12-month-old, doses up to 9 months are **Overdue**, PCV3 is **Due now**, 18-month boosters **Upcoming**. |
| 6.2 | Calendar: the current month shows coloured dots; use **‹ ›** to move months. Tap a day with a dot. | The agenda filters to that day; **Show all** restores it. |
| 6.3 | In **Vaccine record**, tap ✓ next to *Hepatitis B (dose 0)*. | A sheet opens: **Date given** defaults to the due date (birth date) because it's in the past. Add a note, **Save to vaccine record**. |
| 6.4 | | Coverage becomes `1/20`; the dose disappears from the pending list; **Show all 20** reveals it as **Given** with the date and an undo (↶) button. |
| 6.5 | Tap ↶ on it. | Back to `0/20`. |
| 6.6 | Try to record a dose with a **future** date. | Red banner: *Given date cannot be in the future*. |
| 6.7 | **Add Event**: title `Posyandu weigh-in`, a date next week, type **Doctor Visit**, a note → **Save Event ✓**. | Calendar jumps to that month with a teal dot; the agenda lists it with 📝 note. |
| 6.8 | Tap **Mark done** on it, then **Mark not done**, then 🗑. | Strike-through + faded, then restored, then removed. |

---

## 7. Early-warning alerts

| # | Do | Expect |
|---|----|--------|
| 7.1 | Home header bell / `/alerts`. | Alerts are **derived from Sari's real data**, highest severity first. With the data so far you should see e.g. *17 vaccine dose(s) overdue* (high), *Energy intake below target* (high/medium) and *KPSP …* if not Sesuai. |
| 7.2 | Tap an alert. | It is marked read (dot disappears) and you are taken to the relevant screen (Growth / Food Diary / Milestones / Immunization). |
| 7.3 | Use the filter chips (Growth / Nutrition / …) and **Mark all read**. | List filters; unread counter goes to *All caught up!*. Read state survives a reload (stored per child in the browser). |
| 7.4 | Log a stunted measurement (height `62` today) and revisit Alerts. | New **high** alert *Height-for-age below -2 SD*; the *Growth on track* alert disappears. The blue **Consult** banner appears whenever any high alert exists. |

---

## 8. Growth report & PDF

| # | Do | Expect |
|---|----|--------|
| 8.1 | Home → **Download Report** (or `/reports`). | Four tiles (latest weight, height, BMI, HFA z) coloured by z-score; WHO status chips; a trend chart with Weight/Height/BMI tabs built from Sari's real entries; **Progress over N months** rows; a **Summary** of nutrition, KPSP, immunization and alert counts (each row navigates). |
| 8.2 | Tap **Download PDF Report**. | The browser downloads `simba-report-sari.pdf`. Open it: title, latest WHO assessment table, progress, measurement history, 7-day nutrition, KPSP & immunization line, attention points, disclaimer. |
| 8.3 | Switch the active child to a child **with no measurements**, open Reports. | Tiles show `--`, chart area says *No measurements yet*; the PDF still downloads (with "No measurements recorded yet."). |

---

## 9. Health Manager web portal

The portal is a **desktop website** at `http://localhost:5173/hm/login` (no phone frame). Use a browser window at
least ~1024px wide to see the sidebar; below that it collapses into a ☰ drawer.

### 9.1 Sign in & shell
| Do | Expect |
|----|--------|
| Open `/hm/login`. | Split page: SIMBA brand panel on the left, sign-in form on the right. |
| Sign in with a **wrong** password. | Red banner *Incorrect admin email or password*. |
| Sign in with the superadmin from `backend/.env` (`admin@simba.id` / `admin1234`). | Redirect to **Dashboard**. Sidebar groups: Monitor (Dashboard, Children, Regions), Reference (WHO Standards, AKG Targets, Food Database, KPSP Milestones), Content (Education), Admin (System). Your name and role at the bottom. Top bar: page name, **API docs**, **Log out**. |
| Open `/hm/dashboard` in a private window (no session). | Redirected to `/hm/login`. |
| Try `/hm/dashboard` while logged in as a **parent** (parent app session). | Redirected to `/hm/login` - parent tokens never open the portal. |
| In the parent app login screen, tap the **Health Manager** tab. | You land on `/hm/login` (the portal is a separate site, not inside the phone frame). |
| Shrink the window below 1024px. | Sidebar hides; the ☰ button opens it as a drawer. |

### 9.2 Dashboard
| Do | Expect |
|----|--------|
| Land on **Dashboard**. | Four KPI cards: *Children registered*, *Stunting prevalence* (coloured by WHO threshold), *Immunization backlog*, *Activity, last 30 days*. A **Nutritional status** donut (each child counted once by latest measurement), a **Stunting rate by region** bar chart and a **Recent measurements** table with z-score chips. |
| Click a child name in Recent measurements. | Opens that child detail page. |

### 9.3 Children registry
| Do | Expect |
|----|--------|
| **Children** in the sidebar. | Table of every child: age, region, **masked parent email** (`u***@example.com`), last measured (+ count), latest weight/height, HFA/WFA/WFH z-score chips (green <=1, amber <=2, red >2), status badges (Normal / Stunted / Underweight / Wasted / Overweight / Not measured 30d+ / No measurement). |
| Type `Sari` in the search box. | List filters after a short debounce; the URL gains `?q=Sari` (filters are shareable). |
| Choose a region in the dropdown, then click the **Stunted** status chip. | Combined filtering; **Clear filters** appears when nothing matches. |
| With more than 25 children, use the pager arrows. | Page indicator updates; URL gains `page=`. |
| Click **Sari**. | Detail page (9.4). |

### 9.4 Child detail
| Do | Expect |
|----|--------|
| Header shows name, sex, age, birth date, region, masked parent. | Four cards: Height-for-age, Weight-for-age, Weight-for-height (z chips + status) and Immunization (given/total, overdue/due). |
| **Growth chart** with Weight/Height/BMI tabs. | WHO 3rd-97th band, dashed median, the child's points connected. |
| **Attention points** panel. | The same alerts the parent sees (high/medium), colour-coded. |
| **Measurement history**, **Nutrition last 7 days** (bars vs AKG + expandable logged items), **Development (KPSP)**. | Match what the parent app shows for the same child. |
| **Download PDF report**. | Downloads `simba-report-<name>.pdf` - the same report the parent can generate. |

### 9.5 Regions
| Do | Expect |
|----|--------|
| **Regions**. | Three summary cards, a bar chart coloured by WHO threshold and a table (children, measured, stunted, severe, rate, status). **View children** opens the registry pre-filtered to that region. Children without a region appear as *Unspecified*. |

### 9.6 WHO Standards
| Do | Expect |
|----|--------|
| **WHO Standards**. Toggle Boys/Girls and Weight / Length-height / BMI-for-age. | Chart with P3/P15/P50/P85/P97 curves and shaded band; percentile table with 1/3/6-month steps. Boys weight-for-age P50 at 12 mo is about 9.6 kg. Read-only. |

### 9.7 AKG Targets
| Do | Expect |
|----|--------|
| **AKG Targets**. | Editable grid of the 4 seeded rows; **Save changes** is disabled until something changes. |
| Change protein for `1-3 tahun` to 21 then **Save changes**. | Green *Saved at ...* line; reload - value persists; the parent Food Diary now shows 21 g as the target. **Discard** reverts unsaved edits; **Add row** / trash icon add and remove rows. |

### 9.8 Food Database
| Do | Expect |
|----|--------|
| **Food Database**. | First 50 of 1,651 foods with paging. Search `bubur ayam` returns items containing both words. Category dropdown and **Toddler-safe only** filter server-side. |
| **Add food**, fill the dialog, **Save**. | New row appears (search for it). The pencil edits in the same dialog; the trash icon asks for confirmation. |

### 9.9 KPSP Milestones
| Do | Expect |
|----|--------|
| **KPSP Milestones**. | 20 questions grouped in panels per age bracket; domain chips filter. |
| Eye icon on a question. | Toggles Active/Inactive (inactive rows fade; parents no longer see them). Pencil opens the editor dialog; **Add question** creates a new one (choose bracket + domain). |

### 9.10 Education
| Do | Expect |
|----|--------|
| **Education**. | Two panes: article list (left) and editor (right). Select an article, edit fields, **Save** (enabled only when changed). **Preview** renders it as parents see it. **Publish/Unpublish** toggles visibility in the parent app Explore tab. **New article** starts a draft. |

### 9.11 System
| Do | Expect |
|----|--------|
| **System**. | Cards: database, reference data Complete/Incomplete, last measurement, admin accounts. **Data overview** counts, **Reference data** checklist with **Load missing** (superadmin only), **Health Manager accounts** table with **Add account** (superadmin only). |
| Add an account `hm2@simba.id`, log out, sign in as it. | Sidebar shows *Health Manager*; the System page hides **Load missing** and **Add account**. |

---

## 10. Mobile app (Expo)

### 10.1 Start
1. `cd mobile && npm install && cp .env.example .env`.
2. Backend must be reachable from the device: run `uvicorn main:app --host 0.0.0.0 --port 8000` and set
   `EXPO_PUBLIC_API_URL` (Android emulator `http://10.0.2.2:8000`, iOS simulator/web `http://127.0.0.1:8000`,
   real phone `http://<PC LAN IP>:8000`).
3. `npx expo start` → `a` (Android), `i` (iOS), `w` (web at http://localhost:8081) or scan the QR in Expo Go.
   Expect the splash lion, then the Sign In screen.

### 10.2 Auth & children
- Sign in with `uitest_0914@example.com` / `secret123` → Home shows "How is Sari doing?" with the child switcher.
- Tap the switcher → sheet lists Sari and Budi; pick Budi → every tab now shows Budi's data; relaunch the app →
  Budi is still selected.
- **Create an account** → after registering you land on "Add your child"; save → Home.
- More → Sign out → back to Sign In; the token is removed from SecureStore.

### 10.3 Growth
- Growth tab: chart shows teal 3rd–97th / 15th–85th bands, the WHO median and Sari's purple curve; switch
  Weight / Height / BMI. Latest grid shows z-scores with coloured pills; WFH shows "Not computed" above 24 mo.
- Home → **Log new measurement** → 10.4 kg / 80 cm today → result screen with the Permenkes classification and
  four z-score rows → Done → Home hero and Growth history update.
- Future date or 0 kg → red validation message.

### 10.4 Nutrition
- Nutrition tab shows today's totals against AKG 1–3 tahun. **Add a meal** → type "telur" → pick an item →
  Lunch, 1.5 servings → **Log meal** → totals and progress bars update; trash icon removes it (confirm dialog).
- Arrows move a day back; the forward arrow is disabled at today.

### 10.5 Development, immunization, calendar
- Growth+ tab: answer Yes / Not yet → hero counts update; 4/5 → "Meragukan", 5/5 → "Sesuai".
- More → Immunization: tap an unchecked dose → becomes Given (today) and counters update; tap again → Undo.
- More → Calendar: Add → title/date → Save → appears in Upcoming; checkbox marks done; trash deletes
  (vaccine-linked events refuse and point to Immunization).

### 10.6 Alerts, report, explore
- Bell badge on Home = number of alerts; Alerts screen lists them, tapping opens the relevant tab.
- More → Growth report → **Share PDF report** → native share sheet with `SIMBA-Sari-<date>.pdf`
  (on web it opens in a new tab).
- More → Explore → filter chips, search, open an article → body paragraphs render.

### 10.7 Type check
```bash
cd mobile && npm run typecheck
```

## 11. Database migrations (for deployment)

```bash
cd backend
alembic upgrade head      # apply all migrations to the DB in .env
alembic check             # "No new upgrade operations detected." = models and DB match
```
For a database that was created earlier by `create_all`/`sync_schema` (like a dev DB), run `alembic stamp head`
once instead of `upgrade`. If `alembic check` lists tables that are not in the models, they are leftovers from an
older prototype and can be dropped, e.g. `DROP TABLE immunization_events, immunization_logs, nutrition_logs;`.

---

## Quick regression checklist

```
[ ] pytest → 82 passed
[ ] npm run typecheck → clean
[ ] npm run build → built
[ ] mobile: npm run typecheck → clean; sign in, switch child, log measurement, log meal, KPSP answer, mark dose, share PDF
[ ] register / login / wrong password / role guard / logout
[ ] add 2 children, switch, region shown in Settings
[ ] measurement at WHO median → z ≈ 0; stunted height → red; future date rejected
[ ] food search "bubur ayam" → log 1.5 servings → totals + Home bars update
[ ] KPSP 4/5 → Meragukan; 5/5 → Sesuai
[ ] record HB0 dose with past date → 1/20; undo → 0/20; add/complete/delete event
[ ] alerts reflect data; tap navigates; mark all read persists
[ ] report tiles/chart from data; PDF downloads and opens
[ ] Portal: /hm/login guard, dashboard KPIs, children registry filters + detail page + PDF, regions, WHO tables, AKG save, food CRUD + search, KPSP toggle/CRUD, article draft→publish visible in Explore, system seed + add admin
```
