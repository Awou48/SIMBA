import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell, ChevronRight, TrendingUp, Utensils, Syringe, Download, Scale } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import logo1 from "../../../imports/logo_1.png"; // Note the lowercase 'l' for safety!

const sparklineData = [
  { w: 10.2 }, { w: 10.5 }, { w: 10.8 }, { w: 11.1 }, { w: 11.0 }, { w: 11.3 }, { w: 11.6 },
];

const nutritionData = [
  { label: "Calories", value: 72, color: "#F47B20", unit: "864/1200 kcal" },
  { label: "Protein", value: 55, color: "#5CC8C2", unit: "11/20g" },
  { label: "Carbs", value: 80, color: "#FFC72C", unit: "96/120g" },
  { label: "Fat", value: 40, color: "#FF7BAC", unit: "12/30g" },
];

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
  const [child, setChild] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to dynamically calculate exact age from the database birth_date
  const calculateAge = (dobString: string) => {
    const dob = new Date(dobString);
    const today = new Date();
    let months = (today.getFullYear() - dob.getFullYear()) * 12 + today.getMonth() - dob.getMonth();
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${remainingMonths} months old`;
    return `${years} years, ${remainingMonths} months old`;
  };

  useEffect(() => {
    const fetchMyChildren = async () => {
      try {
        const token = localStorage.getItem("simba_token");
        if (!token) return navigate("/login");

        const response = await fetch("http://127.0.0.1:8000/api/v1/user/children/", {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setChild(data[0]); 
            localStorage.setItem("active_child_id", data[0].id.toString()); // Save ID for the Growth/Food screens
          }
        }
      } catch (error) {
        console.error("Failed to fetch child profile", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyChildren();
  }, [navigate]);

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
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.25)", backdropFilter: "blur(10px)" }}
          >
            <div className="rounded-full overflow-hidden flex items-center justify-center text-xl" style={{ width: 38, height: 38, background: "white" }}>
              {child.gender === 'male' ? '👦' : '👧'}
            </div>
            <div className="flex-1">
              <p style={{ fontSize: "14px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>
                {child.name}
              </p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                {calculateAge(child.birth_date)}
              </p>
            </div>
            <ChevronRight size={18} color="rgba(255,255,255,0.8)" />
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
            {[
              { label: "Weight", value: "11.6", unit: "kg", icon: "⚖️" },
              { label: "Height", value: "86", unit: "cm", icon: "📏" },
            ].map(({ label, value, unit, icon }) => (
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
          </div>
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
            <button onClick={() => navigate("/food-diary")} style={{ fontSize: "11px", color: "#F47B20", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>View →</button>
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