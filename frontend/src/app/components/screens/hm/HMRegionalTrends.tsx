import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { X, AlertCircle, Loader2, MapPin } from "lucide-react";
import { api, errorMessage as toMessage, type StuntingStats } from "../../../../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const FONT = "'Nunito', sans-serif";
const ALL = "All regions";

function rateColor(rate: number) {
  if (rate > 0.3) return "#E53535";
  if (rate > 0.2) return "#F47B20";
  return "#4F46E5";
}

export function HMRegionalTrends() {
  const navigate = useNavigate();
  const [region, setRegion] = useState(ALL);
  const [regions, setRegions] = useState<StuntingStats[]>([]);
  const [overall, setOverall] = useState<StuntingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.admin.stats(), api.admin.regionStats()])
      .then(([o, r]) => { setOverall(o); setRegions(r); })
      .catch((err) => setError(toMessage(err, "Failed to load live regional data.")))
      .finally(() => setIsLoading(false));
  }, []);

  const selected: StuntingStats | null = region === ALL ? overall : regions.find((r) => r.region_name === region) ?? null;
  const tabs = [ALL, ...regions.map((r) => r.region_name)];

  const chartData = useMemo(
    () => regions.filter((r) => r.children_measured > 0).map((r) => ({ region: r.region_name, rate: +(r.stunting_rate * 100).toFixed(1), n: r.children_measured })),
    [regions],
  );

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EEF2FF" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #FFC72C 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={18} color="white" />
          </button>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: FONT }}>📈 Regional Trends</h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontFamily: FONT, fontWeight: 600 }}>
              Stunting prevalence by region · latest measurement per child
            </p>
          </div>
        </div>

        {/* Region tabs (from data) */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {tabs.map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full"
              style={{ background: region === r ? "white" : "rgba(255,255,255,0.18)", color: region === r ? "#1E3A8A" : "rgba(255,255,255,0.85)", fontFamily: FONT, fontWeight: 800, fontSize: "11px" }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-5 pb-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{error}</p>
          </div>
        )}

        {/* Summary cards for the selected scope */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Stunting rate", value: selected ? pct(selected.stunting_rate) : "…", sub: selected?.warning ?? "", color: selected ? rateColor(selected.stunting_rate) : "#4F46E5", bg: "#EEF2FF" },
            { label: "Children measured", value: selected ? `${selected.children_measured}/${selected.total_children}` : "…", sub: `${selected?.total_measurements ?? 0} logs`, color: "#1E3A8A", bg: "#FFF7ED" },
            { label: "Severely stunted", value: selected ? String(selected.severely_stunted_cases) : "…", sub: `${selected?.stunted_cases ?? 0} stunted total`, color: "#E53535", bg: "#FFF0F0" },
          ].map(({ label, value, sub, color, bg }) => (
            <div key={label} className="rounded-2xl p-3" style={{ background: bg, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "18px", fontWeight: 900, color, fontFamily: FONT }}>{isLoading ? "…" : value}</p>
              <p style={{ fontSize: "9px", fontWeight: 800, color: "#717182", fontFamily: FONT }}>{label}</p>
              <p style={{ fontSize: "9px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT, marginTop: 2 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div>
          <p style={{ fontSize: "14px", fontWeight: 900, color: "#1E3A8A", fontFamily: FONT, marginBottom: 8 }}>🗺️ Stunting rate by region</p>
          <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            {isLoading ? (
              <div className="h-[150px] flex items-center justify-center"><Loader2 className="animate-spin" size={22} style={{ color: "#4F46E5" }} /></div>
            ) : chartData.length === 0 ? (
              <p className="text-center py-8" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>
                No measured children yet. Parents can set a region on each child profile.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 34)}>
                <BarChart data={chartData} layout="vertical" barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9, fontFamily: FONT, fontWeight: 700, fill: "#9BA3B8" }} axisLine={false} tickLine={false} unit="%" />
                  <YAxis dataKey="region" type="category" tick={{ fontSize: 9, fontFamily: FONT, fontWeight: 700, fill: "#9BA3B8" }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ background: "#1E3A8A", border: "none", borderRadius: 10, fontSize: 11, color: "white", fontFamily: FONT }}
                    formatter={(v: number, _n: string, p: any) => [`${v}% of ${p.payload.n} measured`, "Stunting"]}
                  />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} name="Stunting">
                    {chartData.map((d) => <Cell key={d.region} fill={rateColor(d.rate / 100)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p style={{ fontSize: "9px", color: "#C0C4D0", fontFamily: FONT, fontWeight: 600, marginTop: 6 }}>
              WHO public-health thresholds: &gt;20% high (orange), &gt;30% very high (red).
            </p>
          </div>
        </div>

        {/* Region cards */}
        <div>
          <p style={{ fontSize: "14px", fontWeight: 900, color: "#1E3A8A", fontFamily: FONT, marginBottom: 8 }}>🏝️ Region detail</p>
          <div className="flex flex-col gap-2.5">
            {regions.length === 0 && !isLoading && (
              <p className="text-center py-4" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>No children registered yet.</p>
            )}
            {regions.map((r) => {
              const measured = r.children_measured || 1;
              const severe = r.severely_stunted_cases / measured;
              const moderate = (r.stunted_cases - r.severely_stunted_cases) / measured;
              const normal = r.children_measured ? 1 - severe - moderate : 0;
              return (
                <button key={r.region_name} onClick={() => setRegion(r.region_name)} className="rounded-2xl p-4 text-left transition-transform active:scale-[0.99]" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: region === r.region_name ? "1.5px solid #4F46E5" : "1.5px solid transparent" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} style={{ color: "#4F46E5" }} />
                      <p style={{ fontSize: "13px", fontWeight: 900, color: "#1E3A8A", fontFamily: FONT }}>{r.region_name}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full" style={{ background: `${rateColor(r.stunting_rate)}1A`, color: rateColor(r.stunting_rate), fontSize: "10px", fontWeight: 800, fontFamily: FONT }}>
                      {r.children_measured ? pct(r.stunting_rate) : "no data"}
                    </span>
                  </div>
                  <div className="flex gap-1 rounded-full overflow-hidden" style={{ height: 10, background: "#F5F5F5" }}>
                    <div style={{ width: `${normal * 100}%`, background: "#5CC8C2" }} />
                    <div style={{ width: `${moderate * 100}%`, background: "#F47B20" }} />
                    <div style={{ width: `${severe * 100}%`, background: "#E53535" }} />
                  </div>
                  <div className="flex gap-3 mt-1.5 flex-wrap">
                    {[
                      { label: "Normal", value: r.children_measured - r.stunted_cases, color: "#5CC8C2" },
                      { label: "Stunted", value: r.stunted_cases - r.severely_stunted_cases, color: "#F47B20" },
                      { label: "Severe", value: r.severely_stunted_cases, color: "#E53535" },
                      { label: "Unmeasured", value: r.total_children - r.children_measured, color: "#C0C4D0" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className="rounded-full" style={{ width: 7, height: 7, background: color }} />
                        <span style={{ fontSize: "9px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>{label}: </span>
                        <span style={{ fontSize: "9px", fontWeight: 900, color, fontFamily: FONT }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
