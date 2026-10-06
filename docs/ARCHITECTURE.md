# SIMBA — Architecture

## Overview

```
┌──────────────────────────────┐        HTTPS/JSON         ┌──────────────────────────────────┐
│  React 18 + Vite (frontend/) │  ───────────────────────▶ │  FastAPI (backend/)              │
│  • src/web  HM web portal    │   bearer JWT per role     │  • /api/v1/user/*   parents      │
│    (desktop, sidebar shell)  │ ◀───────────────────────  │  • /api/v1/admin/*  health mgrs  │
│  • src/parent parent website │                           │  services/  = domain logic       │
│    (Indonesian, responsive) │                           │  SQLAlchemy 2 → PostgreSQL       │
│  src/lib/api.ts = only place │                           │                                  │
│  that knows the backend      │                           │                                  │
└──────────────────────────────┘                           └──────────────────────────────────┘
                                                                     │
                                                       backend/data/  reference CSVs
                                                       (WHO LMS, AKG 2019, foods, KPSP)
                                                       loaded once by seed_db.py
```

Two user types, two token roles, two route trees. A parent can only ever read or write **their own
children's** data; every `/user/child/{id}/...` route resolves the child through `get_owned_child`,
which returns `404` for both "does not exist" and "not yours".

## Backend

### Layout
```
backend/
├── main.py                 FastAPI app, CORS, router registration, sync_schema on startup
├── seed_db.py              idempotent reference-data loader (+ first superadmin)
├── alembic/                migrations (baseline = current models); env.py reads settings.DATABASE_URL
├── app/
│   ├── core/config.py      pydantic-settings; values come from backend/.env
│   ├── core/security.py    bcrypt, JWT (HS256), get_current_user / get_current_admin / get_current_superadmin
│   ├── api/deps.py         get_owned_child, apply_food_search
│   ├── api/v1/user/        auth, children, growth, logs (foods + meals), milestones, immunization, insights, articles
│   ├── api/v1/admin/       auth, food, datasets (AKG + WHO curves), region (+ dashboard overview/recent),
│   │                       children (registry, detail = report, PDF, meals; parent emails masked), milestones, articles, system
│   ├── db/database.py      engine + SessionLocal + Base
│   ├── db/models.py        all tables (below)
│   ├── db/migrate.py       sync_schema(): create_all + add new nullable columns (dev convenience)
│   ├── schemas/            pydantic request/response models (user_schemas, admin_schemas)
│   └── services/
│       ├── zscore_calc.py      WHO LMS z-scores: WFA, L/HFA, WFL/WFH (wasting), BMI-for-age + classifiers
│       ├── nutrition_calc.py   AKG 2019 brackets + fulfillment
│       ├── immunization.py     Kemenkes routine schedule (20 doses) + due/overdue logic
│       ├── insights.py         alerts + report data derived from everything above
│       └── report_pdf.py       reportlab renderer
└── tests/                  pytest, SQLite in-memory, FK enforcement on
```

### Data model
| Table | Purpose | Notes |
|---|---|---|
| `parents` | parent accounts | email unique, bcrypt hash |
| `admins` | Health Managers | `is_superadmin` (int 0/1) gates account creation & seeding |
| `children` | child profiles | `parent_id`, `gender` (`male`/`female`), `birth_date`, `region` (nullable) |
| `measurement_logs` | weight/height entries | stores `age_in_days` + `wfa/lhfa/wfh/bfa_zscore`; statuses are derived on read |
| `meal_logs` | food diary | nutrients **snapshotted × servings**; `food_id` set NULL if the food is deleted |
| `milestones` / `milestone_answers` | KPSP bank + per-child yes/no | half-open age brackets `[min_months, max_months)`; unique (child, milestone) |
| `health_events` | calendar | `vaccine_code` links a recorded dose to the schedule; unique (child, vaccine_code) |
| `articles` | education content | `published` flag controls parent visibility |
| `foods`, `akg_targets`, `growth_standards` | reference data | seeded from CSV / computed from WHO LMS |

The immunization **schedule itself is code**, not data (`services/immunization.py`), because it is a
fixed national programme; per-child status is computed from `birth_date` + recorded doses on every request.

### Computation rules
- **z-score** `z = ((x/M)^L − 1) / (L·S)` (or `ln(x/M)/S` when L = 0) using the WHO day-indexed tables
  (0–1856 days). Wasting uses weight-for-length below 24 months and weight-for-height from 24 months,
  keyed in 0.1 cm steps; a height outside the table leaves `wfh_zscore` NULL rather than failing the save.
- **Status categories** follow Permenkes 2/2020 (stunting: < −3 severely, < −2 stunted; wasting/BMI:
  < −3 gizi buruk, < −2 gizi kurang, ≤ +1 normal, ≤ +2 risk, ≤ +3 overweight, > +3 obese).
- **Prevalence** on the admin dashboard counts **children by their latest measurement**, not raw logs.
- **KPSP**: 90 %+ yes → Sesuai, 70–89 % → Meragukan, else Penyimpangan (scaled from the 10-question rule).
- **Alerts** (`insights.build_alerts`) are recomputed per request; read state lives in the browser.

### Auth
- Login is OAuth2 password form (`username` = email). Tokens are HS256 JWTs with `sub` (id) and `role`
  (`parent` | `admin`), expiry `ACCESS_TOKEN_EXPIRE_MINUTES` (default 7 days).
- Parent and admin schemes are separate; a parent token on an admin route is `401`, a plain admin on a
  superadmin route is `403`.
- Passwords never travel in URLs (JSON bodies only); `SECRET_KEY` and the DB URL come from `.env`.

### Schema changes
`sync_schema` keeps a dev database usable when models gain columns; it runs at startup only while
`AUTO_SYNC_SCHEMA` is true. Set `AUTO_SYNC_SCHEMA=false` for anything shared and use Alembic:
```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Frontend

### Three clients, two bundles
`frontend/` builds one SPA that serves both web audiences; `mobile/` is a separate Expo app.

| | Health Manager portal (`src/web`) | Parent website (`src/parent`) |
|---|---|---|
| Audience | Puskesmas/Posyandu staff on laptops | Parents, phone or laptop |
| Shell | `HMShell`: 256px sidebar + top bar, drawer below 1024px | `ParentShell`: side nav at 768px and up, bottom tabs below |
| Login | `/hm/login` (split page) | `/masuk` |
| Guard | `RequireAuth role="Health Manager" loginPath="/hm/login"` | `RequireAuth role="Parent"` |
| UI kit | `web/components/ui.tsx` + `styles/portal.css` tokens | `parent/components/ui.tsx` Storybook kit + `styles/parent.css` |

`src/app` holds what both share: the router, the active-child context and the role guard. Four shadcn/ui
primitives are still used (`app/components/ui`: button, dialog, input, table); the rest of the generated set was
removed in the closure pass.

### Layout
```
frontend/src/
├── lib/
│   ├── api.ts                  API_URL (VITE_API_URL), session helpers, apiFetch, typed endpoint map, types
│   └── id.ts                   Indonesian formatting + plain-language verdicts (mirrors mobile/src/lib/friendly.ts)
├── app/
│   ├── routes.tsx              Indonesian parent routes + /hm/*; the old English paths redirect
│   ├── ChildContext.tsx        loads the parent's children, persists the active child id
│   └── components/
│       ├── RequireAuth.tsx     role guard + listens for the API client's 401 broadcast
│       └── ui/                 button, dialog, input, table, utils
├── parent/
│   ├── ParentShell.tsx         side nav / bottom tabs
│   ├── components/             ui.tsx (Storybook kit), ChildSwitcher, GrowthChart (Recharts WHO bands)
│   └── pages/                  Login, Register, ChildForm, Home, Growth, Measure, Meals, AddMeal, Development,
│                               Immunization, Calendar, Alerts, Reports, Explore, More
├── web/
│   ├── HMShell.tsx             portal layout (sidebar nav groups, top bar, footer)
│   ├── components/ui.tsx       PageHeader, Panel, StatCard, FlagBadge, ZBadge, EmptyState, formatting helpers
│   └── pages/                  Login, Dashboard, Children, ChildDetail, Regions, GrowthStandards, AkgTargets,
│                               Foods, Milestones, Education, System
└── styles/                     Tailwind 4 + theme, portal.css, parent.css
```

### Conventions
- **All** network calls go through `api.parent.*` / `api.admin.*`. Errors become `ApiError` with a readable
  message (FastAPI `detail` strings and 422 arrays are flattened); screens show them in a red banner.
- A `401` anywhere clears the session and dispatches `simba:unauthorized`; `RequireAuth` navigates to the login
  page for that role.
- Screens read the active child from `useChildren()` and refetch when `activeChild.id` changes.
- Dates are exchanged as `YYYY-MM-DD` (`toDateString`) to avoid UTC day shifts.
- `VITE_API_URL` must be set for a production build; `src/lib/api.ts` throws at load if it is missing so a
  deployed bundle can never fall back to `127.0.0.1`.

### Privacy in the portal
Health Managers see children by name and region but parent emails are masked (`u***@example.com`); all portal
reads are aggregated or per child, never per parent account.

## Mobile app (`mobile/`)

Expo SDK 57 / React Native 0.86 with **expo-router** file-based routes. It is a third client of the same API and
uses only `/api/v1/user/*`.

```
app/_layout.tsx        SafeAreaProvider → AuthProvider → ChildProvider → Stack
app/(tabs)/            Home · Growth · Nutrition · Development · More (guarded: redirects to /login or /add-child)
src/lib/api.ts         typed client; token cached in memory, persisted with expo-secure-store (AsyncStorage on web)
src/state/auth.tsx     ready/isAuthenticated, signIn/register/signOut, listens for 401 → signed out
src/state/child.tsx    children list + active child (id persisted), add/update/select
src/components/        ui.tsx primitives, GrowthChart.tsx (react-native-svg), ChildSwitcher.tsx (bottom sheet)
```

Design decisions:
- No chart library: the WHO chart is ~100 lines of SVG paths (bands = closed polygons from p3/p97 and p15/p85),
  so it renders identically on Android, iOS and web and has no native-module risk.
- PDF sharing fetches `/report.pdf` with the bearer token, writes it to the cache directory with the new
  `expo-file-system` `File` API and hands it to `expo-sharing`; on web it opens a blob URL.
- `DateField` uses `@react-native-community/datetimepicker` on device with a pencil button to type the date
  instead; on web it falls back to typing. `Stepper` likewise accepts a tapped-in exact value.
- The backend address is auto-detected from the host serving the Expo bundle (port 8000); set
  `EXPO_PUBLIC_API_URL` only when the backend runs elsewhere. Requests time out after 15 s with a message that
  names the URL that was tried.

## Parent website (`frontend/src/parent`)

The website mirrors the mobile app screen for screen against the same `/api/v1/user/*` endpoints, so a family can
use either. Copy helpers live in `src/lib/id.ts` and mirror `mobile/src/lib/friendly.ts`. It uses the same
`session` store as the portal but with role `Parent`, so a parent token never opens `/hm/*`.
