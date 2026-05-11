import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Save, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";

// Temporary static data for the chart visual
const weightData = [
  { month: "Sep", weight: 10.1, height: 80, p3: 9.0, p97: 12.5 },
  { month: "Oct", weight: 10.4, height: 81, p3: 9.1, p97: 12.7 },
  { month: "Nov", weight: 10.8, height: 82, p3: 9.2, p97: 12.9 },
  { month: "Dec", weight: 11.0, height: 83, p3: 9.3, p97: 13.1 },
  { month: "Jan", weight: 11.2, height: 84, p3: 9.4, p97: 13.3 },
  { month: "Feb", weight: 11.4, height: 85, p3: 9.5, p97: 13.5 },
  { month: "Mar", weight: 11.6, height: 86, p3: 9.6, p97: 13.7 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: "#2D3047", borderRadius: 12, padding: "8px 12px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ fontSize: 12, color: p.color, fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}>
            {p.dataKey === "weight" ? `⚖️ ${p.value}kg` : `📏 ${p.value}cm`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function GrowthScreen() {
  const navigate = useNavigate();
  const [activeChart, setActiveChart] = useState<"weight" | "height">("weight");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  // API States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [latestResult, setLatestResult] = useState<any>(null); // Holds the Z-Score response
  const [childId, setChildId] = useState<string | null>(null);

  useEffect(() => {
    // When screen loads, grab the active child's ID that we saved in HomeScreen
    const id = localStorage.getItem("active_child_id");
    if (!id) {
      setErrorMessage("No child selected. Please add a child on the Home screen first.");
    } else {
      setChildId(id);
    }
  }, []);

  const handleSaveMeasurement = async () => {
    setErrorMessage("");
    
    if (!weight || !height) {
      setErrorMessage("Please enter both weight and height.");
      return;
    }
    if (!childId) {
      setErrorMessage("System error: No active child found.");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("simba_token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Format payload exactly as FastAPI expects
      const payload = {
        date_logged: `${date}T00:00:00`,
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height)
      };

      const response = await fetch(`http://127.0.0.1:8000/api/v1/user/child/${childId}/measurements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save measurement. Check your connection.");
      }

      const resultData = await response.json();
      setLatestResult(resultData); // This contains the wfa_zscore and statuses!
      
      // Clear inputs for the next entry
      setWeight("");
      setHeight("");
      
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

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
            Active Child Profile
          </p>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-6">
        
        {/* Error / Success Display */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600 font-['Nunito']">{errorMessage}</p>
          </div>
        )}
        
        {/* Input card */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 12 }}>
            📝 Log New Entry
          </p>
          <div className="flex gap-3 mb-3">
            {/* Weight input */}
            <div className="flex-1 flex flex-col gap-1.5">
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#717182", fontFamily: "'Nunito', sans-serif" }}>Weight (kg)</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
                <span style={{ fontSize: "16px" }}>⚖️</span>
                <input
                  type="number"
                  placeholder="e.g. 11.6"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="flex-1 bg-transparent outline-none w-full"
                  style={{ fontSize: "14px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}
                />
              </div>
            </div>
            {/* Height input */}
            <div className="flex-1 flex flex-col gap-1.5">
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#717182", fontFamily: "'Nunito', sans-serif" }}>Height (cm)</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
                <span style={{ fontSize: "16px" }}>📏</span>
                <input
                  type="number"
                  placeholder="e.g. 86"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="flex-1 bg-transparent outline-none w-full"
                  style={{ fontSize: "14px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}
                />
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mb-3" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
            <span style={{ fontSize: "16px" }}>📅</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}
            />
          </div>

          <button
            onClick={handleSaveMeasurement}
            disabled={isLoading || !childId}
            className="w-full py-3 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70 disabled:scale-100"
            style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", boxShadow: "0 4px 16px rgba(244,123,32,0.3)" }}
          >
            <Save size={16} color="white" />
            <span style={{ fontSize: "14px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              {isLoading ? "Saving..." : "Save Entry"}
            </span>
          </button>
        </div>

        {/* Dynamic Stats row - Changes based on API response! */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          {[
            { 
              label: "Latest Weight", 
              value: latestResult ? `${latestResult?.measurement?.weight_kg || latestResult?.data?.weight_kg || latestResult?.weight_kg || weight} kg` : "--", 
              icon: "⚖️", color: "#F47B20", bg: "#FFF0E0" 
            },
            { 
              label: "Latest Height", 
              value: latestResult ? `${latestResult?.measurement?.height_cm || latestResult?.data?.height_cm || latestResult?.height_cm || height} cm` : "--", 
              icon: "📏", color: "#5CC8C2", bg: "#E8F9F8" 
            },
            { 
              label: "WHO Status", 
              value: latestResult ? (latestResult?.stunting_status || latestResult?.data?.stunting_status || "Calculated") : "--", 
              icon: "📊", 
              color: (latestResult?.stunting_status === "Normal" || latestResult?.data?.stunting_status === "Normal") ? "#5CC8C2" : "#F47B20", 
              bg: "#F0EDFF" 
            },
          ].map(({ label, value, icon, color, bg }) => (
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
            <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
              Growth Chart Overview
            </p>
            <div className="flex gap-1 rounded-full p-0.5" style={{ background: "#F5F5F5" }}>
              {(["weight", "height"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveChart(type)}
                  className="rounded-full px-3 py-1 transition-all"
                  style={{
                    background: activeChart === type ? (type === "weight" ? "#F47B20" : "#5CC8C2") : "transparent",
                    fontSize: "11px",
                    fontWeight: 800,
                    color: activeChart === type ? "white" : "#9BA3B8",
                    fontFamily: "'Nunito', sans-serif",
                  }}
                >
                  {type === "weight" ? "⚖️ Weight" : "📏 Height"}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10, fill: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceArea y1={0} y2={activeChart === "weight" ? 9.6 : 79} fill="#FFB4B4" fillOpacity={0.2} />
              <ReferenceArea y1={activeChart === "weight" ? 9.6 : 79} y2={activeChart === "weight" ? 13.7 : 90} fill="#C8F0EE" fillOpacity={0.3} />
              <ReferenceArea y1={activeChart === "weight" ? 13.7 : 90} y2={20} fill="#FFE0B4" fillOpacity={0.2} />
              <Line
                type="monotone"
                dataKey={activeChart}
                stroke={activeChart === "weight" ? "#F47B20" : "#5CC8C2"}
                strokeWidth={3}
                dot={{ fill: activeChart === "weight" ? "#F47B20" : "#5CC8C2", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}