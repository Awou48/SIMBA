import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Plus, AlertCircle, Search, X, Trash2, Loader2, Minus } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  api,
  errorMessage as toMessage,
  toDateString,
  MEAL_TYPES,
  type DailyMealSummary,
  type FoodItem,
  type MealType,
} from "../../../lib/api";
import { useChildren } from "../../ChildContext";
import { FrameModal } from "../FrameModal";

const FONT = "'Nunito', sans-serif";

const EMPTY_SUMMARY: Omit<DailyMealSummary, "date" | "age_in_months"> = {
  meals: [],
  totals: { energy: 0, protein: 0, carbs: 0, fat: 0 },
  targets: null,
  fulfillment_percent: null,
  akg_bracket: null,
};

const categoryColors: Record<string, { color: string; bg: string }> = {
  Protein: { color: "#4F46E5", bg: "#EEF2FF" },
  "Main Course": { color: "#F47B20", bg: "#FFF7ED" },
  Fruit: { color: "#E53535", bg: "#FFF0F0" },
  Vegetable: { color: "#5CC8C2", bg: "#E8F9F8" },
  Dairy: { color: "#06B6D4", bg: "#ECFEFF" },
  Snack: { color: "#FFC72C", bg: "#FEFCE8" },
  Carbs: { color: "#9B8BF4", bg: "#F0EDFF" },
  Other: { color: "#717182", bg: "#F5F5F5" },
};

export function FoodDiaryScreen() {
  const navigate = useNavigate();
  const { activeChild: child, isLoading: childLoading } = useChildren();

  const [activeCategory, setActiveCategory] = useState<MealType>("Breakfast");
  const [dateOffset, setDateOffset] = useState(0);
  const [summary, setSummary] = useState<DailyMealSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Add-food modal
  const [showPicker, setShowPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerError, setPickerError] = useState("");

  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() + dateOffset);
  const dateStr = toDateString(selectedDate);
  const canLog = dateOffset <= 0 && (!child || dateStr >= child.birth_date);

  const getDateLabel = () => {
    if (dateOffset === 0) return "Today";
    if (dateOffset === -1) return "Yesterday";
    return selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Load the day's meals + AKG comparison for the active child.
  useEffect(() => {
    if (childLoading) return;
    if (!child) {
      setError("No child profile yet. Add one from the Home screen.");
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api.parent
      .dailyMeals(child.id, dateStr)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch((err) => { if (!cancelled) setError(toMessage(err, "Failed to load the food diary.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [child?.id, childLoading, dateStr, reloadKey]);

  // Debounced food search inside the picker.
  useEffect(() => {
    if (!showPicker) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setIsSearching(true);
      api.parent
        .searchFoods({ q: query.trim() || undefined, limit: 30 })
        .then((data) => { if (!cancelled) setResults(data); })
        .catch((err) => { if (!cancelled) setPickerError(toMessage(err)); })
        .finally(() => { if (!cancelled) setIsSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, showPicker]);

  const openPicker = () => {
    setSelected(null);
    setServings(1);
    setQuery("");
    setPickerError("");
    setShowPicker(true);
  };

  const saveMeal = async () => {
    if (!child || !selected) return;
    setIsSaving(true);
    setPickerError("");
    try {
      await api.parent.logMeal(child.id, { food_id: selected.id, meal_type: activeCategory, date: dateStr, servings });
      setShowPicker(false);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setPickerError(toMessage(err, "Failed to log this food."));
    } finally {
      setIsSaving(false);
    }
  };

  const removeMeal = async (mealId: number) => {
    if (!child) return;
    try {
      await api.parent.deleteMeal(child.id, mealId);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(toMessage(err, "Failed to remove this entry."));
    }
  };

  const data = summary ?? { ...EMPTY_SUMMARY, date: dateStr, age_in_months: 0 };
  const { totals, targets, fulfillment_percent: pct } = data;
  const mealsInTab = data.meals.filter((m) => m.meal_type === activeCategory);
  const countByType = Object.fromEntries(MEAL_TYPES.map((t) => [t, data.meals.filter((m) => m.meal_type === t).length]));

  const pieData = [
    { name: "Carbs", value: totals.carbs, color: "#FFC72C" },
    { name: "Protein", value: totals.protein, color: "#5CC8C2" },
    { name: "Fat", value: totals.fat, color: "#F47B20" },
  ];
  const hasMacros = pieData.some((p) => p.value > 0);

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>🍽️ Food Diary</h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>
            {child ? `${child.name}'s daily nutrition log` : "Daily nutrition log"}
          </p>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center justify-center gap-4 px-4 mb-4">
        <button onClick={() => setDateOffset(dateOffset - 1)} className="rounded-full p-1.5" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <ChevronLeft size={18} style={{ color: "#2D3047" }} />
        </button>
        <div className="px-6 py-2 rounded-2xl" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#2D3047", fontFamily: FONT }}>{getDateLabel()}</span>
        </div>
        <button
          onClick={() => setDateOffset(Math.min(0, dateOffset + 1))}
          className="rounded-full p-1.5"
          style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", opacity: dateOffset === 0 ? 0.3 : 1 }}
          disabled={dateOffset === 0}
        >
          <ChevronRight size={18} style={{ color: "#2D3047" }} />
        </button>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{error}</p>
          </div>
        )}

        {/* Daily summary card */}
        <div className="rounded-3xl p-4 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #5CC8C2 0%, #3DA89F 100%)", boxShadow: "0 8px 24px rgba(92,200,194,0.3)" }}>
          <div className="flex-1">
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: FONT, fontWeight: 700 }}>Daily Energy</p>
            <p style={{ fontSize: "28px", fontWeight: 900, color: "white", fontFamily: FONT, lineHeight: 1 }}>
              {Math.round(totals.energy)}<span style={{ fontSize: "14px" }}> kcal</span>
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.9)", fontFamily: FONT, fontWeight: 700, marginTop: "4px" }}>
              {isLoading ? "Loading…" : targets ? `Target: ${targets.energy} kcal (${data.akg_bracket})` : "AKG target unavailable for this age"}
            </p>
            {pct && (
              <div className="mt-2 w-full bg-white/30 rounded-full h-1.5">
                <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct.energy, 100)}%` }} />
              </div>
            )}
          </div>
          <div style={{ width: 70, height: 70 }}>
            {hasMacros ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={32} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#2D3047", border: "none", borderRadius: 8, fontSize: 10, color: "white", fontFamily: FONT }}
                    formatter={(v: number) => [`${v}g`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ border: "6px solid rgba(255,255,255,0.3)" }}>
                <span style={{ fontSize: 18 }}>🥣</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {pieData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center gap-1">
                <div className="rounded-full" style={{ width: 6, height: 6, background: color }} />
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.8)", fontFamily: FONT, fontWeight: 700 }}>{name} {value}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* AKG fulfillment */}
        {targets && pct && (
          <div className="rounded-2xl p-3 bg-white shadow-sm border border-gray-100 flex flex-col gap-2">
            {[
              { key: "protein", label: "Protein", color: "#5CC8C2" },
              { key: "carbs", label: "Carbs", color: "#FFC72C" },
              { key: "fat", label: "Fat", color: "#F47B20" },
            ].map(({ key, label, color }) => {
              const k = key as keyof typeof totals;
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>{label}</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>
                      {totals[k]}g / {targets[k]}g · <span style={{ color }}>{pct[k]}%</span>
                    </span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#F5F5F5" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct[k], 100)}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Meal category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {MEAL_TYPES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-2 rounded-full transition-all"
              style={{
                background: activeCategory === cat ? "#5CC8C2" : "white",
                color: activeCategory === cat ? "white" : "#717182",
                fontSize: "12px", fontWeight: 800, fontFamily: FONT,
                boxShadow: activeCategory === cat ? "0 4px 12px rgba(92,200,194,0.4)" : "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {cat}{countByType[cat] ? ` · ${countByType[cat]}` : ""}
            </button>
          ))}
        </div>

        {/* Food entries */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={22} style={{ color: "#5CC8C2" }} /></div>
          ) : mealsInTab.length === 0 ? (
            <p className="text-center py-4" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>
              Nothing logged for {activeCategory.toLowerCase()} {getDateLabel().toLowerCase()}.
            </p>
          ) : (
            mealsInTab.map((meal) => {
              const macroSum = meal.protein + meal.carbs + meal.fat || 1;
              return (
                <div key={meal.id} className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: "14px", fontWeight: 800, color: "#2D3047", fontFamily: FONT }}>{meal.food_name}</p>
                      <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>
                        {meal.servings} serving{meal.servings === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full flex-shrink-0" style={{ background: "#FFF0E0", fontSize: "12px", fontWeight: 800, color: "#F47B20", fontFamily: FONT }}>
                      {Math.round(meal.energy)} kcal
                    </span>
                    <button onClick={() => removeMeal(meal.id)} className="rounded-xl p-1.5 flex-shrink-0" style={{ background: "#FFF0F0" }} aria-label="Remove">
                      <Trash2 size={14} style={{ color: "#E53535" }} />
                    </button>
                  </div>
                  <div className="flex gap-1 h-2 rounded-full overflow-hidden" style={{ background: "#F5F5F5" }}>
                    <div style={{ width: `${(meal.protein / macroSum) * 100}%`, background: "#5CC8C2" }} />
                    <div style={{ width: `${(meal.carbs / macroSum) * 100}%`, background: "#FFC72C" }} />
                    <div style={{ width: `${(meal.fat / macroSum) * 100}%`, background: "#F47B20" }} />
                  </div>
                  <div className="flex gap-3 mt-1.5">
                    {[
                      { label: "P", value: meal.protein, color: "#5CC8C2" },
                      { label: "C", value: meal.carbs, color: "#FFC72C" },
                      { label: "F", value: meal.fat, color: "#F47B20" },
                    ].map(({ label, value, color }) => (
                      <span key={label} style={{ fontSize: "10px", color, fontWeight: 700, fontFamily: FONT }}>{label}: {value}g</span>
                    ))}
                  </div>
                </div>
              );
            })
          )}

          <button
            onClick={openPicker}
            disabled={!child || !canLog}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: "white", border: "2px dashed #5CC8C2", color: "#3DA89F", fontSize: "13px", fontWeight: 800, fontFamily: FONT }}
          >
            <Plus size={16} /> Add food to {activeCategory}
          </button>
        </div>
      </div>

      {/* Food picker modal */}
      {showPicker && (
        <FrameModal onClose={() => !isSaving && setShowPicker(false)}>
          <div
            className="w-full rounded-t-3xl p-5 flex flex-col gap-3"
            style={{ background: "white", boxShadow: "0 -12px 40px rgba(0,0,0,0.2)", maxHeight: "85%" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: "16px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>Add to {activeCategory}</p>
                <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>{getDateLabel()} · {child?.name}</p>
              </div>
              <button onClick={() => setShowPicker(false)} className="rounded-full p-1.5" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>

            {pickerError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{pickerError}</p>
              </div>
            )}

            {selected ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl p-3" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "14px", fontWeight: 800, color: "#2D3047", fontFamily: FONT }}>{selected.name}</p>
                      <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>
                        per serving: {selected.energy} kcal · P {selected.protein}g · C {selected.carbs}g · F {selected.fat}g
                      </p>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ fontSize: "11px", fontWeight: 800, color: "#5CC8C2", fontFamily: FONT }}>Change</button>
                  </div>
                  {!selected.safe && (
                    <p className="mt-2 px-2 py-1 rounded-lg inline-block" style={{ background: "#FFF0F0", fontSize: "10px", fontWeight: 800, color: "#E53535", fontFamily: FONT }}>
                      ⚠️ Flagged as not toddler-safe
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Servings</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setServings((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))} className="rounded-full p-1.5" style={{ background: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}><Minus size={14} /></button>
                    <span style={{ fontSize: "16px", fontWeight: 900, color: "#2D3047", fontFamily: FONT, minWidth: 32, textAlign: "center" }}>{servings}</span>
                    <button onClick={() => setServings((s) => Math.min(10, +(s + 0.5).toFixed(1)))} className="rounded-full p-1.5" style={{ background: "white", boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}><Plus size={14} /></button>
                  </div>
                </div>

                <p className="text-center" style={{ fontSize: "12px", fontWeight: 700, color: "#717182", fontFamily: FONT }}>
                  = {Math.round(selected.energy * servings)} kcal · P {(selected.protein * servings).toFixed(1)}g · C {(selected.carbs * servings).toFixed(1)}g · F {(selected.fat * servings).toFixed(1)}g
                </p>

                <button
                  onClick={saveMeal}
                  disabled={isSaving}
                  className="w-full py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
                  style={{ background: "linear-gradient(90deg, #5CC8C2, #3DA89F)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: FONT, boxShadow: "0 4px 16px rgba(92,200,194,0.35)" }}
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {isSaving ? "Saving…" : "Log this food"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
                  <Search size={16} style={{ color: "#9BA3B8" }} />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search 1,600+ Indonesian foods…"
                    className="flex-1 bg-transparent outline-none"
                    style={{ fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: FONT }}
                  />
                  {isSearching && <Loader2 size={14} className="animate-spin" style={{ color: "#9BA3B8" }} />}
                </div>
                <div className="overflow-y-auto flex flex-col gap-2" style={{ maxHeight: 380 }}>
                  {results.length === 0 && !isSearching ? (
                    <p className="text-center py-6" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>No foods match "{query}".</p>
                  ) : (
                    results.map((food) => {
                      const c = categoryColors[food.category] ?? categoryColors.Other;
                      return (
                        <button
                          key={food.id}
                          onClick={() => setSelected(food)}
                          className="w-full text-left rounded-2xl p-3 transition-colors active:bg-gray-50"
                          style={{ background: "white", border: "1.5px solid #F0F1F5" }}
                        >
                          <div className="flex items-center gap-2">
                            <p className="flex-1 truncate" style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: FONT }}>{food.name}</p>
                            <span className="px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: c.bg, color: c.color, fontSize: "9px", fontWeight: 800, fontFamily: FONT }}>{food.category}</span>
                            {!food.safe && <span title="Flagged" style={{ fontSize: 12 }}>⚠️</span>}
                          </div>
                          <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 700 }}>
                            {food.energy} kcal · P {food.protein}g · C {food.carbs}g · F {food.fat}g
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </FrameModal>
      )}
    </div>
  );
}
