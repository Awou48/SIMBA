import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Plus, AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const mealCategories = ["Breakfast", "Lunch", "Dinner", "Snack"];

const meals: Record<string, { name: string; portion: string; cal: number; protein: number; carbs: number; fat: number }[]> = {
  Breakfast: [
    { name: "Oatmeal with Banana", portion: "1 bowl (180g)", cal: 220, protein: 6, carbs: 42, fat: 4 },
    { name: "Whole Milk", portion: "200ml", cal: 130, protein: 7, carbs: 10, fat: 8 },
  ],
  Lunch: [
    { name: "Chicken Veggie Soup", portion: "1 bowl (200g)", cal: 185, protein: 14, carbs: 18, fat: 5 },
    { name: "Brown Rice", portion: "½ cup (90g)", cal: 110, protein: 2, carbs: 23, fat: 1 },
  ],
  Dinner: [
    { name: "Salmon with Sweet Potato", portion: "1 serving (150g)", cal: 280, protein: 22, carbs: 24, fat: 10 },
  ],
  Snack: [
    { name: "Apple Slices", portion: "1 medium (120g)", cal: 65, protein: 0, carbs: 17, fat: 0 },
    { name: "Peanut Butter", portion: "1 tbsp (16g)", cal: 95, protein: 4, carbs: 3, fat: 8 },
  ],
};

export function FoodDiaryScreen() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("Breakfast");
  const [dateOffset, setDateOffset] = useState(0);

  const [akgData, setAkgData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const totalCal = Object.values(meals).flat().reduce((sum, f) => sum + f.cal, 0);
  const totalProtein = Object.values(meals).flat().reduce((sum, f) => sum + f.protein, 0);
  const totalCarbs = Object.values(meals).flat().reduce((sum, f) => sum + f.carbs, 0);
  const totalFat = Object.values(meals).flat().reduce((sum, f) => sum + f.fat, 0);

  const pieData = [
    { name: "Carbs", value: totalCarbs, color: "#FFC72C" },
    { name: "Protein", value: totalProtein, color: "#5CC8C2" },
    { name: "Fat", value: totalFat, color: "#F47B20" },
  ];

  const getDateLabel = () => {
    if (dateOffset === 0) return "Today";
    if (dateOffset === -1) return "Yesterday";
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  useEffect(() => {
    const fetchNutritionAnalysis = async () => {
      try {
        const token = localStorage.getItem("simba_token");
        const childId = localStorage.getItem("active_child_id");
        
        if (!token || !childId) {
          throw new Error("Missing authentication or child profile.");
        }

        const payload = {
          age_in_months: 27, 
          total_protein: totalProtein,
          total_energy: totalCal
        };

        const response = await fetch(`http://127.0.0.1:8000/api/v1/user/nutrition/${childId}/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to fetch AKG data.");

        const data = await response.json();
        setAkgData(data.data || data); 

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNutritionAnalysis();
  }, [totalCal, totalProtein]);

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
            🍽️ Food Diary
          </h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
            Daily nutrition log
          </p>
        </div>
      </div>

      {/* Date selector */}
      <div className="flex items-center justify-center gap-4 px-4 mb-4">
        <button onClick={() => setDateOffset(dateOffset - 1)} className="rounded-full p-1.5" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <ChevronLeft size={18} style={{ color: "#2D3047" }} />
        </button>
        <div className="px-6 py-2 rounded-2xl" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{getDateLabel()}</span>
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
            <p className="text-xs font-semibold text-red-600 font-['Nunito']">{error}</p>
          </div>
        )}

        {/* Dynamic Calorie & Protein Summary from Backend */}
        <div className="rounded-3xl p-4 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #F47B20, #FFC72C)", boxShadow: "0 6px 20px rgba(244,123,32,0.3)" }}>
          <div className="flex-1">
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>Daily Energy</p>
            <p style={{ fontSize: "28px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif", lineHeight: 1 }}>
              {totalCal}<span style={{ fontSize: "14px" }}> kcal</span>
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.9)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, marginTop: "4px" }}>
              Target: {isLoading ? "..." : `${akgData?.target_energy} kcal`}
            </p>
            {akgData && (
              <div className="mt-2 w-full bg-white/30 rounded-full h-1.5">
                <div className="bg-white h-1.5 rounded-full" style={{ width: `${Math.min(akgData.energy_fulfillment_percent, 100)}%` }}></div>
              </div>
            )}
          </div>
          <div style={{ width: 70, height: 70 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={32} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#2D3047", border: "none", borderRadius: 8, fontSize: 10, color: "white", fontFamily: "'Nunito', sans-serif" }}
                  formatter={(v: number) => [`${v}g`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1">
            {pieData.map(({ name, value, color }) => (
              <div key={name} className="flex items-center gap-1">
                <div className="rounded-full" style={{ width: 6, height: 6, background: color }} />
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{name} {value}g</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Protein Goal Card */}
        {akgData && (
           <div className="rounded-2xl p-3 bg-white shadow-sm flex items-center justify-between border border-gray-100">
             <div>
               <p className="text-xs font-bold text-gray-500 font-['Nunito']">Protein Fulfillment</p>
               <p className="text-sm font-black text-[#5CC8C2] font-['Nunito']">{totalProtein}g / {akgData.target_protein}g</p>
             </div>
             <div className="text-right">
                <p className="text-lg font-black text-gray-800 font-['Nunito']">{akgData.protein_fulfillment_percent}%</p>
             </div>
           </div>
        )}

        {/* Meal category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {mealCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 py-2 rounded-full transition-all"
              style={{
                background: activeCategory === cat ? "#5CC8C2" : "white",
                color: activeCategory === cat ? "white" : "#717182",
                fontSize: "12px",
                fontWeight: 800,
                fontFamily: "'Nunito', sans-serif",
                boxShadow: activeCategory === cat ? "0 4px 12px rgba(92,200,194,0.4)" : "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              {activeCategory === cat ? "✓ " : ""}{cat}
            </button>
          ))}
        </div>

        {/* Food entries */}
        <div className="flex flex-col gap-3">
          {(meals[activeCategory] || []).map((food) => (
            <div
              key={food.name}
              className="rounded-2xl p-4"
              style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{food.name}</p>
                  <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{food.portion}</p>
                </div>
                <span
                  className="px-3 py-1 rounded-full"
                  style={{ background: "#FFF0E0", fontSize: "12px", fontWeight: 800, color: "#F47B20", fontFamily: "'Nunito', sans-serif" }}
                >
                  {food.cal} kcal
                </span>
              </div>
              {/* Nutrition bar */}
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${(food.protein / (food.protein + food.carbs + food.fat)) * 100}%`, background: "#5CC8C2", borderRadius: "4px 0 0 4px" }} />
                <div style={{ width: `${(food.carbs / (food.protein + food.carbs + food.fat)) * 100}%`, background: "#FFC72C" }} />
                <div style={{ width: `${(food.fat / (food.protein + food.carbs + food.fat)) * 100}%`, background: "#F47B20", borderRadius: "0 4px 4px 0" }} />
              </div>
              <div className="flex gap-3 mt-1.5">
                {[
                  { label: "P", value: food.protein, color: "#5CC8C2" },
                  { label: "C", value: food.carbs, color: "#FFC72C" },
                  { label: "F", value: food.fat, color: "#F47B20" },
                ].map(({ label, value, color }) => (
                  <span key={label} style={{ fontSize: "10px", color, fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>
                    {label}: {value}g
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}