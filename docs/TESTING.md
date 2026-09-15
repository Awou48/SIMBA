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
**Expect:** `79 passed`.

### 0.4 Frontend
```bash
cd frontend
cp .env.example .env                # optional — defaults to http://127.0.0.1:8000
npm install
npm run typecheck                   # expect: no output, exit 0
npm run dev                         # http://localhost:5173
```
**Expect:** the phone mock-up appears with the SIMBA splash screen, then (no session yet) the onboarding slides.

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

## 9. Health Manager portal

Log out, choose the **Health Manager** tab on the login screen and sign in with the superadmin from `backend/.env`
(default `admin@simba.id` / `admin1234`).

### 9.1 Dashboard
| Do | Expect |
|----|--------|
| Land on `/hm/dashboard`. | Total measurements and stunted cases from the database; module tiles navigate to each section. |

### 9.2 Regional Trends
| Do | Expect |
|----|--------|
| Open **Trends**. | Tabs **All regions / Tangerang Selatan / Kota Tangerang (/ Unspecified)** generated from the children you created. Cards: stunting rate (per child, latest measurement), children measured/total, severely stunted. A bar chart coloured by WHO threshold (>20% orange, >30% red) and a card per region with a Normal/Stunted/Severe/Unmeasured breakdown. Tap a region card to select it. |

### 9.3 Food Database
| Do | Expect |
|----|--------|
| Open **Content → Food Database**. | *100+ items* — the first 100 of 1,651 foods; a hint says to refine the search. |
| Type `tempe`. | ~19 results after a short debounce; category chips filter server-side. |
| **Add** → name `Tempe Bacem Test`, category Protein, energy 190, protein 14 → **Save**. | Appears at the top of the list. |
| Edit it (✏️), change energy to 200 → Save. | Updated in place. |
| Delete it (🗑) → confirm. | Removed. (If a parent had logged it, their meal history keeps the snapshot — see 4.9.) |

### 9.4 AKG Targets
| Do | Expect |
|----|--------|
| Open **Standards → AKG nutrition targets** (or `/hm/akg-targets`). | The 4 seeded rows (`0-5 bulan … 4-6 tahun`); micronutrient columns show `—` where the source data has none. |
| Edit a row, change protein, **Save all to database**. | Green success message; reload the page — the change persists. Parents' AKG targets in the Food Diary now use the new value. |

### 9.5 WHO Growth Standards
| Do | Expect |
|----|--------|
| Open **Standards**. | Boys/Girls toggle × Weight/Height/BMI-for-Age; a chart with the 3rd–97th band and median; a percentile table (every 1/3/6 months). Boys weight-for-age at 12 mo: P50 ≈ 9.6 kg. Read-only, with a note on how to refresh from the CSVs. |

### 9.6 Milestones (KPSP bank)
| Do | Expect |
|----|--------|
| Open **Content → Milestones**. | 20 questions grouped by bracket; domain chips filter. |
| Expand a question → **Deactivate**. | It fades and is labelled INACTIVE. As a parent, that question no longer appears in the checklist. Re-activate it. |
| **Add** a question for **3 - 4 Years** → Save. | Appears under a new *3 - 4 Years* group. Delete it afterwards (confirm dialog). |

### 9.7 Education articles
| Do | Expect |
|----|--------|
| Open **Content → Education**. | 4 seeded Indonesian articles, all *Published*. |
| **New** → fill title, category, author, read time, summary, body; leave as **Draft** → Save. | Listed as *📝 Draft*. As a parent, **Explore → Insights** does **not** show it. |
| Tap **Publish** on it. | As a parent, Explore now lists it; tapping opens an in-frame reader with the body paragraphs. The Explore search box filters articles. |
| Edit / delete it. | Works with confirmation on delete. |

### 9.8 System
| Do | Expect |
|----|--------|
| Open **System**. | Header shows `SIMBA v1.2.0 · SIMBA Admin (superadmin)`, status tiles (API, database name, last measurement, reference data Complete/Incomplete). **Data overview** counts (parents, children, measurements, meals …). **Reference data** list with green ✓ counts. |
| Tap **Load missing reference data** → confirm. | Message *Seeded: Foods 0 · AKG rows 0 …* (everything already loaded → all zeros). |
| Expand **Health Manager accounts**. | Real admin accounts with 👑 for superadmins and "(you)" on yours. |
| **Add Health Manager account** → name, email `hm2@simba.id`, password 8+ chars → **Create account**. | Appears in the list. Log out and log in as `hm2@simba.id`: the System page shows *Only a superadmin can (re)load reference data* and no "Add account" button. |

---

## 10. Database migrations (for deployment)

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
[ ] pytest → 79 passed
[ ] npm run typecheck → clean
[ ] npm run build → built
[ ] register / login / wrong password / role guard / logout
[ ] add 2 children, switch, region shown in Settings
[ ] measurement at WHO median → z ≈ 0; stunted height → red; future date rejected
[ ] food search "bubur ayam" → log 1.5 servings → totals + Home bars update
[ ] KPSP 4/5 → Meragukan; 5/5 → Sesuai
[ ] record HB0 dose with past date → 1/20; undo → 0/20; add/complete/delete event
[ ] alerts reflect data; tap navigates; mark all read persists
[ ] report tiles/chart from data; PDF downloads and opens
[ ] HM: trends per region, food CRUD + search, AKG save, WHO tables, KPSP CRUD, articles draft→publish visible in Explore, system seed + add admin
```
