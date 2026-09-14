import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, X, Loader2, AlertCircle, Info } from "lucide-react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { api, errorMessage as toMessage, type GrowthStandardPoint } from "../../../../lib/api";

const FONT = "'Nunito', sans-serif";

type Gender = "male" | "female";
type Metric = "wfa" | "lhfa" | "bfa";
const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: "wfa", label: "Weight-for-Age", unit: "kg", color: "#F47B20" },
  { key: "lhfa", label: "Height-for-Age", unit: "cm", color: "#5CC8C2" },
  { key: "bfa", label: "BMI-for-Age", unit: "kg/m²", color: "#9B8BF4" },
];
const STEP_OPTIONS = [1, 3, 6];

export function HMGrowthStandards() {
  const navigate = useNavigate();
  const [gender, setGender] = useState<Gender>("male");
  const [metric, setMetric] = useState<Metric>("wfa");
  const [step, setStep] = useState(3);
  const [rows, setRows] = useState<GrowthStandardPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api.admin
      .growthStandards(metric, gender)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch((err) => { if (!cancelled) setError(toMessage(err, "Failed to load WHO standards.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [metric, gender]);

  const cfg = METRICS.find((m) => m.key === metric)!;
  const tableRows = useMemo(() => rows.filter((r) => r.age_months % step === 0), [rows, step]);
  const chartRows = useMemo(() => rows.map((r) => ({ ...r, band: r.p97 - r.p3 })), [rows]);

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #4F46E5 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={18} color="white" />
          </button>
          <div className="flex-1">
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: FONT }}>📊 WHO Growth Standards</h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: FONT, fontWeight: 600 }}>
              Percentile curves used for every z-score in SIMBA
            </p>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          {(["male", "female"] as Gender[]).map((g) => (
            <button key={g} onClick={() => setGender(g)} className="flex-1 py-2 rounded-xl" style={{ background: gender === g ? "white" : "rgba(255,255,255,0.15)", color: gender === g ? "#1E3A8A" : "rgba(255,255,255,0.85)", fontFamily: FONT, fontWeight: 800, fontSize: "12px" }}>
              {g === "male" ? "👦 Boys" : "👧 Girls"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {METRICS.map((m) => (
            <button key={m.key} onClick={() => setMetric(m.key)} className="flex-shrink-0 px-3 py-1.5 rounded-full" style={{ background: metric === m.key ? "white" : "rgba(255,255,255,0.15)", color: metric === m.key ? "#1E3A8A" : "rgba(255,255,255,0.85)", fontFamily: FONT, fontWeight: 800, fontSize: "11px" }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{error}</p>
          </div>
        )}

        {/* Chart */}
        <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <p style={{ fontSize: "13px", fontWeight: 900, color: "#1E3A8A", fontFamily: FONT }}>{cfg.label} · {gender === "male" ? "boys" : "girls"} · 0–60 months</p>
          <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 700, marginBottom: 6 }}>Shaded band 3rd–97th percentile · dashed line median</p>
          {isLoading ? (
            <div className="h-[180px] flex items-center justify-center"><Loader2 className="animate-spin" size={22} style={{ color: "#4F46E5" }} /></div>
          ) : rows.length === 0 ? (
            <p className="text-center py-8" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>Not seeded yet — run the seeder from System.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={chartRows} margin={{ top: 5, right: 8, left: -18, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                <XAxis dataKey="age_months" type="number" domain={[0, 60]} ticks={[0, 12, 24, 36, 48, 60]} tick={{ fontSize: 10, fill: "#9BA3B8", fontFamily: FONT, fontWeight: 700 }} tickFormatter={(v) => `${v}m`} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#9BA3B8", fontFamily: FONT }} />
                <Tooltip
                  contentStyle={{ background: "#1E3A8A", border: "none", borderRadius: 10, fontSize: 11, color: "white", fontFamily: FONT }}
                  labelFormatter={(v) => `${v} months`}
                  formatter={(v: number, name: string) => (name === "band" ? [null, null] : [`${v} ${cfg.unit}`, name])}
                />
                <Area type="monotone" dataKey="p3" stackId="who" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" name="p3" />
                <Area type="monotone" dataKey="band" stackId="who" stroke="none" fill={cfg.color} fillOpacity={0.15} isAnimationActive={false} name="band" />
                <Line type="monotone" dataKey="p50" stroke={cfg.color} strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} name="Median (p50)" />
                <Line type="monotone" dataKey="p97" stroke={cfg.color} strokeWidth={1} dot={false} isAnimationActive={false} name="p97" strokeOpacity={0.6} />
                <Line type="monotone" dataKey="p3" stroke={cfg.color} strokeWidth={1} dot={false} isAnimationActive={false} name="p3" strokeOpacity={0.6} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #F5F5F5" }}>
            <p style={{ fontSize: "13px", fontWeight: 900, color: "#1E3A8A", fontFamily: FONT }}>Percentile table ({cfg.unit})</p>
            <div className="flex gap-1 rounded-full p-0.5" style={{ background: "#F5F5F5" }}>
              {STEP_OPTIONS.map((s) => (
                <button key={s} onClick={() => setStep(s)} className="px-2 py-0.5 rounded-full" style={{ background: step === s ? "#4F46E5" : "transparent", color: step === s ? "white" : "#9BA3B8", fontSize: "10px", fontWeight: 800, fontFamily: FONT }}>
                  every {s} mo
                </button>
              ))}
            </div>
          </div>
          <div className="grid px-4 py-2" style={{ gridTemplateColumns: "1.1fr repeat(5, 1fr)", background: "#F8F9FD" }}>
            {["Age", "P3", "P15", "P50", "P85", "P97"].map((h) => (
              <span key={h} style={{ fontSize: "10px", fontWeight: 900, color: "#9BA3B8", fontFamily: FONT, textAlign: h === "Age" ? "left" : "right" }}>{h}</span>
            ))}
          </div>
          {tableRows.map((r) => (
            <div key={r.age_months} className="grid px-4 py-2" style={{ gridTemplateColumns: "1.1fr repeat(5, 1fr)", borderBottom: "1px solid #F5F5F5" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#2D3047", fontFamily: FONT }}>{r.age_months} mo</span>
              {[r.p3, r.p15, r.p50, r.p85, r.p97].map((v, i) => (
                <span key={i} style={{ fontSize: "11px", fontWeight: i === 2 ? 900 : 600, color: i === 2 ? cfg.color : "#2D3047", fontFamily: FONT, textAlign: "right" }}>{v.toFixed(metric === "bfa" ? 1 : 1)}</span>
              ))}
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: "#FFF7ED" }}>
          <Info size={15} style={{ color: "#F47B20", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: "10px", color: "#9A5B1F", fontFamily: FONT, fontWeight: 600, lineHeight: 1.5 }}>
            These values are derived from the official WHO LMS tables shipped with SIMBA (<code>backend/data/who_lms_tables</code>) and are read-only. To update them, replace the CSVs and run <code>python seed_db.py --reset</code>.
          </p>
        </div>

        <button onClick={() => navigate("/hm/akg-targets")} className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-transform active:scale-95" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <span style={{ fontSize: 18 }}>🥗</span>
          <span style={{ flex: 1, textAlign: "left", fontSize: "13px", fontWeight: 800, color: "#1E3A8A", fontFamily: FONT }}>AKG nutrition targets (editable)</span>
          <ChevronRight size={16} style={{ color: "#C0C4D0" }} />
        </button>
      </div>
    </div>
  );
}
