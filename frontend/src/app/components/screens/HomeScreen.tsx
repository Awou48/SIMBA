import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Check, Plus, Utensils, Syringe, Download, Scale } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import logo1 from "../../../imports/logo_1.png"; // Note the lowercase 'l' for safety!
import { api, formatAge, toDateString, type DailyMealSummary, type Measurement } from "../../../lib/api";
import { useChildren } from "../../ChildContext";

const NUTRIENTS = [
  { key: "energy", label: "Calories", color: "#F47B20", unit: "kcal" },
  { key: "protein", label: "Protein", color: "#5CC8C2", unit: "g" },
  { key: "carbs", label: "Carbs", color: "#FFC72C", unit: "g" },
  { key: "fat", label: "Fat", color: "#FF7BAC", unit: "g" },
] as const;

const quickActions = [
  { icon: <Scale size={22} />, label: "Log Weight\n& Height", color: "#F47B20", bg: "#FFF0E0", path: "/growth" },
  { icon: <Utensils size={22} />, label: "Log Meals", color: "#5CC8C2", bg: "#E8F9F8", path: "/food-diary" },
  { icon: <Syringe size={22} />, label: "Immunization\nSchedule", color: "#FFC72C", bg: "#FFF8E0", path: "/immunization" },
  { icon: <Download size={22} />, label: "Download\nReport", color: "#9B8BF4", bg: "#F0EDFF", path: "/reports" },
];

const recipes = [
  { name: "Avocado Toast Bites", cal: 180, img: "https://images.unsplash.com/photo-1561517146-dfbd99b0c14d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdm9jYWRvJTIwdG9hc3QlMjBoZWFsdGh5JTIwYnJlYWtmYXN0fGVufDF8fHx8MTc3ODI0NzIwNnww&ixlib=rb-4.1.0&q=80&w=1080" },
  { name: "Veggie Soup", cal: 120, img: "https://images.unsplash.com/photo-1641595573308-8964aa5d6a21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdmVnZXRhYmxlJTIwc291cCUyMGtpZHN8ZW58MXx8fHwxNzc4MjUyMTk0fDA&ixlib=rb-4.1.0&q=80&w=1080" },
  { name: "Fruit Smoothie", cal: 95, img: "https://images.unsplash.com/photo-1511909525232-61113c912358?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcnVpdCUyMHNtb290aGllJTIwYm93bCUyMGNvbG9yZnVsfGVufDF8fHx8MTc3ODI1MjE5NHww&ixlib=rb-4.1.0&q=80&w=1080" },
];

export function HomeScreen() {
  const navigate = useNavigate();
  const { children, activeChild: child, isLoading, setActiveChild } = useChildren();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [history, setHistory] = useState<Measurement[]>([]);
  const [today, setToday] = useState<DailyMealSummary | null>(null);

  // Pull the active child's measurement history for the overview card.
  useEffect(() => {
    if (!child) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    api.parent
      .listMeasurements(child.id)
      .then((rows) => { if (!cancelled) setHistory(rows); })
      .catch(() => { if (!cancelled) setHistory([]); });
    api.parent
      .dailyMeals(child.id, toDateString(new Date()))
      .then((s) => { if (!cancelled) setToday(s); })
      .catch(() => { if (!cancelled) setToday(null); });
    return () => { cancelled = true; };
  }, [child?.id]);

  const nutritionData = NUTRIENTS.map(({ key, label, color, unit }) => {
    const actual = today?.totals[key] ?? 0;
    const target = today?.targets?.[key] ?? null;
    return {
      label,
      color,
      value: target ? Math.min(100, (actual / target) * 100) : 0,
      unit: target ? `${Math.round(actual)}/${Math.round(target)}${unit === "g" ? "g" : " kcal"}` : `${Math.round(actual)} ${unit}`,
    };
  });

  const latest = history.length ? history[history.length - 1] : null;
  const sparklineData = history.slice(-8).map((m) => ({ w: m.weight_kg }));
  const growthStats = [
    { label: "Weight", value: latest ? String(latest.weight_kg) : "--", unit: "kg", icon: "⚖️" },
    { label: "Height", value: latest ? String(latest.height_cm) : "--", unit: "cm", icon: "📏" },
  ];

  return (
    <div className="flex flex-col gap-0 min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div
        className="px-4 pt-2 pb-6"
        style={{ background: "linear-gradient(160deg, #F47B20 0%, #FFC72C 100%)", borderRadius: "0 0 28px 28px" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              Good morning! 🌤️
            </p>
            <h1 style={{ fontSize: "22px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              Parent Portal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 42, height: 42, background: "rgba(255,255,255,0.9)" }}>
              <img src={logo1} alt="Avatar" className="w-8 h-8 object-contain" />
            </button>
          </div>
        </div>

        {/* Dynamic Child profile pill */}
        {isLoading ? (
           <div className="flex items-center justify-center px-4 py-3 rounded-2xl bg-white/20">
             <p className="text-white text-sm font-['Nunito'] font-bold animate-pulse">Loading profile...</p>
           </div>
        ) : child ? (
          <div className="relative">
            <button
              onClick={() => setSwitcherOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-transform active:scale-[0.98]"
              style={{ background: "rgba(255,255,255,0.25)", backdropFilter: "blur(10px)" }}
            >
              <div className="rounded-full overflow-hidden flex items-center justify-center text-xl" style={{ width: 38, height: 38, background: "white" }}>
                {child.gender === "male" ? "👦" : "👧"}
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "14px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>
                  {child.name}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                  {formatAge(child.birth_date)}{children.length > 1 ? ` · ${children.length} profiles` : ""}
                </p>
              </div>
              <ChevronDown size={18} color="rgba(255,255,255,0.8)" style={{ transform: switcherOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            {switcherOpen && (
              <div
                className="absolute left-0 right-0 z-30 mt-2 rounded-2xl overflow-hidden"
                style={{ background: "white", boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}
              >
                {children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveChild(c.id); setSwitcherOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-gray-50"
                    style={{ borderBottom: "1px solid #F5F5F5" }}
                  >
                    <span style={{ fontSize: 20 }}>{c.gender === "male" ? "👦" : "👧"}</span>
                    <div className="flex-1">
                      <p style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{c.name}</p>
                      <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{formatAge(c.birth_date)}</p>
                    </div>
                    {c.id === child.id && <Check size={16} style={{ color: "#F47B20" }} />}
                  </button>
                ))}
                <button
                  onClick={() => navigate("/add-child")}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-gray-50"
                >
                  <div className="rounded-full flex items-center justify-center" style={{ width: 28, height: 28, background: "#FFF0E0" }}>
                    <Plus size={14} style={{ color: "#F47B20" }} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 800, color: "#F47B20", fontFamily: "'Nunito', sans-serif" }}>Add another child</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => navigate("/add-child")} 
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-[#F47B20] font-bold shadow-lg font-['Nunito'] transition-transform active:scale-95"
          >
            ➕ Add a Child Profile
          </button>
        )}
      </div>

      <div className="px-4 pt-4 flex flex-col gap-5">
        {/* Hero growth card (Static visual for now) */}
        <div
          className="rounded-3xl p-4"
          style={{ background: "linear-gradient(135deg, #2D3047 0%, #3D4060 100%)", boxShadow: "0 8px 24px rgba(45,48,71,0.3)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
              📈 Growth Overview
            </p>
            <button
              onClick={() => navigate("/growth")}
              style={{ fontSize: "11px", color: "#FFC72C", fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}
            >
              View Full →
            </button>
          </div>
          <div className="flex items-center gap-4 mb-3">
            {growthStats.map(({ label, value, unit, icon }) => (
              <div key={label} className="flex-1 text-center">
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                  {icon} {label}
                </p>
                <p style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif", lineHeight: 1.1 }}>
                  {value}<span style={{ fontSize: "11px", color: "#FFC72C", fontWeight: 700 }}>{unit}</span>
                </p>
              </div>
            ))}
          </div>
          <div style={{ height: 50 }}>
            {sparklineData.length < 2 ? (
              <button
                onClick={() => navigate("/growth")}
                className="w-full h-full flex items-center justify-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.08)", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "'Nunito', sans-serif" }}
              >
                {latest ? "Log one more entry to see the trend →" : "No measurements yet — log the first one →"}
              </button>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line type="monotone" dataKey="w" stroke="#FFC72C" strokeWidth={2.5} dot={false} />
                <Tooltip
                  contentStyle={{ background: "#2D3047", border: "none", borderRadius: 8, fontSize: 11, color: "white", fontFamily: "'Nunito', sans-serif" }}
                  formatter={(v: number) => [`${v} kg`, "Weight"]}
                  labelFormatter={() => ""}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
          {latest && (
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, marginTop: 6 }}>
              {latest.stunting_status} · {latest.weight_status} · {new Date(latest.date_logged).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ icon, label, color, bg, path }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex items-center gap-3 p-4 rounded-2xl text-left transition-transform active:scale-95"
                style={{ background: bg, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
              >
                <div
                  className="rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ width: 42, height: 42, background: "white", boxShadow: `0 4px 12px ${color}30` }}
                >
                  <span style={{ color }}>{icon}</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif", whiteSpace: "pre-line", lineHeight: 1.3 }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Nutrition */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
              🥗 Today's Nutrition
            </h3>
            <button onClick={() => navigate("/food-diary")} style={{ fontSize: "11px", color: "#F47B20", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>
              {today && today.meals.length === 0 ? "Log a meal →" : "View →"}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {nutritionData.map(({ label, value, color, unit }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{label}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>{unit}</span>
                </div>
                <div className="rounded-full overflow-hidden" style={{ height: 8, background: "#F5F5F5" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Recipes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
              🍽️ Recommended Recipes
            </h3>
            <button onClick={() => navigate("/recipes")} style={{ fontSize: "11px", color: "#F47B20", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>See all →</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {recipes.map(({ name, cal, img }) => (
              <button
                key={name}
                onClick={() => navigate("/recipes")}
                className="flex-shrink-0 rounded-2xl overflow-hidden text-left transition-transform active:scale-95"
                style={{ width: 130, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              >
                <div className="relative" style={{ height: 90 }}>
                  <img src={img} alt={name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full" style={{ background: "rgba(244,123,32,0.9)" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>{cal} kcal</span>
                  </div>
                </div>
                <div className="px-2 py-2" style={{ background: "white" }}>
                  <p style={{ fontSize: "11px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.3 }}>{name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}