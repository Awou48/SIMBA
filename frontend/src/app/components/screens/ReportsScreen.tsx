import { useNavigate } from "react-router";
import { ChevronLeft, Download, FileText, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";

// We keep this as static demo data for the presentation, 
// since a new account won't have 6 months of history yet!
const chartData = [
  { month: "Nov", weight: 10.8, height: 82, bmi: 16.0, p3w: 9.2, p97w: 12.9 },
  { month: "Dec", weight: 11.0, height: 83, bmi: 16.0, p3w: 9.3, p97w: 13.1 },
  { month: "Jan", weight: 11.2, height: 84, bmi: 15.9, p3w: 9.4, p97w: 13.3 },
  { month: "Feb", weight: 11.4, height: 85, bmi: 15.8, p3w: 9.5, p97w: 13.5 },
  { month: "Mar", weight: 11.6, height: 86, bmi: 15.7, p3w: 9.6, p97w: 13.7 },
  { month: "Apr", weight: 11.8, height: 87, bmi: 15.6, p3w: 9.7, p97w: 13.9 },
  { month: "May", weight: 12.0, height: 88, bmi: 15.5, p3w: 9.8, p97w: 14.1 },
];

const metricConfig = {
  weight: { key: "weight", color: "#F47B20", label: "Weight (kg)", unit: "kg", min: 8, max: 16 },
  height: { key: "height", color: "#5CC8C2", label: "Height (cm)", unit: "cm", min: 75, max: 95 },
  bmi: { key: "bmi", color: "#9B8BF4", label: "BMI", unit: "", min: 13, max: 19 },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#2D3047", borderRadius: 12, padding: "8px 12px" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ fontSize: 12, color: p.color, fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>
            {p.value.toFixed(1)} {p.name === "bmi" ? "" : p.name === "weight" ? "kg" : "cm"}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ReportsScreen() {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState<"weight" | "height" | "bmi">("weight");
  const config = metricConfig[activeMetric];

  // Dynamic States
  const [childName, setChildName] = useState("Loading...");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  // Fetch the active child's name so the report feels personalized
  useEffect(() => {
    const fetchChild = async () => {
      try {
        const token = localStorage.getItem("simba_token");
        if (!token) return;

        const response = await fetch("http://127.0.0.1:8000/api/v1/user/children/", {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setChildName(data[0].name);
          } else {
            setChildName("Your Child");
          }
        }
      } catch (error) {
        setChildName("Your Child");
      }
    };

    fetchChild();
  }, []);

  // Simulate a PDF generation delay for presentation polish
  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      setDownloadComplete(true);
      
      // Reset the button after 3 seconds
      setTimeout(() => setDownloadComplete(false), 3000);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
            📊 Growth Report
          </h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
            {childName} · Last 6 months
          </p>
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl transition-transform active:scale-95"
          style={{ background: "#FFF0E0", boxShadow: "0 2px 8px rgba(244,123,32,0.15)" }}
        >
          <FileText size={14} style={{ color: "#F47B20" }} />
          <span style={{ fontSize: "11px", fontWeight: 800, color: "#F47B20", fontFamily: "'Nunito', sans-serif" }}>PDF</span>
        </button>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-6">
        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Weight", value: "12.0 kg", icon: "⚖️", color: "#F47B20", bg: "#FFF0E0" },
            { label: "Height", value: "88 cm", icon: "📏", color: "#5CC8C2", bg: "#E8F9F8" },
            { label: "BMI", value: "15.5", icon: "📊", color: "#9B8BF4", bg: "#F0EDFF" },
            { label: "Percentile", value: "50th", icon: "🏆", color: "#FFC72C", bg: "#FFF8E0" },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} className="rounded-2xl p-2.5 text-center" style={{ background: bg }}>
              <span style={{ fontSize: "16px" }}>{icon}</span>
              <p style={{ fontSize: "11px", fontWeight: 900, color, fontFamily: "'Nunito', sans-serif", lineHeight: 1.2, marginTop: 2 }}>{value}</p>
              <p style={{ fontSize: "8px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Chart toggle */}
        <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          {(["weight", "height", "bmi"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setActiveMetric(m)}
              className="flex-1 py-2.5 rounded-xl transition-all"
              style={{
                background: activeMetric === m ? metricConfig[m].color : "transparent",
                fontSize: "12px",
                fontWeight: 800,
                color: activeMetric === m ? "white" : "#9BA3B8",
                fontFamily: "'Nunito', sans-serif",
                textTransform: "capitalize",
              }}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Main chart */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: "13px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>
            {config.label} Chart
          </p>
          {/* WHO zones legend */}
          <div className="flex gap-3 mb-3">
            {[
              { label: "Underweight", color: "#FFB4B4" },
              { label: "Normal", color: "#C8F0EE" },
              { label: "Overweight", color: "#FFE0B4" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="rounded-sm" style={{ width: 10, height: 10, background: color }} />
                <span style={{ fontSize: "9px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{label}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }} />
              <YAxis domain={[config.min, config.max]} tick={{ fontSize: 10, fill: "#9BA3B8" }} />
              <Tooltip content={<CustomTooltip />} />
              {activeMetric === "weight" && (
                <>
                  <ReferenceArea y1={8} y2={9.6} fill="#FFB4B4" fillOpacity={0.2} />
                  <ReferenceArea y1={9.6} y2={13.9} fill="#C8F0EE" fillOpacity={0.25} />
                  <ReferenceArea y1={13.9} y2={16} fill="#FFE0B4" fillOpacity={0.2} />
                </>
              )}
              {activeMetric === "height" && (
                <>
                  <ReferenceArea y1={75} y2={78} fill="#FFB4B4" fillOpacity={0.2} />
                  <ReferenceArea y1={78} y2={91} fill="#C8F0EE" fillOpacity={0.25} />
                  <ReferenceArea y1={91} y2={95} fill="#FFE0B4" fillOpacity={0.2} />
                </>
              )}
              {activeMetric === "bmi" && (
                <>
                  <ReferenceArea y1={13} y2={14.5} fill="#FFB4B4" fillOpacity={0.2} />
                  <ReferenceArea y1={14.5} y2={17.5} fill="#C8F0EE" fillOpacity={0.25} />
                  <ReferenceArea y1={17.5} y2={19} fill="#FFE0B4" fillOpacity={0.2} />
                </>
              )}
              <Line
                type="monotone"
                dataKey={config.key}
                stroke={config.color}
                strokeWidth={3}
                dot={{ fill: config.color, r: 4, strokeWidth: 2, stroke: "white" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Progress summary */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>
            📈 6-Month Progress
          </p>
          {[
            { label: "Weight gained", from: "10.8 kg", to: "12.0 kg", change: "+1.2 kg", color: "#F47B20", good: true },
            { label: "Height gained", from: "82 cm", to: "88 cm", change: "+6 cm", color: "#5CC8C2", good: true },
            { label: "BMI change", from: "16.0", to: "15.5", change: "-0.5", color: "#9B8BF4", good: true },
          ].map(({ label, from, to, change, color, good }) => (
            <div key={label} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #F5F5F5" }}>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 700, color: "#717182", fontFamily: "'Nunito', sans-serif" }}>{label}</p>
                <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{from} → {to}</p>
              </div>
              <span className="px-3 py-1 rounded-full" style={{ background: good ? "#E8F9F8" : "#FFE0E0", fontSize: "12px", fontWeight: 800, color: good ? "#5CC8C2" : "#F04444", fontFamily: "'Nunito', sans-serif" }}>
                {change} ✓
              </span>
            </div>
          ))}
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading || downloadComplete}
          className="w-full py-4 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-90 disabled:scale-100"
          style={{ 
            background: downloadComplete ? "#5CC8C2" : "linear-gradient(90deg, #F47B20, #FFC72C)", 
            boxShadow: downloadComplete ? "0 4px 16px rgba(92,200,194,0.35)" : "0 4px 16px rgba(244,123,32,0.35)" 
          }}
        >
          {isDownloading ? (
            <span style={{ fontSize: "15px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }} className="animate-pulse">
              Generating PDF...
            </span>
          ) : downloadComplete ? (
            <>
              <CheckCircle2 size={18} color="white" />
              <span style={{ fontSize: "15px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>Report Downloaded!</span>
            </>
          ) : (
            <>
              <Download size={18} color="white" />
              <span style={{ fontSize: "15px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>Download PDF Report</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}