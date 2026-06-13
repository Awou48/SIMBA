import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { X, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

const regions = ["All Regions", "Tangerang Raya", "Jawa", "Sumatera", "Kalimantan", "Sulawesi", "Papua", "Bali & NTT"];

const trendData = [
  { month: "Jan", stunting: 24.1, wasting: 8.2, overweight: 4.1 },
  { month: "Feb", stunting: 23.5, wasting: 8.0, overweight: 4.3 },
  { month: "Mar", stunting: 23.0, wasting: 7.8, overweight: 4.2 },
  { month: "Apr", stunting: 22.6, wasting: 7.5, overweight: 4.5 },
  { month: "May", stunting: 22.1, wasting: 7.3, overweight: 4.4 },
];

const indicators = [
  { key: "stunting",   label: "Stunting",    color: "#4F46E5", unit: "%" },
  { key: "wasting",    label: "Wasting",     color: "#E53535", unit: "%" },
  { key: "overweight", label: "Overweight",  color: "#F47B20", unit: "%" },
];

export function HMRegionalTrends() {
  const navigate = useNavigate();
  const [region, setRegion] = useState("All Regions");
  const [activeIndicator, setActiveIndicator] = useState("stunting");
  
  const [apiData, setApiData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRegionalStats = async () => {
      try {
        const token = localStorage.getItem("simba_token");
        if (!token) return navigate("/login");

        const response = await fetch("http://127.0.0.1:8000/api/v1/admin/dashboard/stunting-stats", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error("Failed to load live regional data.");

        const data = await response.json();
        setApiData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRegionalStats();
  }, [navigate]);

  const liveStuntingRate = apiData && apiData.total_measurements > 0 
    ? ((apiData.stunted_cases / apiData.total_measurements) * 100).toFixed(1) 
    : "0.0";

  const dynamicStunting = [
    { region: apiData?.region_name || "Tangerang Raya", rate: parseFloat(liveStuntingRate), prev: 21.2 },
    { region: "Jawa",       rate: 18.4, prev: 21.2 },
    { region: "Sumatera",   rate: 24.1, prev: 26.8 },
    { region: "Kalimantan", rate: 22.6, prev: 25.0 },
    { region: "Sulawesi",   rate: 27.3, prev: 29.1 },
    { region: "Papua",      rate: 34.2, prev: 36.5 },
  ];

  const dynamicNutritionMetrics = [
    { region: apiData?.region_name || "Tangerang Raya", underweight: parseFloat(liveStuntingRate), overweight: 4.1, normal: 100 - parseFloat(liveStuntingRate) - 4.1 },
    { region: "Jawa",       underweight: 12.1, overweight: 5.2, normal: 82.7 },
    { region: "Sumatera",   underweight: 17.3, overweight: 4.1, normal: 78.6 },
    { region: "Kalimantan", underweight: 14.8, overweight: 3.9, normal: 81.3 },
    { region: "Sulawesi",   underweight: 19.2, overweight: 3.5, normal: 77.3 },
  ];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#EEF2FF" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #FFC72C 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={18} color="white" />
          </button>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              📈 Regional Trends
            </h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              Child nutrition & growth by region
            </p>
          </div>
        </div>

        {/* Region tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {regions.map(r => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full"
              style={{
                background: region === r ? "white" : "rgba(255,255,255,0.18)",
                color: region === r ? "#1E3A8A" : "rgba(255,255,255,0.85)",
                fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px",
              }}
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
            <p className="text-xs font-semibold text-red-600 font-['Nunito']">{error}</p>
          </div>
        )}

        {/* Live National summary cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Live Stunting", value: isLoading ? "..." : `${liveStuntingRate}%`, delta: apiData?.warning || "Tracking", up: parseFloat(liveStuntingRate) > 20, color: "#4F46E5", bg: "#EEF2FF" },
            { label: "Total Monitored",  value: isLoading ? "..." : apiData?.total_measurements,  delta: "Live Database", up: true, color: "#E53535", bg: "#FFF0F0" },
            { label: "Avg Overweight", value: "4.3%", delta: "Static Estimate", up: true, color: "#F47B20", bg: "#FFF7ED" },
          ].map(({ label, value, delta, up, color, bg }) => (
            <div key={label} className="rounded-2xl p-3" style={{ background: bg, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "18px", fontWeight: 900, color, fontFamily: "'Nunito', sans-serif" }}>{value}</p>
              <p style={{ fontSize: "9px", fontWeight: 800, color: "#717182", fontFamily: "'Nunito', sans-serif" }}>{label}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                {up ? <TrendingUp size={10} style={{ color: "#E53535" }} /> : <TrendingDown size={10} style={{ color: "#5CC8C2" }} />}
                <span style={{ fontSize: "9px", fontWeight: 800, color: up ? "#E53535" : "#5CC8C2", fontFamily: "'Nunito', sans-serif" }}>{delta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Regional stunting bar chart */}
        <div>
          <p style={{ fontSize: "14px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif", marginBottom: 8 }}>🗺️ Stunting Rate by Region</p>
          <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={dynamicStunting} layout="vertical" barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 9, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fill: "#9BA3B8" }} axisLine={false} tickLine={false} unit="%" />
                <YAxis dataKey="region" type="category" tick={{ fontSize: 9, fontFamily: "'Nunito', sans-serif", fontWeight: 700, fill: "#9BA3B8" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: "#1E3A8A", border: "none", borderRadius: 10, fontSize: 11, color: "white", fontFamily: "'Nunito', sans-serif" }}
                  formatter={(v: number) => [`${v}%`, "Stunting"]}
                />
                <Bar dataKey="prev" fill="#C7D2FE" radius={[0, 4, 4, 0]} name="2025" />
                <Bar dataKey="rate" fill="#4F46E5" radius={[0, 4, 4, 0]} name="2026 (Live)" />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Region cards */}
        <div>
          <p style={{ fontSize: "14px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif", marginBottom: 8 }}>🏝️ Nutritional Status Detail</p>
          <div className="flex flex-col gap-2.5">
            {dynamicNutritionMetrics.map(({ region: r, underweight, overweight, normal }) => {
              const stunt = dynamicStunting.find(s => s.region === r);
              const delta = stunt ? stunt.prev - stunt.rate : 0;
              return (
                <div key={r} className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ fontSize: "13px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>{r}</p>
                    <div className="flex items-center gap-1">
                      {delta >= 0 ? <TrendingDown size={12} style={{ color: "#5CC8C2" }} /> : <TrendingUp size={12} style={{ color: "#E53535" }} />}
                      <span style={{ fontSize: "11px", fontWeight: 800, color: delta >= 0 ? "#5CC8C2" : "#E53535", fontFamily: "'Nunito', sans-serif" }}>
                        {delta >= 0 ? "-" : "+"}{Math.abs(delta).toFixed(1)}% stunting
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 rounded-full overflow-hidden" style={{ height: 10 }}>
                    <div style={{ width: `${Math.max(normal, 0)}%`, background: "#5CC8C2" }} />
                    <div style={{ width: `${underweight}%`, background: "#4F46E5" }} />
                    <div style={{ width: `${overweight}%`, background: "#F47B20" }} />
                  </div>
                  <div className="flex gap-4 mt-1.5">
                    {[
                      { label: "Normal", value: `${Math.max(normal, 0).toFixed(1)}%`, color: "#5CC8C2" },
                      { label: "Underweight", value: `${underweight.toFixed(1)}%`, color: "#4F46E5" },
                      { label: "Overweight", value: `${overweight.toFixed(1)}%`, color: "#F47B20" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex items-center gap-1">
                        <div className="rounded-full" style={{ width: 7, height: 7, background: color }} />
                        <span style={{ fontSize: "9px", fontWeight: 700, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>{label}: </span>
                        <span style={{ fontSize: "9px", fontWeight: 900, color, fontFamily: "'Nunito', sans-serif" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}