# SIMBA

Child growth & nutrition monitoring: a **FastAPI + PostgreSQL** backend and a **React (Vite)** frontend that
serves two audiences from one codebase:

- **Health Manager web portal** (`/hm/*`) — a desktop website: sidebar navigation, dashboard, children registry,
  regional prevalence, reference-data management, content and system administration.
- **Parent app** (`/`, `/home`, …) — the mobile experience, currently rendered inside a phone mock-up as the
  reference implementation for the upcoming native mobile app.

📚 **Docs:** [Architecture](docs/ARCHITECTURE.md) · [Step-by-step test guide](docs/TESTING.md) · [Changelog](docs/CHANGELOG.md)

## Quick start (TL;DR)

```bash
# backend
cd backend && pip install -r requirements.txt && cp .env.example .env && python seed_db.py && uvicorn main:app --reload
# frontend (new terminal)
cd frontend && npm install && npm run dev
```
- **Web portal:** http://localhost:5173/hm/login — sign in with the superadmin from `backend/.env`
  (`admin@simba.id` / `admin1234` by default — change it).
- **Parent app (mobile prototype):** http://localhost:5173 — register a parent account.

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
cp .env.example .env            # then edit DATABASE_URL, SECRET_KEY, FIRST_ADMIN_*
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

### Schema changes

Two mechanisms, pick by environment:

- **Development:** `main.py` and `seed_db.py` call `app/db/migrate.sync_schema`, which creates missing tables
  and adds new **nullable** columns to existing tables. Zero ceremony.
- **Shared / production:** Alembic. `alembic/env.py` reads `DATABASE_URL` from `.env`.
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

The API base URL comes from `VITE_API_URL` (copy `frontend/.env.example` to `frontend/.env`; defaults to
`http://127.0.0.1:8000`). All requests go through `src/lib/api.ts`, which attaches the bearer token and, on a
401, clears the session and redirects to the right login page.

- `src/web/` — the **Health Manager portal** (desktop web): `HMShell` (sidebar + top bar, collapses to a
  drawer below 1024px), `pages/` (Dashboard, Children, ChildDetail, Regions, GrowthStandards, AkgTargets,
  Foods, Milestones, Education, System) and `components/ui.tsx` (PageHeader, Panel, StatCard, badges).
  Styled with the shadcn/ui primitives in `app/components/ui` plus `styles/portal.css` tokens.
- `src/app/` — the **parent mobile prototype** (phone frame, bottom nav). Parent screens share the active
  child via `ChildContext.tsx`.

### Folder structure

```
frontend/
├── package.json
|── index.html
|── postcss.config.mjs
|── vite.config.ts
├── .env.example             # VITE_API_URL
├── tsconfig.json            # strict TypeScript; `npm run typecheck`
├── src/
|   |── main.tsx
|   |── lib/
|   |   |── api.ts               # Typed API client + session helpers (single place that knows the backend)
|   |── web/                     # Health Manager web portal (desktop)
|   |   |── HMShell.tsx          # Sidebar + top bar layout
|   |   |── components/ui.tsx    # Portal building blocks
|   |   |── pages/               # Login, Dashboard, Children, ChildDetail, Regions, GrowthStandards,
|   |   |                        # AkgTargets, Foods, Milestones, Education, System
│   ├── app                      # Parent mobile prototype
│   │   ├── App.tsx
│   │   ├── routes.tsx           # Routes; parent tree in RequireAuth("Parent"), /hm/* in RequireAuth("Health Manager")
│   │   ├── ChildContext.tsx     # Active-child state shared by parent screens
│   │   ├── components/
|   |   |   |── RequireAuth.tsx
|   |   |   |── FrameModal.tsx       # Overlay portal clipped to the phone frame
|   |   |   |── BottomNav.tsx
|   |   |   |── MainLayout.tsx
|   |   |   |── MobileFrame.tsx
|   |   |   |── figma/
|   |   |   |   |── ImageWithFallback.tsx
|   |   |   |── screens/
|   |   |   |   |── AddChildScreen.tsx
|   |   |   |   |── AlertScreen.tsx
|   |   |   |   |── ExploreScreen.tsx
|   |   |   |   |── FoodDiaryScreen.tsx
|   |   |   |   |── GrowthScreen.tsx
|   |   |   |   |── HomeScreen.tsx
|   |   |   |   |── ImmunizationScreen.tsx
|   |   |   |   |── LoginScreen.tsx
|   |   |   |   |── OnboardingScreen.tsx
|   |   |   |   |── RecipesScreen.tsx
|   |   |   |   |── RegisterScreen.tsx
|   |   |   |   |── ReportsScreen.tsx
|   |   |   |   |── SettingsScreen.tsx
|   |   |   |   |── SplashScreen.tsx
|   |   |   |── ui/
|   |   |   |   |── accordion.tsx
|   |   |   |   |── alert-dialog.tsx
|   |   |   |   |── alert.tsx
|   |   |   |   |── aspect-ratio.tsx
|   |   |   |   |── avatar.tsx
|   |   |   |   |── badge.tsx
|   |   |   |   |── breadcrumb.tsx
|   |   |   |   |── button.tsx
|   |   |   |   |── calendar.tsx
|   |   |   |   |── card.tsx
|   |   |   |   |── carousel.tsx
|   |   |   |   |── chart.tsx
|   |   |   |   |── checkbox.tsx
|   |   |   |   |── collapsible.tsx
|   |   |   |   |── command.tsx
|   |   |   |   |── context-menu.tsx                    
|   |   |   |   |── dialog.tsx
|   |   |   |   |── drawer.tsx
|   |   |   |   |── dropdown-menu.tsx
|   |   |   |   |── form.tsx
|   |   |   |   |── hover-card.tsx
|   |   |   |   |── input-otp.tsx
|   |   |   |   |── input.tsx
|   |   |   |   |── label.tsx
|   |   |   |   |── menubar.tsx
|   |   |   |   |── navigation-menu.tsx
|   |   |   |   |── pagination.tsx
|   |   |   |   |── popover.tsx
|   |   |   |   |── progress.tsx
|   |   |   |   |── radio-group.tsx
|   |   |   |   |── resizable.tsx
|   |   |   |   |── scroll-area.tsx
|   |   |   |   |── select.tsx
|   |   |   |   |── separator.tsx
|   |   |   |   |── sheet.tsx
|   |   |   |   |── sidebar.tsx
|   |   |   |   |── skeleton.tsx
|   |   |   |   |── slider.tsx
|   |   |   |   |── sonner.tsx
|   |   |   |   |── switch.tsx
|   |   |   |   |── table.tsx
|   |   |   |   |── tabs.tsx
|   |   |   |   |── textarea.tsx
|   |   |   |   |── toggle-group.tsx
|   |   |   |   |── toggle.tsx
|   |   |   |   |── tooltip.tsx
|   |   |   |   |── use-mobile.ts
|   |   |   |   |── utils.ts
│   ├── imports/             
│   │   ├── logo_1.png            
│   │   ├── logo_2.png         
|   |── styles/
│   │   ├── fonts.css
│   │   ├── index.css
│   │   ├── tailwind.css
│   │   ├── theme.css
│   │   ├── portal.css           # Health Manager portal tokens
```
