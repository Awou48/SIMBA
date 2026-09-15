import { plain, secure } from "./storage";

const DEFAULT_API_URL = "http://10.0.2.2:8000";

export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

const TOKEN_KEY = "simba_token";
const CHILD_KEY = "simba_active_child";

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener): () => void {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

let cachedToken: string | null | undefined;

export const session = {
  async load(): Promise<string | null> {
    if (cachedToken === undefined) cachedToken = await secure.get(TOKEN_KEY);
    return cachedToken;
  },
  getToken: () => cachedToken ?? null,
  async set(token: string) {
    cachedToken = token;
    await secure.set(TOKEN_KEY, token);
  },
  async clear() {
    cachedToken = null;
    await secure.remove(TOKEN_KEY);
    await plain.remove(CHILD_KEY);
  },
  async getActiveChildId(): Promise<number | null> {
    const raw = await plain.get(CHILD_KEY);
    return raw ? Number(raw) : null;
  },
  async setActiveChildId(id: number | null) {
    if (id === null) await plain.remove(CHILD_KEY);
    else await plain.set(CHILD_KEY, String(id));
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

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
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  let url = API_URL + path;
  if (query) {
    const params = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    if (params.length) url += (url.includes("?") ? "&" : "?") + params.join("&");
  }
  return url;
}

async function handleUnauthorized() {
  await session.clear();
  unauthorizedListeners.forEach((fn) => fn());
}

export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = opts;
  const headers: Record<string, string> = {};
  let payload: string | undefined;
  if (body instanceof URLSearchParams) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = body.toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  if (auth) {
    const token = await session.load();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body: payload });
  } catch {
    throw new ApiError(0, `Cannot reach the SIMBA server at ${API_URL}. Check that the backend is running and the phone is on the same network.`);
  }

  if (response.status === 401 && auth) {
    await handleUnauthorized();
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }

  const text = await response.text();
  const data = text ? safeJson(text) : null;
  if (!response.ok) throw new ApiError(response.status, formatDetail(data, `Request failed (${response.status})`));
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export interface Child {
  id: number;
  parent_id: number;
  name: string;
  gender: "male" | "female";
  birth_date: string;
  region: string | null;
}

export interface Measurement {
  id: number;
  date_logged: string;
  age_in_days: number;
  weight_kg: number;
  height_cm: number;
  wfa_zscore: number;
  lhfa_zscore: number;
  wfh_zscore: number | null;
  bfa_zscore: number | null;
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

export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export interface MealLog {
  id: number;
  food_id: number | null;
  food_name: string;
  meal_type: MealType;
  date: string;
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
  date: string;
  time: string | null;
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

export interface ArticleView {
  id: number;
  title: string;
  category: string;
  author: string;
  read_time_min: number;
  summary: string;
  body: string | null;
  updated_at: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

function loginForm(email: string, password: string) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);
  return form;
}

export const api = {
  register: (email: string, password: string) =>
    apiFetch<{ id: number; email: string }>("/api/v1/user/auth/register", { method: "POST", body: { email, password }, auth: false }),
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
  reportPdfUrl: (childId: number) => `${API_URL}/api/v1/user/child/${childId}/report.pdf`,

  listMeasurements: (childId: number) => apiFetch<Measurement[]>(`/api/v1/user/child/${childId}/measurements`),
  logMeasurement: (childId: number, data: { weight_kg: number; height_cm: number; date_logged: string }) =>
    apiFetch<Measurement>(`/api/v1/user/child/${childId}/measurements`, { method: "POST", body: data }),
  growthStandards: (metric: "wfa" | "lhfa" | "bfa", gender: Child["gender"]) =>
    apiFetch<GrowthStandardPoint[]>("/api/v1/user/growth-standards", { query: { metric, gender } }),

  searchFoods: (params: { q?: string; category?: string; limit?: number } = {}) =>
    apiFetch<FoodItem[]>("/api/v1/user/foods", { query: params }),
  dailyMeals: (childId: number, date: string) => apiFetch<DailyMealSummary>(`/api/v1/user/child/${childId}/meals`, { query: { date } }),
  logMeal: (childId: number, data: { food_id: number; meal_type: MealType; date: string; servings: number }) =>
    apiFetch<MealLog>(`/api/v1/user/child/${childId}/meals`, { method: "POST", body: data }),
  deleteMeal: (childId: number, mealId: number) => apiFetch<null>(`/api/v1/user/child/${childId}/meals/${mealId}`, { method: "DELETE" }),

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
  deleteEvent: (childId: number, eventId: number) => apiFetch<null>(`/api/v1/user/child/${childId}/events/${eventId}`, { method: "DELETE" }),

  milestones: (childId: number, bracketMonths?: number) =>
    apiFetch<MilestoneChecklist>(`/api/v1/user/child/${childId}/milestones`, { query: { bracket_months: bracketMonths } }),
  answerMilestone: (childId: number, milestoneId: number, achieved: boolean) =>
    apiFetch<MilestoneChecklist>(`/api/v1/user/child/${childId}/milestones/${milestoneId}`, { method: "PUT", body: { achieved } }),
};

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
