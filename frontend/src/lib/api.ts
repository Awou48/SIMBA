/**
 * Single entry point for talking to the SIMBA backend.
 *
 * - Base URL comes from VITE_API_URL (see frontend/.env.example).
 * - Attaches the stored bearer token, parses FastAPI error bodies into readable
 *   messages, and on 401 clears the session and broadcasts `simba:unauthorized`
 *   so the route guard can bounce the user to /login.
 */

export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

// ---------------------------------------------------------------------------
// Session storage
// ---------------------------------------------------------------------------

export type Role = "Parent" | "Health Manager";

const TOKEN_KEY = "simba_token";
const ROLE_KEY = "simba_role";
const CHILD_KEY = "active_child_id";

export const UNAUTHORIZED_EVENT = "simba:unauthorized";

export const session = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getRole: () => localStorage.getItem(ROLE_KEY) as Role | null,
  set(token: string, role: Role) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(CHILD_KEY);
  },
  isLoggedInAs: (role: Role) => !!localStorage.getItem(TOKEN_KEY) && localStorage.getItem(ROLE_KEY) === role,
  getActiveChildId(): number | null {
    const raw = localStorage.getItem(CHILD_KEY);
    return raw ? Number(raw) : null;
  },
  setActiveChildId(id: number | null) {
    if (id === null) localStorage.removeItem(CHILD_KEY);
    else localStorage.setItem(CHILD_KEY, String(id));
  },
};

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/** FastAPI returns `detail` as a string, or as a list of {loc, msg} for 422s. */
function formatDetail(body: any, fallback: string): string {
  const detail = body?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: any) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : undefined;
        return field && field !== "body" ? `${field}: ${d.msg}` : d.msg;
      })
      .join(" · ");
  }
  return fallback;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON body (default) or a URLSearchParams for OAuth2 form logins. */
  body?: unknown;
  /** Attach the bearer token (default true). */
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = opts;

  const url = new URL(API_URL + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;
  if (body instanceof URLSearchParams) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  if (auth) {
    const token = session.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Cannot reach the SIMBA server. Is the backend running?");
  }

  if (response.status === 401 && auth) {
    session.clear();
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, formatDetail(data, `Request failed (${response.status})`));
  }
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Types mirrored from backend/app/schemas
// ---------------------------------------------------------------------------

export interface Child {
  id: number;
  parent_id: number;
  name: string;
  gender: "male" | "female";
  birth_date: string; // YYYY-MM-DD
  region: string | null;
}

export interface Measurement {
  id: number;
  date_logged: string; // ISO datetime
  age_in_days: number;
  weight_kg: number;
  height_cm: number;
  wfa_zscore: number;
  lhfa_zscore: number;
  wfh_zscore: number | null; // weight-for-length/height (wasting)
  bfa_zscore: number | null; // BMI-for-age
  bmi: number | null;
  stunting_status: string;
  weight_status: string;
  wasting_status: string | null;
  bmi_status: string | null;
}

export interface GrowthStandardPoint {
  age_months: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export interface NutritionAnalysis {
  age_in_months: number;
  age_bracket_found: string;
  target_protein: number;
  target_energy: number;
  target_fat: number;
  target_carbs: number;
  protein_fulfillment_percent: number;
  energy_fulfillment_percent: number;
}

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export interface MealLog {
  id: number;
  food_id: number | null;
  food_name: string;
  meal_type: MealType;
  date: string; // YYYY-MM-DD
  servings: number;
  energy: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutrientTotals {
  energy: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyMealSummary {
  date: string;
  age_in_months: number;
  meals: MealLog[];
  totals: NutrientTotals;
  targets: NutrientTotals | null;
  fulfillment_percent: NutrientTotals | null;
  akg_bracket: string | null;
}

export interface Milestone {
  id: number;
  min_months: number;
  max_months: number; // exclusive
  age_label: string;
  domain: string;
  question: string;
  expected: string | null;
  active: boolean;
  sort_order: number;
}

export interface MilestoneItem {
  id: number;
  min_months: number;
  max_months: number;
  age_label: string;
  domain: string;
  question: string;
  expected: string | null;
  achieved: boolean | null;
  answered_on: string | null;
}

export interface MilestoneChecklist {
  age_in_months: number;
  age_label: string | null;
  items: MilestoneItem[];
  total: number;
  answered: number;
  achieved: number;
  interpretation: string | null;
}

export type EventType = "Vaccination" | "Doctor Visit" | "Checkup" | "Other";
export const EVENT_TYPES: EventType[] = ["Vaccination", "Doctor Visit", "Checkup", "Other"];

export interface HealthEvent {
  id: number;
  title: string;
  event_type: EventType;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  notes: string | null;
  done: boolean;
  vaccine_code: string | null;
}

export type DoseStatus = "given" | "due" | "overdue" | "upcoming";

export interface VaccineDose {
  code: string;
  name: string;
  vaccine: string;
  dose: string;
  due_age_months: number;
  due_date: string;
  late_after: string;
  note: string;
  status: DoseStatus;
  given_on: string | null;
  event_id: number | null;
}

export interface ImmunizationSummary {
  schedule: VaccineDose[];
  given: number;
  due: number;
  overdue: number;
  upcoming: number;
  next_dose: VaccineDose | null;
}

export type AlertSeverity = "high" | "medium" | "low";
export type AlertCategory = "Growth" | "Nutrition" | "Development" | "Immunization";

export interface AlertItem {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  date: string;
  action_path: string;
}

export interface ReportMeasurement {
  date: string;
  age_in_days: number;
  weight_kg: number;
  height_cm: number;
  bmi: number;
  wfa_zscore: number;
  lhfa_zscore: number;
  wfh_zscore: number | null;
  bfa_zscore: number | null;
}

export interface GrowthReport {
  generated_on: string;
  child: { id: number; name: string; gender: "male" | "female"; birth_date: string; age_in_months: number; region: string | null };
  measurements: ReportMeasurement[];
  latest: ReportMeasurement | null;
  change_since_first: { days: number; weight_kg: number; height_cm: number; bmi: number } | null;
  status: { stunting: string; weight: string; wasting: string | null; bmi: string | null } | null;
  nutrition_7d: {
    window_days: number;
    days_logged: number;
    logged_today: boolean;
    average: NutrientTotals;
    targets: NutrientTotals | null;
    fulfillment_percent: NutrientTotals | null;
  };
  milestones: { age_label: string | null; total: number; answered: number; achieved: number; interpretation: string | null };
  immunization: { given: number; due: number; overdue: number; upcoming: number; total: number; next_dose: VaccineDose | null; overdue_names: string[] };
  alerts: AlertItem[];
}

export interface Article {
  id: number;
  title: string;
  category: string;
  author: string;
  read_time_min: number;
  summary: string;
  body: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

/** Parent-facing article (published only; no `published` flag exposed). */
export type ArticleView = Omit<Article, "published" | "created_at">;

export interface AdminInfo {
  id: number;
  email: string;
  name: string;
  is_superadmin: boolean;
}

export interface SystemSummary {
  version: string;
  database: string;
  counts: Record<string, number>;
  reference: Record<string, number>;
  last_measurement_at: string | null;
  last_meal_on: string | null;
}

// ---- Health Manager portal ------------------------------------------------

export type ChildFlag = "normal" | "stunted" | "underweight" | "wasted" | "overweight" | "stale" | "no_data";

export interface RegistryChild {
  id: number;
  name: string;
  gender: "male" | "female";
  birth_date: string;
  age_in_months: number;
  region: string | null;
  parent_email_masked: string;
  measurements_count: number;
  last_measured_on: string | null;
  latest: {
    weight_kg: number;
    height_cm: number;
    wfa_zscore: number;
    lhfa_zscore: number;
    wfh_zscore: number | null;
    stunting_status: string;
    weight_status: string;
    wasting_status: string | null;
  } | null;
  flags: ChildFlag[];
}

export interface DashboardOverview {
  children_total: number;
  children_measured: number;
  stunting_rate: number;
  status: Record<"normal" | "stunted" | "severely_stunted" | "underweight" | "wasted" | "overweight" | "stale" | "unmeasured", number>;
  parents_total: number;
  regions_total: number;
  last_30_days: { measurements: number; children_measured: number; meals: number; milestone_answers: number };
  immunization: { children_with_overdue: number; overdue_doses: number };
}

export interface RecentMeasurement {
  id: number;
  child_id: number;
  child_name: string;
  gender: "male" | "female";
  region: string | null;
  age_in_months: number;
  date: string;
  weight_kg: number;
  height_cm: number;
  lhfa_zscore: number;
  wfa_zscore: number;
  wfh_zscore: number | null;
  stunting_status: string;
}

export type AdminChildDetail = GrowthReport & { child: GrowthReport["child"] & { parent_email_masked: string } };

export interface FoodItem {
  id: number;
  name: string;
  category: string;
  energy: number;
  protein: number;
  carbs: number;
  fat: number;
  safe: boolean;
}

export interface AKGRow {
  id?: number;
  ageGroup: string;
  gender: string;
  energy: string;
  protein: string;
  fat: string;
  carbs: string;
  vitA: string | null;
  vitC: string | null;
  iron: string | null;
  calcium: string | null;
}

export interface StuntingStats {
  region_name: string;
  total_children: number;
  children_measured: number;
  total_measurements: number;
  stunted_cases: number;
  severely_stunted_cases: number;
  stunting_rate: number; // 0..1
  warning: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface AdminTokenResponse extends TokenResponse {
  admin_info: { id: number; email: string; name: string; is_superadmin: boolean };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** Authenticated binary download (PDF). Plain <a href> cannot carry the bearer token. */
async function fetchPdf(path: string): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${session.getToken() ?? ""}` } });
  if (res.status === 401) {
    session.clear();
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    throw new ApiError(401, "Your session has expired. Please log in again.");
  }
  if (!res.ok) throw new ApiError(res.status, `Could not generate the report (${res.status})`);
  return res.blob();
}

/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function loginForm(email: string, password: string) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return form;
}

export const api = {
  parent: {
    register: (email: string, password: string) =>
      apiFetch<{ id: number; email: string }>("/api/v1/user/auth/register", {
        method: "POST",
        body: { email, password },
        auth: false,
      }),
    login: (email: string, password: string) =>
      apiFetch<TokenResponse>("/api/v1/user/auth/login", { method: "POST", body: loginForm(email, password), auth: false }),

    listChildren: () => apiFetch<Child[]>("/api/v1/user/children/"),
    createChild: (data: Pick<Child, "name" | "gender" | "birth_date"> & { region?: string | null }) =>
      apiFetch<Child>("/api/v1/user/children/", { method: "POST", body: data }),
    updateChild: (childId: number, data: Partial<Pick<Child, "name" | "gender" | "birth_date" | "region">>) =>
      apiFetch<Child>(`/api/v1/user/children/${childId}`, { method: "PUT", body: data }),

    listArticles: (category?: string) => apiFetch<ArticleView[]>("/api/v1/user/articles", { query: { category } }),
    article: (id: number) => apiFetch<ArticleView>(`/api/v1/user/articles/${id}`),

    alerts: (childId: number) => apiFetch<AlertItem[]>(`/api/v1/user/child/${childId}/alerts`),
    report: (childId: number) => apiFetch<GrowthReport>(`/api/v1/user/child/${childId}/report`),
    /** Fetches the PDF as a Blob (needs the bearer token, so no plain <a href>). */
    reportPdf: (childId: number) => fetchPdf(`/api/v1/user/child/${childId}/report.pdf`),

    listMeasurements: (childId: number) => apiFetch<Measurement[]>(`/api/v1/user/child/${childId}/measurements`),
    logMeasurement: (childId: number, data: { weight_kg: number; height_cm: number; date_logged: string }) =>
      apiFetch<Measurement>(`/api/v1/user/child/${childId}/measurements`, { method: "POST", body: data }),

    growthStandards: (metric: "wfa" | "lhfa" | "bfa", gender: Child["gender"]) =>
      apiFetch<GrowthStandardPoint[]>("/api/v1/user/growth-standards", { query: { metric, gender } }),

    analyzeNutrition: (childId: number, totals: { total_protein: number; total_energy: number }) =>
      apiFetch<{ message: string; data: NutritionAnalysis }>(`/api/v1/user/nutrition/${childId}/analyze`, {
        method: "POST",
        body: totals,
      }),

    searchFoods: (params: { q?: string; category?: string; limit?: number } = {}) =>
      apiFetch<FoodItem[]>("/api/v1/user/foods", { query: params }),
    dailyMeals: (childId: number, date: string) =>
      apiFetch<DailyMealSummary>(`/api/v1/user/child/${childId}/meals`, { query: { date } }),
    logMeal: (childId: number, data: { food_id: number; meal_type: MealType; date: string; servings: number }) =>
      apiFetch<MealLog>(`/api/v1/user/child/${childId}/meals`, { method: "POST", body: data }),
    deleteMeal: (childId: number, mealId: number) =>
      apiFetch<null>(`/api/v1/user/child/${childId}/meals/${mealId}`, { method: "DELETE" }),

    immunizations: (childId: number) => apiFetch<ImmunizationSummary>(`/api/v1/user/child/${childId}/immunizations`),
    markDoseGiven: (childId: number, code: string, data: { given_on?: string; notes?: string } = {}) =>
      apiFetch<ImmunizationSummary>(`/api/v1/user/child/${childId}/immunizations/${code}/given`, { method: "POST", body: data }),
    unmarkDoseGiven: (childId: number, code: string) =>
      apiFetch<ImmunizationSummary>(`/api/v1/user/child/${childId}/immunizations/${code}/given`, { method: "DELETE" }),

    listEvents: (childId: number, params: { month?: string; upcoming_only?: boolean } = {}) =>
      apiFetch<HealthEvent[]>(`/api/v1/user/child/${childId}/events`, { query: params }),
    createEvent: (childId: number, data: { title: string; event_type: EventType; date: string; time?: string | null; notes?: string | null }) =>
      apiFetch<HealthEvent>(`/api/v1/user/child/${childId}/events`, { method: "POST", body: data }),
    updateEvent: (childId: number, eventId: number, data: Partial<Omit<HealthEvent, "id" | "vaccine_code">>) =>
      apiFetch<HealthEvent>(`/api/v1/user/child/${childId}/events/${eventId}`, { method: "PUT", body: data }),
    deleteEvent: (childId: number, eventId: number) =>
      apiFetch<null>(`/api/v1/user/child/${childId}/events/${eventId}`, { method: "DELETE" }),

    milestones: (childId: number, bracketMonths?: number) =>
      apiFetch<MilestoneChecklist>(`/api/v1/user/child/${childId}/milestones`, { query: { bracket_months: bracketMonths } }),
    answerMilestone: (childId: number, milestoneId: number, achieved: boolean) =>
      apiFetch<MilestoneChecklist>(`/api/v1/user/child/${childId}/milestones/${milestoneId}`, { method: "PUT", body: { achieved } }),
  },

  admin: {
    login: (email: string, password: string) =>
      apiFetch<AdminTokenResponse>("/api/v1/admin/auth/login", { method: "POST", body: loginForm(email, password), auth: false }),
    me: () => apiFetch<AdminTokenResponse["admin_info"]>("/api/v1/admin/auth/me"),

    stats: (region?: string) => apiFetch<StuntingStats>("/api/v1/admin/dashboard/stunting-stats", { query: { region } }),
    overview: () => apiFetch<DashboardOverview>("/api/v1/admin/dashboard/overview"),
    recentMeasurements: (limit = 10) => apiFetch<RecentMeasurement[]>("/api/v1/admin/dashboard/recent-measurements", { query: { limit } }),
    listChildren: (params: { q?: string; region?: string; flag?: string; limit?: number; offset?: number } = {}) =>
      apiFetch<{ total: number; items: RegistryChild[] }>("/api/v1/admin/children", { query: params }),
    childDetail: (id: number) => apiFetch<AdminChildDetail>(`/api/v1/admin/children/${id}`),
    childMeals: (id: number, days = 7) => apiFetch<MealLog[]>(`/api/v1/admin/children/${id}/meals`, { query: { days } }),
    childReportPdf: (id: number) => fetchPdf(`/api/v1/admin/children/${id}/report.pdf`),
    regionStats: () => apiFetch<StuntingStats[]>("/api/v1/admin/dashboard/regions"),

    listFoods: (params: { q?: string; category?: string; safe_only?: boolean; limit?: number; offset?: number } = {}) =>
      apiFetch<FoodItem[]>("/api/v1/admin/foods", { query: params }),
    createFood: (data: Omit<FoodItem, "id">) => apiFetch<FoodItem>("/api/v1/admin/foods", { method: "POST", body: data }),
    updateFood: (id: number, data: Omit<FoodItem, "id">) =>
      apiFetch<FoodItem>(`/api/v1/admin/foods/${id}`, { method: "PUT", body: data }),
    deleteFood: (id: number) => apiFetch<{ status: string }>(`/api/v1/admin/foods/${id}`, { method: "DELETE" }),

    listMilestones: () => apiFetch<Milestone[]>("/api/v1/admin/milestones"),
    createMilestone: (data: Omit<Milestone, "id">) => apiFetch<Milestone>("/api/v1/admin/milestones", { method: "POST", body: data }),
    updateMilestone: (id: number, data: Omit<Milestone, "id">) =>
      apiFetch<Milestone>(`/api/v1/admin/milestones/${id}`, { method: "PUT", body: data }),
    deleteMilestone: (id: number) => apiFetch<null>(`/api/v1/admin/milestones/${id}`, { method: "DELETE" }),

    growthStandards: (metric: "wfa" | "lhfa" | "bfa", gender: "male" | "female") =>
      apiFetch<GrowthStandardPoint[]>("/api/v1/admin/datasets/growth-standards", { query: { metric, gender } }),

    listArticles: () => apiFetch<Article[]>("/api/v1/admin/articles"),
    createArticle: (data: Omit<Article, "id" | "created_at" | "updated_at">) => apiFetch<Article>("/api/v1/admin/articles", { method: "POST", body: data }),
    updateArticle: (id: number, data: Omit<Article, "id" | "created_at" | "updated_at">) =>
      apiFetch<Article>(`/api/v1/admin/articles/${id}`, { method: "PUT", body: data }),
    deleteArticle: (id: number) => apiFetch<null>(`/api/v1/admin/articles/${id}`, { method: "DELETE" }),

    systemSummary: () => apiFetch<SystemSummary>("/api/v1/admin/system/summary"),
    listAdmins: () => apiFetch<AdminInfo[]>("/api/v1/admin/system/admins"),
    seedReferenceData: () => apiFetch<Record<string, number>>("/api/v1/admin/system/seed", { method: "POST" }),
    registerAdmin: (data: { email: string; password: string; name: string; is_superadmin: boolean }) =>
      apiFetch<AdminInfo>("/api/v1/admin/auth/register", { method: "POST", body: data }),

    getAkg: () => apiFetch<AKGRow[]>("/api/v1/admin/datasets/akg"),
    updateAkg: (rows: AKGRow[]) =>
      apiFetch<{ status: string; rows: number }>("/api/v1/admin/datasets/update-akg", {
        method: "POST",
        body: { akg_data: rows },
      }),
  },
};

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** "1 year, 6 months old" style label from a YYYY-MM-DD birth date. */
export function formatAge(birthDate: string, short = false): string {
  const dob = new Date(birthDate);
  const today = new Date();
  let months = (today.getFullYear() - dob.getFullYear()) * 12 + today.getMonth() - dob.getMonth();
  if (today.getDate() < dob.getDate()) months -= 1;
  months = Math.max(months, 0);
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (short) return years === 0 ? `${rem} mo` : `${years} yr ${rem} mo`;
  if (years === 0) return `${rem} month${rem === 1 ? "" : "s"} old`;
  return `${years} year${years === 1 ? "" : "s"}, ${rem} month${rem === 1 ? "" : "s"} old`;
}

export function ageInMonths(birthDate: string, on: Date = new Date()): number {
  const dob = new Date(birthDate);
  let months = (on.getFullYear() - dob.getFullYear()) * 12 + on.getMonth() - dob.getMonth();
  if (on.getDate() < dob.getDate()) months -= 1;
  return Math.max(months, 0);
}

/** Local calendar date as YYYY-MM-DD (avoids the UTC shift of toISOString()). */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
