# Changelog

All notable changes on the `SIMBA-Ver-02` branch (September 2026), newest first.
The starting point was the Figma-exported UI prototype with a partially wired FastAPI backend.

## 1.6.0 — Parent website
- The phone-framed prototype at `/` is replaced by a real responsive parent website (`frontend/src/parent`):
  Indonesian copy, Storybook design, bottom tabs on phones and side navigation on desktop, Recharts WHO chart,
  browser date fields, PDF download. Routes are Indonesian (`/masuk`, `/beranda`, `/tumbuh`, …); old paths redirect.
- Shared Indonesian helpers in `frontend/src/lib/id.ts`.
- Fixed: the Tailwind `@source` glob had been damaged by the comment stripper (`/**/` treated as a comment), which
  left both the portal and the new site unstyled; restored.

## 1.5.0 — Indonesian "Sunny Yellow Storybook" mobile app
- Entire mobile app in Bahasa Indonesia, plain language for parents; Indonesian number/date formatting.
- New look: yellow header band, ink outlines + hard offset shadows, Fredoka/Nunito, coral primary, topic tints;
  real SIMBA lion logo on splash, sign-in and More.
- Inputs: steppers with tap-to-type exact values, sliders, native date picker with a type-it-yourself option,
  date chips, food suggestions, one-question milestone quiz, celebration screens.
- Backend: alerts, vaccine names/notes and KPSP age labels now Indonesian ("dosis 1", "12 - 24 bulan").
  Existing dev DB relabelled. Tests updated (82 passing).
- Design canvases: five directions, six Storybook variants, and all 15 screens in Indonesian.

## 1.4.1 — Mobile redesign for parents
- Warm palette and Nunito type from the original prototype (cream, orange→yellow gradient, teal/pink/lavender
  accents, emoji), replacing the admin-portal navy/indigo.
- Plain-language verdict cards for growth, food, milestones and vaccines; z-scores hidden behind a toggle.
- Steppers + sliders for measurements, date chips, one-question milestone quiz, food suggestions, servings
  stepper, celebration screens, bounce-on-press and animated rings/bars, haptics on device.
- Tabs renamed Home · Growth · Meals · Milestones · More.

## 1.4.0 — SIMBA Mobile (native parent app)
- New `mobile/` Expo SDK 57 / React Native app with expo-router: Home, Growth (react-native-svg WHO chart with
  percentile bands), Nutrition (day picker, AKG progress, food search + servings), Development (KPSP), More
  (Immunization, Calendar, Alerts, Report with PDF share, Explore articles, child management), auth with
  SecureStore and automatic sign-out on 401, multi-child switcher persisted across launches.
- Shared API contract: `mobile/src/lib/api.ts` mirrors the parent half of `frontend/src/lib/api.ts`.
- Backend: `CORS_ORIGINS` default now includes the Expo web dev origin (`localhost:8081`).
- CI: mobile type-check job. Docs: `mobile/README.md`, TESTING §10, README overview.
- Repo-wide: code comments stripped (docstrings and tool pragmas kept).

## 1.3.1 — Portal polish & data cleanup
- Logo: `logo_mark.png` (lion head cropped from the padded source PNG) now fills the sidebar and login boxes.
- Login page: animated hero — drifting gradient, floating blurred orbs, masked grid, bobbing mascot, fade-up
  form. Everything is disabled under `prefers-reduced-motion`.
- Dashboard: greeting hero with the signed-in manager's name and headline numbers, KPI cards with accent bars
  and icon wells, **Needs attention** list (children ranked wasted > stunted > underweight > overweight >
  stale > no data), donut with centred total, region bars with track, quick links, staggered fade-in and
  hover lift on panels.
- Tables: first/last cells get 1.25rem side padding so flush panel tables no longer hug the left edge.
- `backend/scripts/cleanup_legacy.py`: plan-first script to delete prototype accounts (cascading), drop
  orphan tables, and purge impossible measurements. Used to clean the dev database (legacy parents/admins,
  `immunization_events` / `nutrition_logs` / `immunization_logs` tables, rows with |z| > 6).

## 1.3.0 — Health Manager web portal
- New desktop website at `/hm/*` (`frontend/src/web`): sidebar shell with grouped navigation, top bar, drawer
  below 1024px; dedicated `/hm/login` split page; portal theme tokens (`styles/portal.css`).
- Pages: Dashboard (KPIs, nutritional-status donut, region chart, recent measurements), **Children registry**
  (search, region/status filters in the URL, paging, masked parent contacts), **Child detail** (WHO chart,
  attention points, history, nutrition, KPSP, immunization, PDF), Regions, WHO Standards, AKG Targets
  (grid editor), Food Database (server-side search, dialogs), KPSP Milestones (grouped, dialogs), Education
  (two-pane editor with preview), System.
- Backend: `GET /admin/children` (+ `/{id}`, `/{id}/report.pdf`, `/{id}/meals`), `GET /admin/dashboard/overview`,
  `GET /admin/dashboard/recent-measurements`; classifiers and schemas tolerate legacy rows without z-scores.
- Parent login "Health Manager" tab now links to the web portal; phone-framed HM screens removed.
- Tests: 82 passing.

## 1.2.1 — Tooling & docs
- Alembic initialised: `alembic/env.py` reads `settings.DATABASE_URL`, baseline revision covers all 12 tables;
  `alembic check` verified against the models. Existing dev DBs: `alembic stamp head` once.
- GitHub Actions CI: backend `pytest` + migration up/check/down on SQLite; frontend `typecheck` + `vite build`.
- `frontend/tsconfig.json` (strict), `npm run typecheck`; `npm run build` type-checks first.
- `docs/`: ARCHITECTURE.md, TESTING.md (step-by-step manual test plan), this changelog. README feature matrix + API map.

## 1.2.0 — Content & system
- Education articles: `articles` table, admin CRUD with draft/publish, parent list/read (published only),
  Explore tab shows articles with search and an in-frame reader; 4 seeded Indonesian starter articles.
- WHO Growth Standards admin screen reads the seeded curves (chart + percentile table, read-only).
- Admin System page: live status, data overview counts, reference-data completeness, superadmin-only
  "load missing reference data", admin accounts list and superadmin "add account" form.
- Endpoints: `/admin/articles`, `/user/articles`, `/admin/datasets/growth-standards`, `/admin/system/{summary,admins,seed}`.

## 1.1.6 — Insights, report, regions
- `services/insights.py`: early-warning alerts (growth z-scores, stale measurements, 7-day AKG fulfillment,
  KPSP result, overdue/due doses) and report data; `GET /child/{id}/alerts`, `/report`, `/report.pdf` (reportlab).
- Alerts screen driven by the API (read state per child in the browser); Reports screen on real data with PDF download.
- `Child.region` (+ `PUT /children/{id}`, Add Child field); admin stats per child (latest measurement) with
  `?region=` filter and `GET /admin/dashboard/regions`; Regional Trends screen on real per-region data.

## 1.1.5 — Immunization & calendar
- `services/immunization.py`: Kemenkes routine schedule (20 doses) with due/overdue windows from birth date.
- `health_events` table; record/undo doses (unique per child+dose), free-form events with month filter.
- Immunization screen: coverage card, real month calendar, merged agenda, vaccine record, record-dose sheet
  defaulting to the due date for catch-up doses, add-event sheet.

## 1.1.4 — KPSP milestones
- `milestones` / `milestone_answers`; 20 questions seeded from `Digitize_the_KPSP.csv` (half-open brackets).
- Parent checklist with Sesuai / Meragukan / Penyimpangan; admin question bank CRUD; Home summary card.

## 1.1.3 — Wasting & BMI
- Weight-for-length/height (WHO wfl/wfh tables) and BMI-for-age z-scores with Permenkes categories.
- `measurement_logs.wfh_zscore`, `bfa_zscore`; `app/db/migrate.sync_schema` adds new nullable columns to
  existing dev tables; BMI curves seeded; BMI chart tab, wasting badges and verdict chips.

## 1.1.2 — Meal logging
- `meal_logs` with snapshotted nutrients × servings; parent food search (all words must match);
  daily summary with AKG targets/fulfillment; Food Diary rewritten (search sheet, servings, delete);
  Home nutrition bars live; `FrameModal` portal so overlays stay inside the phone frame.

## 1.1.1 — Frontend wiring
- `src/lib/api.ts` typed client (VITE_API_URL, bearer auth, error flattening, 401 → login);
  `RequireAuth` guards; `ChildContext` with child switcher; live growth chart with WHO bands
  (`GET /user/growth-standards`); admin Food DB live CRUD with server-side search.

## 1.1.0 — Backend hardening
- Settings from `.env`; ownership checks on every child route; admin routes protected; superadmin-only
  admin registration; JSON registration bodies; 7-day parent tokens; measurement date persisted and
  validated; zero-division fix in stats; REST `/admin/foods`; `seed_db.py`; 42 tests.

## 1.0.0 — Prototype (pre-existing)
- Figma-exported React UI for parent and Health Manager; FastAPI skeleton with WHO z-score and AKG logic.
