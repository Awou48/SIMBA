Backend Folder Structure
To run: 
cd backend
uvicorn main:app --reload 

backend/
├── main.py                     # App initialization, CORS setup, and route inclusion
├── requirements.txt            
├── alembic.ini                 # For PostgreSQL database migrations
├── alembic/                    # Migration scripts (tracking schema changes)
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── user/           # Endpoints ONLY accessible to Parents (Mobile)
│   │   │   │   ├── auth.py     # Parent login/register
│   │   │   │   ├── children.py # CRUD for child profiles
│   │   │   |   ├── growth.py
│   │   │   │   └── logs.py     # Submitting daily weight/nutrition logs
│   │   │   └── admin/          # Endpoints ONLY accessible to Admins (Web)
│   │   │       ├── __ini__.py
│   │   │       ├── auth.py     # Admin login
│   │   │       ├── datasets.py # Uploading/updating WHO CSVs and AKG targets
│   │   │       ├── food.py
│   │   │       └── region.py   # Aggregated analytics for regional dashboards
│   ├── core/                   
│   │   ├── config.py           # DB connection strings, JWT secret keys
│   │   └── security.py         # Password hashing, JWT token validation, RBAC logic
│   ├── db/                     
│   │   ├── database.py         # PostgreSQL connection pooling (SQLAlchemy)
│   │   └── models.py           # Relational tables (User, Child, Measurement, Admin)
│   ├── schemas/                
│   │   ├── user_schemas.py     # Pydantic models for mobile payloads
│   │   └── admin_schemas.py    # Pydantic models for admin dashboard payloads
│   └── services/               # The "Brain" (Business Logic)
│       ├── zscore_calc.py      # Python LMS calculations using the WHO tables
│       └── nutrition_calc.py   # AKG comparison logic
└── data/                       # Initial seed data
    └── local_reference/
    └── who_lms_tables/        

Frontend Folder Structures
To run:
cd frontend
npm run dev

frontend/
├── package.json
|── index.html
|── postcss.config.mjs
|── vite.config.ts
├── src/
|   |── main.tsx
│   ├── app
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   ├── components/
|   |   |   |── BottomNav.tsx
|   |   |   |── HMBottomNav.tsx
|   |   |   |── HMLayout.tsx
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
|   |   |   |   |── hm/
|   |   |   |   |   |── HMAKGTargets.tsx
|   |   |   |   |   |── HMDashboard.tsx
|   |   |   |   |   |── HMEducation.tsx
|   |   |   |   |   |── HMFoodDatabase.tsx
|   |   |   |   |   |── HMGrowthStandards.tsx
|   |   |   |   |   |── HMMilestones.tsx
|   |   |   |   |   |── HMRegionalTrends.tsx
|   |   |   |   |   |── HMSystem.tsx
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