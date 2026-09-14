import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { X, Edit3, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api, errorMessage as toMessage, type AKGRow } from "../../../../lib/api";


// Fallback data in case the database is empty or offline
const fallbackAkgData: AKGRow[] = [
  { ageGroup: "0–5 mo",   gender: "M/F", energy: "550",  protein: "9",  fat: "31", carbs: "59",  vitA: "375", vitC: "40",  iron: "0.3", calcium: "200" },
  { ageGroup: "6–11 mo",  gender: "M/F", energy: "800",  protein: "15", fat: "35", carbs: "105", vitA: "400", vitC: "50",  iron: "11",  calcium: "270" },
  { ageGroup: "1–3 yr",   gender: "M/F", energy: "1350", protein: "20", fat: "44", carbs: "215", vitA: "400", vitC: "40",  iron: "7",   calcium: "650" },
  { ageGroup: "4–6 yr",   gender: "M/F", energy: "1400", protein: "25", fat: "50", carbs: "220", vitA: "450", vitC: "45",  iron: "10",  calcium: "1000" },
  { ageGroup: "7–9 yr",   gender: "M",   energy: "1850", protein: "40", fat: "72", carbs: "254", vitA: "500", vitC: "45",  iron: "10",  calcium: "1000" },
  { ageGroup: "7–9 yr",   gender: "F",   energy: "1650", protein: "35", fat: "65", carbs: "234", vitA: "500", vitC: "45",  iron: "10",  calcium: "1000" },
];

const nutrients = [
  { key: "energy",   label: "Energy",   unit: "kcal", color: "#F47B20" },
  { key: "protein",  label: "Protein",  unit: "g",    color: "#4F46E5" },
  { key: "fat",      label: "Fat",      unit: "g",    color: "#FFC72C" },
  { key: "carbs",    label: "Carbs",    unit: "g",    color: "#06B6D4" },
  { key: "vitA",     label: "Vit A",    unit: "mcg",  color: "#E53535" },
  { key: "vitC",     label: "Vit C",    unit: "mg",   color: "#5CC8C2" },
  { key: "iron",     label: "Iron",     unit: "mg",   color: "#9B8BF4" },
  { key: "calcium",  label: "Calcium",  unit: "mg",   color: "#FF7BAC" },
] as const;

export function HMAKGTargets() {
  const navigate  = useNavigate();
  const [rows, setRows] = useState<AKGRow[]>(fallbackAkgData);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editBuf, setEditBuf] = useState<AKGRow | null>(null);
  const [activeNutrient, setActiveNutrient] = useState<typeof nutrients[number]["key"]>("energy");

  // API States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  const nutrient = nutrients.find(n => n.key === activeNutrient)!;

  // 1. Fetch live AKG targets from Python Backend
  useEffect(() => {
    api.admin
      .getAkg()
      .then((data) => { if (data.length > 0) setRows(data); })
      .catch((err) => console.warn("Using fallback AKG data.", err))
      .finally(() => setIsLoading(false));
  }, []);

  const startEdit = (i: number) => { setEditIdx(i); setEditBuf({ ...rows[i] }); };
  const cancelEdit = () => { setEditIdx(null); setEditBuf(null); };
  
  const saveEditLocally = () => {
    if (editBuf !== null && editIdx !== null) {
      const next = [...rows];
      next[editIdx] = editBuf;
      setRows(next);
      // Clear status message if they make a new edit so they know to save again
      setStatusMsg(null); 
    }
    setEditIdx(null); setEditBuf(null);
  };

  // 2. Save entire table to Python Backend
  const saveAllToDatabase = async () => {
    setIsSaving(true);
    setStatusMsg(null);
    
    try {
      await api.admin.updateAkg(rows);
      // Reload so rows carry their fresh database ids.
      setRows(await api.admin.getAkg());
      setStatusMsg({ type: "success", text: "AKG Targets successfully updated!" });
      setTimeout(() => setStatusMsg(null), 4000); // Hide success after 4s
      
    } catch (err) {
      setStatusMsg({ type: "error", text: toMessage(err, "Database connection error.") });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      {/* Header */}
      <div
        className="px-4 pt-4 pb-5"
        style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #06B6D4 100%)", borderRadius: "0 0 28px 28px" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={18} color="white" />
          </button>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              🎯 AKG Targets
            </h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              Nutritional Adequacy Standards (Indonesia)
            </p>
          </div>
        </div>

        {/* Nutrient tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {nutrients.map(n => (
            <button
              key={n.key}
              onClick={() => setActiveNutrient(n.key)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: activeNutrient === n.key ? "white" : "rgba(255,255,255,0.15)",
                color: activeNutrient === n.key ? "#1E3A8A" : "rgba(255,255,255,0.8)",
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
                fontSize: "11px",
              }}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 pb-6">
        
        {/* Status Message */}
        {statusMsg && (
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${statusMsg.type === "success" ? "bg-teal-50 border-teal-200" : "bg-red-50 border-red-200"}`}>
            {statusMsg.type === "success" ? <CheckCircle size={16} className="text-teal-600" /> : <AlertCircle size={16} className="text-red-500" />}
            <p className={`text-xs font-bold font-['Nunito'] ${statusMsg.type === "success" ? "text-teal-700" : "text-red-600"}`}>
              {statusMsg.text}
            </p>
          </div>
        )}

        {/* Active nutrient info */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: `4px solid ${nutrient.color}` }}
        >
          <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 42, height: 42, background: "#EEF2FF" }}>
            <span style={{ fontSize: 20 }}>
              {activeNutrient === "energy" ? "⚡" : activeNutrient === "protein" ? "🥩" : activeNutrient === "fat" ? "🧈" : activeNutrient === "carbs" ? "🌾" : activeNutrient === "vitA" ? "🥕" : activeNutrient === "vitC" ? "🍊" : activeNutrient === "iron" ? "🔩" : "🦴"}
            </span>
          </div>
          <div>
            <p style={{ fontSize: "14px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>
              {nutrient.label} Requirements
            </p>
            <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              Unit: {nutrient.unit} per day · Tap ✏️ to edit
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          {/* Header */}
          <div className="grid px-3 py-2" style={{ gridTemplateColumns: "80px 40px 1fr 36px", background: "#EEF2FF", gap: 4 }}>
            {["Age Group", "Sex", `${nutrient.label} (${nutrient.unit})`, ""].map((h, i) => (
              <p key={i} style={{ fontSize: "10px", fontWeight: 900, color: "#4F46E5", fontFamily: "'Nunito', sans-serif" }}>{h}</p>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="animate-spin text-[#06B6D4]" size={24} />
            </div>
          ) : (
            rows.map((row, i) => (
              <div
                key={i}
                className="grid items-center px-3 py-3"
                style={{
                  gridTemplateColumns: "80px 40px 1fr 36px",
                  borderBottom: i < rows.length - 1 ? "1px solid #F5F5F5" : "none",
                  background: editIdx === i ? "#F0F4FF" : "white",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 800, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>{row.ageGroup}</span>
                <span
                  className="px-1.5 py-0.5 rounded-lg text-center"
                  style={{ fontSize: "10px", fontWeight: 800, color: "#4F46E5", fontFamily: "'Nunito', sans-serif", background: "#EEF2FF" }}
                >
                  {row.gender}
                </span>
                {editIdx === i && editBuf ? (
                  <input
                    value={editBuf[activeNutrient as keyof AKGRow] ?? ""}
                    onChange={e => setEditBuf({ ...editBuf, [activeNutrient]: e.target.value })}
                    className="rounded-lg px-2 py-1 outline-none w-full"
                    style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif", background: "white", border: "1.5px solid #818CF8" }}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="rounded-full overflow-hidden hidden sm:block" style={{ height: 6, flex: 1, background: "#F5F5F5" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (parseFloat(String(row[activeNutrient as keyof AKGRow] ?? "0")) / (Math.max(...rows.map(r => parseFloat(String(r[activeNutrient as keyof AKGRow] ?? "0")) || 0)) || 1)) * 100)}%`,
                          background: nutrient.color,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif", flexShrink: 0 }}>
                      {row[activeNutrient as keyof AKGRow] ?? "—"}
                    </span>
                  </div>
                )}
                <div className="flex justify-center">
                  {editIdx === i ? (
                    <div className="flex gap-1">
                      <button onClick={saveEditLocally} className="rounded-lg p-1.5 transition-transform active:scale-95" style={{ background: "#4F46E5" }}>
                        <Save size={11} color="white" />
                      </button>
                      <button onClick={cancelEdit} className="rounded-lg p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}>
                        <X size={11} style={{ color: "#717182" }} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(i)} className="rounded-lg p-1.5 transition-transform active:scale-95" style={{ background: "#EEF2FF" }}>
                      <Edit3 size={13} style={{ color: "#4F46E5" }} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600, textAlign: "center" }}>
          Based on Permenkes No. 28 Tahun 2019 (AKG Indonesia)
        </p>

        {/* Dynamic Save Button */}
        <button
          onClick={saveAllToDatabase}
          disabled={isSaving || isLoading}
          className="w-full py-4 rounded-full flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-80 disabled:scale-100 mt-2"
          style={{
            background: "linear-gradient(90deg, #1E3A8A, #06B6D4)",
            color: "white",
            boxShadow: "0 4px 16px rgba(6,182,212,0.35)",
          }}
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span style={{ fontSize: "15px", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>Syncing to Database...</span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span style={{ fontSize: "15px", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>Save AKG Targets</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}