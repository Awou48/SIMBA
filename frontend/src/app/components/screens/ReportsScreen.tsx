import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Download, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api, errorMessage as toMessage, type GrowthReport } from "../../../lib/api";
import { useChildren } from "../../ChildContext";

const FONT = "'Nunito', sans-serif";

type Metric = "weight" | "height" | "bmi";
const metricConfig: Record<Metric, { key: "weight_kg" | "height_cm" | "bmi"; color: string; label: string; unit: string }> = {
  weight: { key: "weight_kg", color: "#F47B20", label: "Weight", unit: "kg" },
  height: { key: "height_cm", color: "#5CC8C2", label: "Height", unit: "cm" },
  bmi: { key: "bmi", color: "#9B8BF4", label: "BMI", unit: "" },
};

function zTone(z: number | null | undefined) {
  if (z == null) return "#9BA3B8";
  if (z < -2 || z > 2) return "#E53535";
  if (z < -1 || z > 1) return "#F47B20";
  return "#2BA89F";
}

const CustomTooltip = ({ active, payload, unit }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={{ background: "#2D3047", borderRadius: 12, padding: "8px 12px", fontFamily: FONT }}>
      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>{row.label}</p>
      <p style={{ fontSize: 12, color: payload[0].color, fontWeight: 800 }}>{payload[0].value} {unit}</p>
    </div>
  );
};

export function ReportsScreen() {
  const navigate = useNavigate();
  const { activeChild, isLoading: childLoading } = useChildren();
  const childName = childLoading ? "Loading..." : activeChild?.name ?? "Your Child";

  const [activeMetric, setActiveMetric] = useState<Metric>("weight");
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  useEffect(() => {
    if (childLoading) return;
    if (!activeChild) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api.parent
      .report(activeChild.id)
      .then((r) => { if (!cancelled) setReport(r); })
      .catch((err) => { if (!cancelled) setError(toMessage(err, "Failed to build the report.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [activeChild?.id, childLoading]);

  const config = metricConfig[activeMetric];
  const chartData = useMemo(
    () =>
      (report?.measurements ?? []).map((m) => ({
        label: new Date(m.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        value: m[config.key],
      })),
    [report, config.key],
  );

  const handleDownload = async () => {
    if (!activeChild) return;
    setIsDownloading(true);
    setError("");
    try {
      const blob = await api.parent.reportPdf(activeChild.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simba-report-${activeChild.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 3000);
    } catch (err) {
      setError(toMessage(err, "Could not generate the PDF."));
    } finally {
      setIsDownloading(false);
    }
  };

  const latest = report?.latest ?? null;
  const change = report?.change_since_first ?? null;
  const periodLabel = change ? (change.days >= 60 ? `${Math.round(change.days / 30.4375)} months` : `${change.days} days`) : null;

  const stats = [
    { label: "Weight", value: latest ? `${latest.weight_kg} kg` : "--", icon: "⚖️", color: zTone(latest?.wfa_zscore), bg: "#FFF0E0" },
    { label: "Height", value: latest ? `${latest.height_cm} cm` : "--", icon: "📏", color: zTone(latest?.lhfa_zscore), bg: "#E8F9F8" },
    { label: "BMI", value: latest ? latest.bmi.toFixed(1) : "--", icon: "📊", color: zTone(latest?.bfa_zscore), bg: "#F0EDFF" },
    { label: "HFA z", value: latest ? `${latest.lhfa_zscore > 0 ? "+" : ""}${latest.lhfa_zscore}` : "--", icon: "🏆", color: zTone(latest?.lhfa_zscore), bg: "#FFF8E0" },
  ];

  const progressRows = change && latest && report
    ? [
        { label: "Weight change", from: `${report.measurements[0].weight_kg} kg`, to: `${latest.weight_kg} kg`, change: `${change.weight_kg >= 0 ? "+" : ""}${change.weight_kg} kg`, good: change.weight_kg >= 0, color: "#F47B20" },
        { label: "Height change", from: `${report.measurements[0].height_cm} cm`, to: `${latest.height_cm} cm`, change: `${change.height_cm >= 0 ? "+" : ""}${change.height_cm} cm`, good: change.height_cm >= 0, color: "#5CC8C2" },
        { label: "BMI change", from: report.measurements[0].bmi.toFixed(1), to: latest.bmi.toFixed(1), change: `${change.bmi >= 0 ? "+" : ""}${change.bmi.toFixed(1)}`, good: latest.bfa_zscore == null || Math.abs(latest.bfa_zscore) <= 2, color: "#9B8BF4" },
      ]
    : [];

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>📊 Growth Report</h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>
            {childName}{report ? ` · ${report.measurements.length} measurement${report.measurements.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <button
          onClick={handleDownload}
          disabled={!activeChild || isDownloading}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl transition-transform active:scale-95 disabled:opacity-50"
          style={{ background: "#FFF0E0", boxShadow: "0 2px 8px rgba(244,123,32,0.15)" }}
        >
          <FileText size={14} style={{ color: "#F47B20" }} />
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#F47B20", fontFamily: FONT }}>PDF</span>
        </button>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{error}</p>
          </div>
        )}
        {!childLoading && !activeChild && (
          <button onClick={() => navigate("/add-child")} className="w-full py-3 rounded-2xl font-bold text-white" style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", fontFamily: FONT }}>
            ➕ Add a child profile to generate a report
          </button>
        )}

        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map(({ label, value, icon, color, bg }) => (
            <div key={label} className="rounded-2xl p-2.5 text-center" style={{ background: bg }}>
              <span style={{ fontSize: "16px" }}>{icon}</span>
              <p style={{ fontSize: "12px", fontWeight: 900, color, fontFamily: FONT, marginTop: 2 }}>{value}</p>
              <p style={{ fontSize: "8px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 700 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* WHO status */}
        {report?.status && (
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Height-for-age", value: report.status.stunting, z: latest?.lhfa_zscore },
              { label: "Weight-for-age", value: report.status.weight, z: latest?.wfa_zscore },
              report.status.wasting ? { label: "Weight-for-height", value: report.status.wasting, z: latest?.wfh_zscore } : null,
            ]
              .filter((x): x is { label: string; value: string; z: number | null | undefined } => x !== null)
              .map(({ label, value, z }) => (
                <span key={label} className="px-2.5 py-1 rounded-full" style={{ background: `${zTone(z)}1A`, color: zTone(z), fontSize: "10px", fontWeight: 800, fontFamily: FONT }}>
                  {label}: {value.split(" (")[0]}
                </span>
              ))}
          </div>
        )}

        {/* Metric selector */}
        <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          {(Object.keys(metricConfig) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className="flex-1 py-2.5 rounded-xl transition-all"
              style={{ background: activeMetric === m ? metricConfig[m].color : "transparent", fontSize: "12px", fontWeight: 800, color: activeMetric === m ? "white" : "#9BA3B8", fontFamily: FONT }}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: "13px", fontWeight: 900, color: "#2D3047", fontFamily: FONT, marginBottom: 4 }}>{config.label} over time</p>
          <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 700, marginBottom: 8 }}>
            For WHO percentile bands, open the Growth Tracker.
          </p>
          {isLoading ? (
            <div className="h-[200px] flex items-center justify-center"><Loader2 className="animate-spin" size={22} style={{ color: config.color }} /></div>
          ) : chartData.length < 2 ? (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-center px-4">
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>
                {chartData.length === 0 ? "No measurements yet." : "Log one more measurement to see a trend line."}
              </p>
              <button onClick={() => navigate("/growth")} style={{ fontSize: "12px", fontWeight: 800, color: "#F47B20", fontFamily: FONT }}>Go to Growth Tracker →</button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9BA3B8", fontFamily: FONT, fontWeight: 700 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#9BA3B8" }} />
                <Tooltip content={<CustomTooltip unit={config.unit} />} />
                <Line type="monotone" dataKey="value" stroke={config.color} strokeWidth={3} dot={{ fill: config.color, r: 4, strokeWidth: 2, stroke: "white" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Progress summary */}
        {progressRows.length > 0 && (
          <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: FONT, marginBottom: 10 }}>📈 Progress over {periodLabel}</p>
            {progressRows.map(({ label, from, to, change: ch, good }) => (
              <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #F5F5F5" }}>
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#717182", fontFamily: FONT }}>{label}</p>
                  <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>{from} → {to}</p>
                </div>
                <span className="px-3 py-1 rounded-full" style={{ background: good ? "#E8F9F8" : "#FFE0E0", fontSize: "12px", fontWeight: 800, color: good ? "#2BA89F" : "#E53535", fontFamily: FONT }}>
                  {ch} {good ? "✓" : "!"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Other sections */}
        {report && (
          <div className="rounded-3xl p-4 flex flex-col gap-3" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
            <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>🧾 Summary</p>
            {[
              {
                icon: "🥗", label: "Nutrition (7 days)",
                value: report.nutrition_7d.days_logged === 0
                  ? "No meals logged"
                  : `${Math.round(report.nutrition_7d.average.energy)} kcal/day avg${report.nutrition_7d.fulfillment_percent ? ` · ${Math.round(report.nutrition_7d.fulfillment_percent.energy)}% of AKG` : ""} · ${report.nutrition_7d.days_logged} day${report.nutrition_7d.days_logged === 1 ? "" : "s"} logged`,
                path: "/food-diary",
              },
              {
                icon: "🏁", label: "Milestones (KPSP)",
                value: report.milestones.total
                  ? `${report.milestones.achieved}/${report.milestones.total} achieved${report.milestones.interpretation ? ` · ${report.milestones.interpretation}` : ` · ${report.milestones.total - report.milestones.answered} unanswered`}`
                  : "No questions for this age",
                path: "/milestones",
              },
              {
                icon: "💉", label: "Immunization",
                value: `${report.immunization.given}/${report.immunization.total} doses · ${report.immunization.overdue} overdue${report.immunization.next_dose ? ` · next: ${report.immunization.next_dose.name}` : ""}`,
                path: "/immunization",
              },
              {
                icon: "🔔", label: "Alerts",
                value: `${report.alerts.filter((a) => a.severity === "high").length} high · ${report.alerts.filter((a) => a.severity === "medium").length} medium`,
                path: "/alerts",
              },
            ].map(({ icon, label, value, path }) => (
              <button key={label} onClick={() => navigate(path)} className="flex items-center gap-3 text-left">
                <span style={{ fontSize: 20 }}>{icon}</span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: "12px", fontWeight: 800, color: "#2D3047", fontFamily: FONT }}>{label}</p>
                  <p style={{ fontSize: "11px", color: "#717182", fontFamily: FONT, fontWeight: 600 }}>{value}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={!activeChild || isDownloading || downloadComplete}
          className="w-full py-4 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-90 disabled:scale-100"
          style={{
            background: downloadComplete ? "#5CC8C2" : "linear-gradient(90deg, #F47B20, #FFC72C)",
            boxShadow: downloadComplete ? "0 4px 16px rgba(92,200,194,0.35)" : "0 4px 16px rgba(244,123,32,0.35)",
          }}
        >
          {isDownloading ? (
            <><Loader2 size={18} color="white" className="animate-spin" /><span style={{ fontSize: "15px", fontWeight: 800, color: "white", fontFamily: FONT }}>Generating PDF...</span></>
          ) : downloadComplete ? (
            <><CheckCircle2 size={18} color="white" /><span style={{ fontSize: "15px", fontWeight: 800, color: "white", fontFamily: FONT }}>Report Downloaded!</span></>
          ) : (
            <><Download size={18} color="white" /><span style={{ fontSize: "15px", fontWeight: 800, color: "white", fontFamily: FONT }}>Download PDF Report</span></>
          )}
        </button>
      </div>
    </div>
  );
}
