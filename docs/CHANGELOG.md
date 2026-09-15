# Changelog

All notable changes on the `claude/project-build-improve-548c26` branch (September 2026), newest first.
The starting point was the Figma-exported UI prototype with a partially wired FastAPI backend.

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
