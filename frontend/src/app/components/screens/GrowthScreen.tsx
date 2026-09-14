import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Legend } from "recharts";
import { api, errorMessage as toMessage, type GrowthStandardPoint, type Measurement } from "../../../lib/api";
import { useChildren } from "../../ChildContext";

type Metric = "weight" | "height";

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; color: string; standard: "wfa" | "lhfa"; field: keyof Measurement; z: keyof Measurement; status: keyof Measurement }> = {
  weight: { label: "Weight", unit: "kg", color: "#F47B20", standard: "wfa", field: "weight_kg", z: "wfa_zscore", status: "weight_status" },
  height: { label: "Height", unit: "cm", color: "#5CC8C2", standard: "lhfa", field: "height_cm", z: "lhfa_zscore", status: "stunting_status" },
};

const DAYS_PER_MONTH = 30.4375;

/** Merge WHO percentile curve + child measurements into one series keyed by age (months). */
function buildChartData(standards: GrowthStandardPoint[], history: Measurement[], field: keyof Measurement, maxMonths: number) {
  const rows: Record<string, number | null>[] = standards
    .filter((p) => p.age_months <= maxMonths)
    .map((p) => ({ age: p.age_months, p3: p.p3, p50: p.p50, p97: p.p97, value: null, band: p.p97 - p.p3 }));
  for (const m of history) {
    rows.push({ age: +(m.age_in_days / DAYS_PER_MONTH).toFixed(2), value: m[field] as number, p3: null, p50: null, p97: null, band: null });
  }
  return rows.sort((a, b) => (a.age as number) - (b.age as number));
}

function statusTone(z: number) {
  if (z < -2) return { color: "#E53535", bg: "#FFF0F0" };
  if (z > 2) return { color: "#F47B20", bg: "#FFF0E0" };
  return { color: "#2BA89F", bg: "#E8F9F8" };
}

const CustomTooltip = ({ active, payload, unit }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={{ background: "#2D3047", borderRadius: 12, padding: "8px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", fontFamily: "'Nunito', sans-serif" }}>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{Number(row.age).toFixed(1)} months</p>
      {row.value != null && <p style={{ fontSize: 12, color: "#FFC72C", fontWeight: 800 }}>Child: {row.value} {unit}</p>}
      {row.p50 != null && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>WHO median: {row.p50} {unit}</p>}
    </div>
  );
};

export function GrowthScreen() {
  const navigate = useNavigate();
  const { activeChild: child, isLoading: childLoading } = useChildren();

  const [activeChart, setActiveChart] = useState<Metric>("weight");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [history, setHistory] = useState<Measurement[]>([]);
  const [standards, setStandards] = useState<Record<"wfa" | "lhfa", GrowthStandardPoint[]>>({ wfa: [], lhfa: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastSaved, setLastSaved] = useState<Measurement | null>(null);

  // Load history + WHO curves whenever the active child changes.
  useEffect(() => {
    if (!child) return;
    let cancelled = false;
    setIsLoadingData(true);
    setErrorMessage("");
    Promise.all([
      api.parent.listMeasurements(child.id),
      api.parent.growthStandards("wfa", child.gender),
      api.parent.growthStandards("lhfa", child.gender),
    ])
      .then(([rows, wfa, lhfa]) => {
        if (cancelled) return;
        setHistory(rows);
        setStandards({ wfa, lhfa });
      })
      .catch((err) => { if (!cancelled) setErrorMessage(toMessage(err)); })
      .finally(() => { if (!cancelled) setIsLoadingData(false); });
    return () => { cancelled = true; };
  }, [child?.id, child?.gender]);

  const cfg = METRIC_CONFIG[activeChart];
  const latest = history.length ? history[history.length - 1] : null;

  const chartData = useMemo(() => {
    const maxAgeMonths = Math.max(12, Math.ceil((latest?.age_in_days ?? 0) / DAYS_PER_MONTH) + 3);
    return buildChartData(standards[cfg.standard], history, cfg.field, Math.min(60, maxAgeMonths));
  }, [standards, history, cfg]);

  const handleSaveMeasurement = async () => {
    setErrorMessage("");
    if (!weight || !height) {
      setErrorMessage("Please enter both weight and height.");
      return;
    }
    if (!child) {
      setErrorMessage("No child selected. Add a child profile first.");
      return;
    }
    setIsSaving(true);
    try {
      const saved = await api.parent.logMeasurement(child.id, {
        date_logged: date,
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
      });
      setLastSaved(saved);
      setHistory((prev) => [...prev, saved].sort((a, b) => a.date_logged.localeCompare(b.date_logged)));
      setWeight("");
      setHeight("");
    } catch (err) {
      setErrorMessage(toMessage(err, "Failed to save measurement."));
    } finally {
      setIsSaving(false);
    }
  };

  const statCards = [
    { label: "Latest Weight", value: latest ? `${latest.weight_kg} kg` : "--", icon: "⚖️", color: "#F47B20", bg: "#FFF0E0" },
    { label: "Latest Height", value: latest ? `${latest.height_cm} cm` : "--", icon: "📏", color: "#5CC8C2", bg: "#E8F9F8" },
    {
      label: "Height-for-age",
      value: latest ? `z ${latest.lhfa_zscore > 0 ? "+" : ""}${latest.lhfa_zscore}` : "--",
      icon: "📊",
      color: latest ? statusTone(latest.lhfa_zscore).color : "#9BA3B8",
      bg: "#F0EDFF",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
            📈 Growth Tracker
          </h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
            {childLoading ? "Loading…" : child ? `${child.name} · ${child.gender === "male" ? "Boy" : "Girl"}` : "No child selected"}
          </p>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-6">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600 font-['Nunito']">{errorMessage}</p>
          </div>
        )}

        {!childLoading && !child && (
          <button
            onClick={() => navigate("/add-child")}
            className="w-full py-3 rounded-2xl font-bold text-white font-['Nunito']"
            style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)" }}
          >
            ➕ Add a child profile to start tracking
          </button>
        )}

        {/* Input card */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 12 }}>
            📝 Log New Entry
          </p>
          <div className="flex gap-3 mb-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#717182", fontFamily: "'Nunito', sans-serif" }}>Weight (kg)</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
                <span style={{ fontSize: "16px" }}>⚖️</span>
                <input
                  type="number" step="0.1" min="0" placeholder="e.g. 11.6" value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1 bg-transparent outline-none w-full"
                  style={{ fontSize: "14px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#717182", fontFamily: "'Nunito', sans-serif" }}>Height (cm)</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
                <span style={{ fontSize: "16px" }}>📏</span>
                <input
                  type="number" step="0.1" min="0" placeholder="e.g. 86" value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="flex-1 bg-transparent outline-none w-full"
                  style={{ fontSize: "14px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-3" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
            <span style={{ fontSize: "16px" }}>📅</span>
            <input
              type="date" value={date} max={new Date().toISOString().split("T")[0]} min={child?.birth_date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}
            />
          </div>

          <button
            onClick={handleSaveMeasurement}
            disabled={isSaving || !child}
            className="w-full py-3 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:scale-100"
            style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", boxShadow: "0 4px 16px rgba(244,123,32,0.3)" }}
          >
            <Save size={16} color="white" />
            <span style={{ fontSize: "14px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              {isSaving ? "Saving..." : "Save Entry"}
            </span>
          </button>

          {lastSaved && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-2xl" style={{ background: statusTone(lastSaved.lhfa_zscore).bg }}>
              <CheckCircle2 size={16} style={{ color: statusTone(lastSaved.lhfa_zscore).color, marginTop: 1 }} />
              <div style={{ fontFamily: "'Nunito', sans-serif" }}>
                <p style={{ fontSize: "12px", fontWeight: 800, color: "#2D3047" }}>Saved! WHO assessment:</p>
                <p style={{ fontSize: "11px", fontWeight: 700, color: statusTone(lastSaved.lhfa_zscore).color }}>
                  Height-for-age z {lastSaved.lhfa_zscore} · {lastSaved.stunting_status}
                </p>
                <p style={{ fontSize: "11px", fontWeight: 700, color: statusTone(lastSaved.wfa_zscore).color }}>
                  Weight-for-age z {lastSaved.wfa_zscore} · {lastSaved.weight_status}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {statCards.map(({ label, value, icon, color, bg }) => (
            <div key={label} className="rounded-2xl p-3 text-center" style={{ background: bg, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize: "18px" }}>{icon}</span>
              <p style={{ fontSize: "12px", fontWeight: 900, color, fontFamily: "'Nunito', sans-serif", marginTop: 2 }}>{value}</p>
              <p style={{ fontSize: "9px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Chart card */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
                {cfg.label}-for-age
              </p>
              <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                Shaded band = WHO 3rd–97th percentile
              </p>
            </div>
            <div className="flex gap-1 rounded-full p-0.5" style={{ background: "#F5F5F5" }}>
              {(["weight", "height"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveChart(type)}
                  className="rounded-full px-3 py-1 transition-all"
                  style={{
                    background: activeChart === type ? METRIC_CONFIG[type].color : "transparent",
                    fontSize: "11px", fontWeight: 800,
                    color: activeChart === type ? "white" : "#9BA3B8",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  {type === "weight" ? "⚖️ Weight" : "📏 Height"}
                </button>
              ))}
            </div>
          </div>

          {isLoadingData ? (
            <div className="h-[200px] flex items-center justify-center text-xs font-bold text-[#9BA3B8] font-['Nunito']">Loading chart…</div>
          ) : chartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-xs font-bold text-[#9BA3B8] font-['Nunito'] text-center px-6">
              WHO reference curves are not loaded yet. Ask the admin to run the database seeder.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 8, left: -18, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                <XAxis
                  dataKey="age" type="number" domain={["dataMin", "dataMax"]} allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
                  tickFormatter={(v) => `${Math.round(v)}m`}
                />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }} />
                <Tooltip content={<CustomTooltip unit={cfg.unit} />} />
                {/* WHO band: stacked transparent p3 + visible (p97 - p3) */}
                <Area type="monotone" dataKey="p3" stackId="who" stroke="none" fill="transparent" connectNulls isAnimationActive={false} legendType="none" />
                <Area type="monotone" dataKey="band" stackId="who" stroke="none" fill={cfg.color} fillOpacity={0.12} connectNulls isAnimationActive={false} name="WHO p3–p97" />
                <Line type="monotone" dataKey="p50" stroke="#9BA3B8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} name="WHO median" />
                <Line
                  type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={3} connectNulls
                  dot={{ fill: cfg.color, r: 4 }} activeDot={{ r: 6 }} name={child?.name ?? "Child"}
                />
                <Legend wrapperStyle={{ fontSize: 10, fontFamily: "'Nunito', sans-serif", fontWeight: 700 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* History list */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>
            🗓️ Measurement History
          </p>
          {history.length === 0 ? (
            <p className="text-center text-xs font-bold text-[#9BA3B8] font-['Nunito'] py-4">No entries yet. Log the first one above!</p>
          ) : (
            <div className="flex flex-col">
              {[...history].reverse().map((m, i, arr) => {
                const tone = statusTone(m.lhfa_zscore);
                return (
                  <div key={m.id} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                    <div className="rounded-xl px-2 py-1.5 text-center" style={{ background: "#F8F9FD", minWidth: 52 }}>
                      <p style={{ fontSize: "11px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
                        {new Date(m.date_logged).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                      <p style={{ fontSize: "9px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                        {(m.age_in_days / DAYS_PER_MONTH).toFixed(1)} mo
                      </p>
                    </div>
                    <div className="flex-1">
                      <p style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
                        ⚖️ {m.weight_kg} kg · 📏 {m.height_cm} cm
                      </p>
                      <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                        WFA z {m.wfa_zscore} · HFA z {m.lhfa_zscore}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full" style={{ background: tone.bg, color: tone.color, fontSize: "9px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", maxWidth: 96, textAlign: "center" }}>
                      {m.stunting_status.split(" (")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
