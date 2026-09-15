# SIMBA — Architecture

## Overview

```
┌──────────────────────────────┐        HTTPS/JSON         ┌──────────────────────────────────┐
│  React 18 + Vite (frontend/) │  ───────────────────────▶ │  FastAPI (backend/)              │
│  • src/web  HM web portal    │   bearer JWT per role     │  • /api/v1/user/*   parents      │
│    (desktop, sidebar shell)  │ ◀───────────────────────  │  • /api/v1/admin/*  health mgrs  │
│  • src/app  parent mobile    │                           │  services/  = domain logic       │
│    prototype (phone frame)   │                           │  SQLAlchemy 2 → PostgreSQL       │
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
`sync_schema` keeps a dev database usable when models gain columns. For anything shared, use Alembic:
```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Frontend

### Two front-ends, one bundle
| | Health Manager portal (`src/web`) | Parent app (`src/app`) |
|---|---|---|
| Audience | Puskesmas/Posyandu staff on laptops | Parents on phones |
| Shell | `HMShell`: 256px sidebar + top bar, drawer below 1024px | `MobileFrame` phone mock-up + bottom nav |
| Login | `/hm/login` (split page) | `/login` inside the frame |
| Guard | `RequireAuth role="Health Manager" loginPath="/hm/login"` | `RequireAuth role="Parent"` |
| UI kit | shadcn/ui primitives (`app/components/ui`) + `web/components/ui.tsx` + `styles/portal.css` tokens | hand-styled Nunito components, `FrameModal` |
| Future | This is the website | Reference for the native mobile app (React Native/Flutter) against the same API |

### Layout
```
frontend/src/
├── lib/api.ts                  API_URL (VITE_API_URL), session helpers, apiFetch, typed endpoint map, types
├── web/
│   ├── HMShell.tsx             portal layout (sidebar nav groups, top bar, footer)
│   ├── components/ui.tsx       PageHeader, Panel, StatCard, FlagBadge, ZBadge, EmptyState, formatting helpers
│   └── pages/                  Login, Dashboard, Children, ChildDetail, Regions, GrowthStandards, AkgTargets,
│                               Foods, Milestones, Education, System
├── app/routes.tsx              routes; parent tree wrapped in RequireAuth("Parent") + ChildProvider,
│                               /hm/* in RequireAuth("Health Manager") → HMShell
├── app/ChildContext.tsx        loads the parent's children, persists the active child id
├── app/components/
│   ├── RequireAuth.tsx         role guard + listens for the API client's 401 broadcast
│   ├── FrameModal.tsx          portal overlay clipped to the phone mock-up (#mobile-frame)
│   ├── MobileFrame / MainLayout / BottomNav
│   └── screens/                parent screens
└── styles/                     Tailwind 4 + theme
```

### Conventions
- **All** network calls go through `api.parent.*` / `api.admin.*`. Errors become `ApiError` with a readable
  message (FastAPI `detail` strings and 422 arrays are flattened); screens show them in a red banner.
- A `401` anywhere clears the session and dispatches `simba:unauthorized`; `RequireAuth` navigates to `/login`.
- Screens read the active child from `useChildren()` and refetch when `activeChild.id` changes.
- Modals use `FrameModal` so they stay inside the device frame.
- Dates are exchanged as `YYYY-MM-DD` (`toDateString`) to avoid UTC day shifts.

### Privacy in the portal
Health Managers see children by name and region but parent emails are masked (`u***@example.com`); all portal
reads are aggregated or per child, never per parent account.

### Still presentational (parent prototype only)
Recipes screen, Explore video/forum cards, Home recipe strip and the "restaurants nearby" button are
editorial placeholders with no backing data.
