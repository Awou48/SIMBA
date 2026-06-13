import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronRight, Edit3, Save, X, Plus, Loader2, CheckCircle } from "lucide-react";

type GenderTab = "Boys" | "Girls";
type MetricTab = "Weight-for-Age" | "Height-for-Age" | "BMI-for-Age";

interface Standard { age: string; p3: string; p15: string; p50: string; p85: string; p97: string; }

const initialBoysWeight: Standard[] = [
  { age: "0 mo",  p3: "2.5", p15: "2.9", p50: "3.3", p85: "3.7", p97: "4.2" },
  { age: "6 mo",  p3: "6.4", p15: "7.1", p50: "7.9", p85: "8.8", p97: "9.7" },
  { age: "12 mo", p3: "7.7", p15: "8.6", p50: "9.6", p85: "10.8", p97: "11.9" },
  { age: "18 mo", p3: "8.8", p15: "9.8", p50: "11.0", p85: "12.4", p97: "13.7" },
  { age: "24 mo", p3: "9.7", p15: "10.8", p50: "12.2", p85: "13.6", p97: "15.1" },
];

const initialGirlsWeight: Standard[] = [
  { age: "0 mo",  p3: "2.4", p15: "2.8", p50: "3.2", p85: "3.6", p97: "4.0" },
  { age: "6 mo",  p3: "5.8", p15: "6.5", p50: "7.3", p85: "8.2", p97: "9.2" },
  { age: "12 mo", p3: "7.0", p15: "7.9", p50: "8.9", p85: "10.1", p97: "11.2" },
  { age: "18 mo", p3: "8.1", p15: "9.1", p50: "10.2", p85: "11.6", p97: "12.9" },
  { age: "24 mo", p3: "9.0", p15: "10.0", p50: "11.5", p85: "13.0", p97: "14.5" },
];

const emptyRow: Standard = { age: "", p3: "", p15: "", p50: "", p85: "", p97: "" };

export function HMGrowthStandards() {
  const navigate = useNavigate();
  const [gender, setGender]   = useState<GenderTab>("Boys");
  const [metric, setMetric]   = useState<MetricTab>("Weight-for-Age");
  
  const [boysData, setBoysData] = useState<Standard[]>(initialBoysWeight);
  const [girlsData, setGirlsData] = useState<Standard[]>(initialGirlsWeight);

  const data = gender === "Boys" ? boysData : girlsData;
  const setData = gender === "Boys" ? setBoysData : setGirlsData;

  const [editRow, setEditRow] = useState<number | null>(null);
  const [editData, setEditData] = useState<Standard | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRowForm, setNewRowForm] = useState<Standard>(emptyRow);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const startEdit = (i: number) => { setEditRow(i); setEditData({ ...data[i] }); };
  const cancelEdit = () => { setEditRow(null); setEditData(null); };
  
  const saveInlineEdit = () => { 
    if (editRow !== null && editData) {
      const updatedData = [...data];
      updatedData[editRow] = editData;
      setData(updatedData);
    }
    setEditRow(null); 
    setEditData(null); 
    setSaved(false); 
  };

  const handleAddNewRow = () => {
    setData([...data, newRowForm]);
    setShowAddForm(false);
    setNewRowForm(emptyRow);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen pb-6 relative" style={{ background: "#EEF2FF" }}>
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #4F46E5 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={18} color="white" />
          </button>
          <div className="flex-1">
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>📊 Growth Standards</h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>WHO Child Growth Benchmarks</p>
          </div>
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-transform active:scale-95" 
            style={{ background: "rgba(255,255,255,0.2)", fontSize: "12px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}
          >
            <Plus size={13} /> Add Row
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["Weight-for-Age", "Height-for-Age", "BMI-for-Age"].map(m => (
            <button key={m} onClick={() => setMetric(m as MetricTab)} className="flex-shrink-0 px-3 py-1.5 rounded-full transition-colors" style={{ background: metric === m ? "white" : "rgba(255,255,255,0.15)", color: metric === m ? "#4F46E5" : "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px" }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 pb-6">
        {saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200">
            <CheckCircle size={16} className="text-teal-600" />
            <p className="text-xs font-bold text-teal-700 font-['Nunito']">Standards synchronized with server!</p>
          </div>
        )}

        <button onClick={() => navigate("/hm/akg-targets")} className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-transform active:scale-95" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <div className="rounded-xl flex items-center justify-center" style={{ width: 38, height: 38, background: "#ECFEFF" }}><span style={{ fontSize: 18 }}>🎯</span></div>
          <div className="flex-1">
            <p style={{ fontSize: "13px", fontWeight: 800, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>AKG Nutritional Targets</p>
            <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>View & update adequacy standards →</p>
          </div>
          <ChevronRight size={16} style={{ color: "#C0C4D0" }} />
        </button>

        <div className="flex rounded-2xl p-1" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          {(["Boys", "Girls"] as GenderTab[]).map(g => (
            <button key={g} onClick={() => setGender(g)} className="flex-1 py-2 rounded-xl transition-all" style={{ background: gender === g ? "linear-gradient(90deg, #4F46E5, #818CF8)" : "transparent", color: gender === g ? "white" : "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "13px" }}>
              {g === "Boys" ? "👦 Boys" : "👧 Girls"}
            </button>
          ))}
        </div>

        {/* The Inline Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          <div className="grid px-3 py-2" style={{ gridTemplateColumns: "52px 1fr 1fr 1fr 1fr 1fr 36px", background: "#EEF2FF", gap: 4 }}>
            {["Age", "P3", "P15", "P50", "P85", "P97", ""].map((h, i) => (
              <p key={i} style={{ fontSize: "10px", fontWeight: 900, color: "#4F46E5", fontFamily: "'Nunito', sans-serif", textAlign: "center" }}>{h}</p>
            ))}
          </div>
          
          {data.map((row, i) => (
            <div key={i} className="grid items-center px-3 py-2.5" style={{ gridTemplateColumns: "52px 1fr 1fr 1fr 1fr 1fr 36px", borderBottom: i < data.length - 1 ? "1px solid #F5F5F5" : "none", background: editRow === i ? "#F0F4FF" : "white", gap: 4 }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif", textAlign: "center" }}>{row.age}</span>
              {(["p3", "p15", "p50", "p85", "p97"] as (keyof Standard)[]).filter(k => k !== "age").map(key => (
                <div key={key} style={{ textAlign: "center" }}>
                  {editRow === i && editData ? (
                    <input value={editData[key]} onChange={e => setEditData({ ...editData, [key]: e.target.value })} className="w-full text-center rounded-lg px-1 py-0.5 outline-none" style={{ fontSize: "11px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif", background: "white", border: "1.5px solid #818CF8" }} />
                  ) : (
                    <span style={{ fontSize: "12px", fontWeight: key === "p50" ? 900 : 600, color: key === "p50" ? "#4F46E5" : "#717182", fontFamily: "'Nunito', sans-serif" }}>{row[key]}</span>
                  )}
                </div>
              ))}
              <div className="flex justify-center">
                {editRow === i ? (
                  <div className="flex flex-col gap-1">
                    <button onClick={saveInlineEdit} className="rounded-lg p-1 transition-transform active:scale-95" style={{ background: "#4F46E5" }}><Save size={11} color="white" /></button>
                    <button onClick={cancelEdit} className="rounded-lg p-1 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}><X size={11} style={{ color: "#717182" }} /></button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(i)} className="rounded-lg p-1.5 transition-transform active:scale-95" style={{ background: "#EEF2FF" }}><Edit3 size={13} style={{ color: "#4F46E5" }} /></button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSaveAll} disabled={isSaving} className="w-full py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-80 disabled:scale-100 mt-2" style={{ background: "linear-gradient(90deg, #4F46E5, #818CF8)", color: "white", boxShadow: "0 4px 16px rgba(79,70,229,0.35)" }}>
          {isSaving ? <><Loader2 size={16} className="animate-spin" /><span style={{ fontSize: "14px", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>Syncing...</span></> : <><Save size={16} /><span style={{ fontSize: "14px", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>Save All Changes</span></>}
        </button>
      </div>

      {/* CENTERED ADD ROW MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,58,138,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-3xl p-5 flex flex-col gap-4" style={{ background: "white", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", animation: "slideUp 0.3s ease-out forwards" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>Add New Standard Row</p>
              <button onClick={() => setShowAddForm(false)} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Age Range</label>
                <input value={newRowForm.age} onChange={e => setNewRowForm({ ...newRowForm, age: e.target.value })} placeholder="e.g. 30 mo" className="px-4 py-3 rounded-2xl outline-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-2">
                {(["p3", "p15", "p50", "p85", "p97"] as (keyof Standard)[]).filter(k => k !== "age").map(key => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Percentile {key.replace('p', '')}</label>
                    <input value={newRowForm[key]} onChange={e => setNewRowForm({ ...newRowForm, [key]: e.target.value })} placeholder={`e.g. 10.5`} className="px-3 py-2.5 rounded-2xl outline-none focus:border-[#4F46E5] transition-colors" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }} />
                  </div>
                ))}
              </div>
              
              <button onClick={handleAddNewRow} className="w-full py-4 rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2 mt-4" style={{ background: "linear-gradient(90deg, #4F46E5, #818CF8)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}>
                <Plus size={16} /> Insert Row
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}