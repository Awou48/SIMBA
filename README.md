# SIMBA

Child growth & nutrition monitoring: one **FastAPI + PostgreSQL** backend, three clients:

- **Health Manager web portal** (`frontend/`, routes `/hm/*`) — a desktop website: sidebar navigation, dashboard,
  children registry, regional prevalence, reference-data management, content and system administration.
- **SIMBA Mobile** (`mobile/`) — the native parent app (Expo / React Native, Android + iOS): growth chart with
  WHO bands, meal logging, KPSP, immunization, calendar, alerts, shareable PDF report. See [mobile/README.md](mobile/README.md).
- **Parent website** (`frontend/`, routes `/masuk`, `/beranda`, …) — the same Indonesian parent experience as the
  mobile app, as a responsive website (bottom tabs on phones, side navigation on desktop). Same design, same API.

📚 **Docs:** [Architecture](docs/ARCHITECTURE.md) · [Step-by-step test guide](docs/TESTING.md) · [Deployment](docs/DEPLOYMENT.md) · [Changelog](docs/CHANGELOG.md)

## Quick start (TL;DR)

```bash
# backend
cd backend && pip install -r requirements.txt && cp .env.example .env
# edit backend/.env: DATABASE_URL, SECRET_KEY and FIRST_ADMIN_* are placeholders
python seed_db.py && uvicorn main:app --reload
# frontend (new terminal)
cd frontend && npm install && npm run dev
# mobile app (new terminal) — Android emulator / iOS simulator / Expo Go / web
cd mobile && npm install && cp .env.example .env && npx expo start
```
- **Web portal:** http://localhost:5173/hm/login — sign in with the `FIRST_ADMIN_EMAIL` /
  `FIRST_ADMIN_PASSWORD` you put in `backend/.env`; `seed_db.py` creates that account.
- **Parent website:** http://localhost:5173 — *Daftar di sini* to create a parent account (Indonesian UI).
- **Mobile app:** press `a`/`i`/`w` in the Expo terminal or scan the QR with Expo Go; point
  `EXPO_PUBLIC_API_URL` at the backend as seen from the phone (details in `mobile/README.md`).

## Features

| Area | Parent app | Health Manager portal |
|------|-----------|-----------------------|
| Growth | Log weight/height; WHO z-scores for weight-for-age, height-for-age, weight-for-length/height (wasting) and BMI-for-age; charts with WHO 3rd–97th percentile bands; history | Read-only WHO percentile tables/curves; stunting prevalence overall and per region (latest measurement per child) |
| Nutrition | Food diary per day and meal type over a 1,651-item Indonesian food DB; AKG 2019 targets and fulfillment for the child's age | Food DB CRUD with search; editable AKG targets |
| Development | KPSP milestone checklist by age bracket with Sesuai / Meragukan / Penyimpangan result | KPSP question bank CRUD |
| Immunization | Kemenkes routine schedule computed from birth date (given / due / overdue), record doses, health calendar events | — |
| Insights | Early-warning alerts derived from all of the above; growth report screen + PDF download | **Children registry** (search, region/status filters, masked parent contact) and per-child detail page (WHO chart, attention points, history, nutrition, KPSP, immunization, PDF); education articles (draft/publish) shown in the parent Explore tab; system panel with data overview, reference seeding and admin accounts |

Every parent route is scoped to the authenticated parent's own children; admin routes require an admin token
(account creation requires a superadmin).

### API map (all under `/api/v1`)

```
user/auth            POST register, login
user/children        GET/POST /, GET/PUT /{id}
user/child/{id}      GET/POST measurements · GET/POST meals, DELETE meals/{mid}
                     GET/PUT milestones[/{mid}] · GET immunizations, POST/DELETE immunizations/{code}/given
                     GET/POST events, PUT/DELETE events/{eid} · GET alerts · GET report, GET report.pdf
user/foods           GET (search)          user/growth-standards   GET ?metric=&gender=
user/nutrition/{id}  POST analyze          user/articles           GET, GET /{id}
admin/auth           POST login, POST register (superadmin), GET me
admin/foods          GET/POST, GET/PUT/DELETE /{id}         admin/milestones   GET/POST, PUT/DELETE /{id}
admin/articles       GET/POST, PUT/DELETE /{id}             admin/datasets     GET akg, POST update-akg, GET growth-standards
admin/dashboard      GET overview, GET stunting-stats[?region=], GET regions, GET recent-measurements
admin/children       GET (q, region, flag, limit, offset), GET /{id} (report), GET /{id}/report.pdf, GET /{id}/meals
admin/system         GET summary, GET admins, POST seed (superadmin)
```

Interactive docs: `http://127.0.0.1:8000/docs`.

## Backend

### Setup & run

```bash
cd backend
python -m venv venv && source venv/Scripts/activate   # Windows Git Bash; use venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # then fill in DATABASE_URL, SECRET_KEY, FIRST_ADMIN_*
python seed_db.py               # create tables + load WHO / AKG / food reference data, bootstrap superadmin
uvicorn main:app --reload       # http://127.0.0.1:8000/docs
```

`python seed_db.py` is idempotent (skips tables that already have rows); `python seed_db.py --reset`
re-loads the reference tables (foods, AKG targets, growth standards). It never touches parents,
children or measurements.

### Tests

```bash
cd backend
pytest
```

Tests run against an in-memory SQLite database; PostgreSQL does not need to be running.

### Environment variables

`backend/.env` (see `backend/.env.example`; environment variables of the same name win over the file):

| Variable | Default | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | `production` refuses to start with the placeholder `SECRET_KEY` or the default `FIRST_ADMIN_PASSWORD` |
| `DATABASE_URL` | local Postgres | SQLAlchemy URL; must start with `postgresql://` |
| `SECRET_KEY` | placeholder | JWT signing key. `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 days) | both roles |
| `CORS_ORIGINS` | the two localhost dev ports | JSON list of allowed browser origins |
| `CORS_ORIGIN_REGEX` | unset | development only: also allow the private-LAN origin a phone running Expo uses |
| `AUTO_SYNC_SCHEMA` | `true` | create missing tables/nullable columns at startup; set `false` in production |
| `FIRST_ADMIN_EMAIL` / `_PASSWORD` / `_NAME` | placeholders | the superadmin `seed_db.py` creates when `admins` is empty |

`frontend/.env`: `VITE_API_URL`. `mobile/.env`: `EXPO_PUBLIC_API_URL` (leave empty to auto-detect).

### Schema changes

Two mechanisms, pick by environment:

- **Development:** `main.py` (while `AUTO_SYNC_SCHEMA` is true) and `seed_db.py` call
  `app/db/migrate.sync_schema`, which creates missing tables and adds new **nullable** columns to existing
  tables. Zero ceremony.
- **Shared / production:** `AUTO_SYNC_SCHEMA=false` plus Alembic. `alembic/env.py` reads `DATABASE_URL`
  from the environment or `.env`.
  ```bash
  cd backend
  alembic upgrade head                                  # fresh database
  alembic stamp head                                    # database that was created by create_all/sync_schema
  alembic revision --autogenerate -m "add column x"     # after changing app/db/models.py
  alembic check                                         # CI: models and migrations agree
  ```

### Cleaning a development database

`backend/scripts/cleanup_legacy.py` removes prototype-era data without touching reference tables. It always
prints its plan first and does nothing until you pass `--yes`.

```bash
cd backend
python scripts/cleanup_legacy.py --drop-orphans --purge-impossible --dry-run
python scripts/cleanup_legacy.py --parents old@example.com --admins old-admin@simba.id \
    --drop-orphans --purge-impossible --yes
```

- `--parents` / `--admins` — delete those accounts (parents cascade to children, measurements, meals,
  KPSP answers, calendar events). Superadmins are skipped unless `--allow-superadmin`.
- `--drop-orphans` — drop tables that exist in the database but not in `app/db/models.py`.
- `--purge-impossible` — delete measurements with a missing z-score or `|z| > 6` (only possible before
  validation was added).

### Auth model

| Role | Login | Token | Notes |
|------|-------|-------|-------|
| Parent | `POST /api/v1/user/auth/login` (OAuth2 form) | `role=parent`, 7 days | Register via JSON `POST /api/v1/user/auth/register` |
| Admin | `POST /api/v1/admin/auth/login` (OAuth2 form) | `role=admin`, 7 days | New admins can only be created by a **superadmin** (`POST /api/v1/admin/auth/register`) |

The first superadmin comes from `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` in `.env` (created or promoted by `seed_db.py`).
Every `/api/v1/user/child/{id}/...` and `/nutrition/{id}/...` route checks that the child belongs to the caller.

### Folder structure

```
backend/
├── main.py                     # App initialization, CORS setup, and route inclusion
├── seed_db.py                  # Create tables + seed reference data (WHO, AKG, foods, superadmin)
├── requirements.txt
├── pytest.ini
├── .env.example                # Copy to .env (gitignored)
├── alembic.ini / alembic/      # Migrations (baseline = current models); see "Schema changes"
├── app/
│   ├── api/
│   │   ├── deps.py             # get_owned_child: child lookup + ownership check
│   │   └── v1/
│   │       ├── user/           # Endpoints ONLY accessible to Parents (Mobile)
│   │       │   ├── auth.py     # Parent register/login
│   │       │   ├── children.py # CRUD for child profiles
│   │       │   ├── growth.py   # Log + list measurements (WHO z-scores)
│   │       │   ├── logs.py     # Food search, meal logging, daily AKG summary
│   │       │   ├── milestones.py # KPSP checklist per child (answers + interpretation)
│   │       │   ├── immunization.py # National vaccine schedule status + health calendar events
│   │       │   ├── insights.py # Derived alerts, growth report (JSON + PDF)
│   │       │   └── articles.py # Published education articles
│   │       └── admin/          # Endpoints ONLY accessible to Admins (Web)
│   │           ├── auth.py     # Admin login, /me, superadmin-only register
│   │           ├── datasets.py # Read/replace AKG targets, read WHO curves
│   │           ├── food.py     # Food database CRUD (+ search/filter)
│   │           ├── milestones.py # KPSP question bank CRUD
│   │           ├── articles.py # Education content CRUD (draft/publish)
│   │           ├── system.py   # Data overview, admin accounts, on-demand reference seeding
│   │           └── region.py   # Stunting prevalence overall and per child region
│   ├── core/
│   │   ├── config.py           # Settings loaded from .env (pydantic-settings)
│   │   └── security.py         # Password hashing, JWT creation/validation, role guards
│   ├── db/
│   │   ├── database.py         # SQLAlchemy engine/session
│   │   └── models.py           # ParentUser, AdminUser, Child, MeasurementLog, FoodItem, AKGTarget, GrowthStandard
│   ├── schemas/
│   │   ├── user_schemas.py     # Pydantic models for mobile payloads
│   │   └── admin_schemas.py    # Pydantic models for admin dashboard payloads
│   └── services/
│       ├── zscore_calc.py      # WHO LMS z-scores (WFA, L/HFA, WFL/WFH wasting, BMI-for-age)
│       ├── nutrition_calc.py   # AKG 2019 comparison logic
│       ├── immunization.py     # Kemenkes routine immunization schedule + dose status
│       ├── insights.py         # Early-warning alerts + report data derived from all child records
│       └── report_pdf.py       # reportlab renderer for the growth report
├── tests/                      # pytest suite (SQLite in-memory)
└── data/
    ├── local_reference/        # AKG 2019, Indonesian food composition, KPSP milestones
    └── who_lms_tables/         # WHO LMS tables by day (0-1856)
```

## Frontend

### Setup & run

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
npm run typecheck               # tsc --noEmit (strict); `npm run build` runs it too
```

The API base URL comes from `VITE_API_URL` (copy `frontend/.env.example` to `frontend/.env`). In development it
falls back to `http://127.0.0.1:8000`; a **production build throws at load if it is not set**, so a deployed
bundle can never quietly call localhost. All requests go through `src/lib/api.ts`, which attaches the bearer
token and, on a 401, clears the session and redirects to the login page for that role.

- `src/parent/` — the **parent website** (Indonesian): `ParentShell` (side nav at 768px and up, bottom tabs
  below), `pages/` (Login, Register, ChildForm, Home, Growth, Measure, Meals, AddMeal, Development,
  Immunization, Calendar, Alerts, Reports, Explore, More), `components/ui.tsx` (Storybook kit) and
  `components/GrowthChart.tsx` (Recharts WHO bands). Styled with `styles/parent.css`.
- `src/web/` — the **Health Manager portal** (desktop web): `HMShell` (sidebar + top bar, collapses to a
  drawer below 1024px), `pages/` (Dashboard, Children, ChildDetail, Regions, GrowthStandards, AkgTargets,
  Foods, Milestones, Education, System) and `components/ui.tsx` (PageHeader, Panel, StatCard, badges).
  Styled with `styles/portal.css` tokens.
- `src/app/` — what both share: `routes.tsx`, `ChildContext.tsx` (active child), `components/RequireAuth.tsx`
  (role guard) and the four shadcn/ui primitives still in use in `components/ui/`.

### Folder structure

```
frontend/
├── package.json             # 11 runtime dependencies; react/react-dom are declared here, not as peers
├── index.html
├── postcss.config.mjs
├── vite.config.ts
├── .env.example             # VITE_API_URL
├── tsconfig.json            # strict TypeScript; `npm run typecheck`
└── src/
    ├── main.tsx
    ├── lib/
    │   ├── api.ts           # Typed API client + session helpers (single place that knows the backend)
    │   └── id.ts            # Indonesian dates/numbers + plain-language verdicts
    ├── app/
    │   ├── routes.tsx       # Indonesian parent routes + /hm/*; old English paths redirect
    │   ├── ChildContext.tsx
    │   └── components/
    │       ├── RequireAuth.tsx
    │       └── ui/          # button, dialog, input, table, utils
    ├── parent/
    │   ├── ParentShell.tsx
    │   ├── components/      # ui.tsx, ChildSwitcher.tsx, GrowthChart.tsx
    │   └── pages/
    ├── web/
    │   ├── HMShell.tsx
    │   ├── components/ui.tsx
    │   └── pages/
    ├── imports/logo_mark.png
    └── styles/              # fonts, tailwind, theme, parent.css, portal.css
```

## Deployment

`render.yaml` deploys the API and the web bundle to Render's free tier against a Neon free PostgreSQL database.
Full steps, the environment variables each service needs, and the limitations of that tier are in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The blueprint and the production start sequence
(`alembic upgrade head && python seed_db.py && uvicorn main:app`) were rehearsed locally with
`ENVIRONMENT=production`; **nothing has actually been deployed from this repository** — that needs the owner's
Render and Neon accounts.

## Known limitations

- **Not a clinical tool.** The z-scores and AKG percentages implement WHO LMS, Permenkes 2/2020 cut-offs and
  AKG 2019 as published, for monitoring and coursework. They are not a diagnosis and were not validated against
  a reference implementation beyond the regression tests in `backend/tests/test_growth.py` and
  `test_nutrition.py`.
- WHO LMS tables cover **0–1856 days (about 5 years)**. A measurement outside that range is rejected with an
  explanatory error rather than extrapolated.
- Food categories in the seeded database are derived from a keyword map over Indonesian food names, so many of
  the 1,651 rows fall back to `Other`.
- `region` on a child is free text typed by the parent, so the portal's regional prevalence is only as
  consistent as that typing.
- The frontend ships as a single ~1.6 MB JavaScript bundle (385 KB gzipped). It is not code-split.
- On Render's free tier the API sleeps after 15 minutes idle; the first request afterwards takes about a minute.
- The mobile app has not been built for the stores. It runs in Expo Go or a development build.
- `backend/.env.example` previously contained a real local PostgreSQL password and a real-looking `SECRET_KEY`.
  Both are placeholders now, but the old values remain in this repository's published history.

## Team project

SIMBA is a Software Engineering course team project. The repository was pushed from a single account, so its
git history does not separate individual contributors: every commit is authored by the repository owner.

- The starting point (`Code Prototype 1`, `feat: Complete UI prototype for Parent and Admin`) is the team's
  Figma-exported React/TypeScript/Tailwind screen set together with a partially wired FastAPI backend.
- The repository owner's own area is the backend: SQLAlchemy models, role-based auth and ownership checks, the
  WHO z-score and AKG services, the admin/statistics endpoints, seeding, migrations and the test suite — and
  wiring the three clients to it.

It is finished and archived; it is not being actively developed.
