import { useState } from "react";
import { useNavigate } from "react-router";
import { X, Plus, Edit3, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";

interface MilestoneQ { id: number; ageRange: string; domain: string; question: string; expected: string; active: boolean; }

const initialMilestones: MilestoneQ[] = [
  { id: 1,  ageRange: "0–3 mo",  domain: "Motor",       question: "Can the baby lift their head when placed on their tummy?", expected: "Yes by 3 months", active: true },
  { id: 2,  ageRange: "0–3 mo",  domain: "Social",      question: "Does the baby smile in response to a familiar face?", expected: "Yes by 2 months", active: true },
  { id: 3,  ageRange: "4–6 mo",  domain: "Language",    question: "Does the baby make babbling sounds (ba-ba, ma-ma)?", expected: "Yes by 6 months", active: true },
];

const domains = ["All", "Motor", "Language", "Social", "Cognitive"];
const domainColors: Record<string, { color: string; bg: string }> = {
  Motor: { color: "#4F46E5", bg: "#EEF2FF" }, Language: { color: "#F47B20", bg: "#FFF7ED" }, Social: { color: "#5CC8C2", bg: "#E8F9F8" }, Cognitive: { color: "#9B8BF4", bg: "#F0EDFF" },
};
const ageGroups = ["0–3 mo", "4–6 mo", "7–9 mo", "10–12 mo", "13–18 mo"];
const emptyQ: Omit<MilestoneQ, "id"> = { ageRange: "0–3 mo", domain: "Motor", question: "", expected: "", active: true };

export function HMMilestones() {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState<MilestoneQ[]>(initialMilestones);
  const [domainFilter, setDomainFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<MilestoneQ, "id">>(emptyQ);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filtered = milestones.filter(m => domainFilter === "All" || m.domain === domainFilter);

  const openAdd  = () => { setEditId(null); setForm(emptyQ); setShowForm(true); };
  const openEdit = (m: MilestoneQ) => { setEditId(m.id); setForm({ ...m }); setShowForm(true); };
  const saveForm = () => {
    if (editId !== null) setMilestones(prev => prev.map(m => m.id === editId ? { ...form, id: editId } : m));
    else setMilestones(prev => [{ ...form, id: Date.now() }, ...prev]);
    setShowForm(false);
  };
  const toggleActive = (id: number) => setMilestones(prev => prev.map(m => m.id === id ? { ...m, active: !m.active } : m));
  const deleteM = (id: number) => setMilestones(prev => prev.filter(m => m.id !== id));

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #9B8BF4 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}><X size={18} color="white" /></button>
          <div className="flex-1">
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>🏁 Milestones</h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{milestones.filter(m => m.active).length} active</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.2)", fontSize: "12px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {domains.map(d => (
            <button key={d} onClick={() => setDomainFilter(d)} className="flex-shrink-0 px-3 py-1.5 rounded-full transition-colors" style={{ background: domainFilter === d ? "white" : "rgba(255,255,255,0.15)", color: domainFilter === d ? "#4F46E5" : "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px" }}>{d}</button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-2.5 pb-6">
        {filtered.map(m => {
          const dc = domainColors[m.domain] ?? { color: "#717182", bg: "#F5F5F5" };
          const isExpanded = expandedId === m.id;
          return (
            <div key={m.id} className="rounded-2xl overflow-hidden transition-all" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: `4px solid ${dc.color}`, opacity: m.active ? 1 : 0.6 }}>
              <button className="w-full flex items-center gap-3 px-3 py-3 text-left" onClick={() => setExpandedId(isExpanded ? null : m.id)}>
                <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, background: dc.bg }}>
                  <span style={{ fontSize: "14px" }}>{m.domain === "Motor" ? "🏃" : m.domain === "Language" ? "💬" : m.domain === "Social" ? "🤝" : "🧠"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: dc.bg, fontSize: "9px", fontWeight: 800, color: dc.color, fontFamily: "'Nunito', sans-serif" }}>{m.domain}</span>
                    <span style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{m.ageRange}</span>
                    {!m.active && <span style={{ fontSize: "9px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>INACTIVE</span>}
                  </div>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.4 }} className="truncate">{m.question}</p>
                </div>
                {isExpanded ? <ChevronUp size={16} style={{ color: "#C0C4D0", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "#C0C4D0", flexShrink: 0 }} />}
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: "1px solid #F5F5F5" }}>
                  <p style={{ fontSize: "11px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 600, paddingTop: 8 }}><span style={{ fontWeight: 800, color: "#2D3047" }}>Expected: </span>{m.expected}</p>
                  <div className="flex gap-2">
                    <button onClick={() => toggleActive(m.id)} className="flex-1 py-2 rounded-xl transition-transform active:scale-95" style={{ background: m.active ? "#FFF7ED" : "#EEF2FF", fontSize: "11px", fontWeight: 800, color: m.active ? "#F47B20" : "#4F46E5", fontFamily: "'Nunito', sans-serif" }}>{m.active ? "Deactivate" : "Activate"}</button>
                    <button onClick={() => openEdit(m)} className="px-3 py-2 rounded-xl transition-transform active:scale-95" style={{ background: "#EEF2FF" }}><Edit3 size={14} style={{ color: "#4F46E5" }} /></button>
                    <button onClick={() => deleteM(m.id)} className="px-3 py-2 rounded-xl transition-transform active:scale-95" style={{ background: "#FFF0F0" }}><Trash2 size={14} style={{ color: "#E53535" }} /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,58,138,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-3xl p-5 flex flex-col gap-3" style={{ background: "white", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", animation: "slideUp 0.3s ease-out forwards" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>{editId ? "Edit Milestone" : "Add Milestone"}</p>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Age Range</label>
              <div className="flex gap-2 flex-wrap">
                {ageGroups.map(a => (
                  <button key={a} onClick={() => setForm({ ...form, ageRange: a })} className="px-3 py-1 rounded-full transition-colors" style={{ background: form.ageRange === a ? "#4F46E5" : "#F5F5F5", color: form.ageRange === a ? "white" : "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px" }}>{a}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Domain</label>
              <div className="flex gap-2">
                {["Motor", "Language", "Social", "Cognitive"].map(d => (
                  <button key={d} onClick={() => setForm({ ...form, domain: d })} className="flex-1 py-2 rounded-xl transition-colors" style={{ background: form.domain === d ? "#4F46E5" : "#F5F5F5", color: form.domain === d ? "white" : "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px" }}>{d}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Question</label>
              <textarea value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} className="px-4 py-3 rounded-2xl outline-none resize-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif", height: 72 }} />
            </div>
            <div className="flex flex-col gap-1.5 mb-2">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Expected Response</label>
              <input value={form.expected} onChange={e => setForm({ ...form, expected: e.target.value })} className="px-4 py-3 rounded-2xl outline-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }} />
            </div>
            <button onClick={saveForm} className="w-full py-4 rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2" style={{ background: "linear-gradient(90deg, #4F46E5, #9B8BF4)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}>
              <Save size={16} /> Save Question
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}