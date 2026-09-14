import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { X, Plus, Edit3, Trash2, Save, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { api, errorMessage as toMessage, type Milestone } from "../../../../lib/api";
import { FrameModal } from "../../FrameModal";

const FONT = "'Nunito', sans-serif";

// KPSP domains as used in the seeded dataset.
const DOMAINS = ["Motorik Kasar", "Motorik Halus", "Bicara & Bahasa", "Sosialisasi", "Kemandirian"];
const domainMeta: Record<string, { color: string; bg: string; icon: string }> = {
  "Motorik Kasar": { color: "#4F46E5", bg: "#EEF2FF", icon: "🏃" },
  "Motorik Halus": { color: "#06B6D4", bg: "#ECFEFF", icon: "✋" },
  "Bicara & Bahasa": { color: "#F47B20", bg: "#FFF7ED", icon: "💬" },
  Sosialisasi: { color: "#5CC8C2", bg: "#E8F9F8", icon: "🤝" },
  Kemandirian: { color: "#9B8BF4", bg: "#F0EDFF", icon: "🌟" },
};

// Age brackets (months, upper bound exclusive) offered in the editor.
const BRACKETS: { label: string; min: number; max: number }[] = [
  { label: "0 - 6 Months", min: 0, max: 6 },
  { label: "6 - 12 Months", min: 6, max: 12 },
  { label: "12 - 24 Months", min: 12, max: 24 },
  { label: "2 - 3 Years", min: 24, max: 36 },
  { label: "3 - 4 Years", min: 36, max: 48 },
  { label: "4 - 5 Years", min: 48, max: 60 },
];

type Form = Omit<Milestone, "id">;
const emptyForm: Form = { min_months: 0, max_months: 6, age_label: "0 - 6 Months", domain: "Motorik Kasar", question: "", expected: "", active: true, sort_order: 0 };

export function HMMilestones() {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [domainFilter, setDomainFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.admin
      .listMilestones()
      .then(setMilestones)
      .catch((err) => setError(toMessage(err, "Failed to load milestones.")))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = milestones.filter((m) => domainFilter === "All" || m.domain === domainFilter);
  const byBracket = BRACKETS.map((b) => ({ ...b, items: filtered.filter((m) => m.min_months === b.min) }))
    .concat([{ label: "Other", min: -1, max: -1, items: filtered.filter((m) => !BRACKETS.some((b) => b.min === m.min_months)) }])
    .filter((g) => g.items.length > 0);

  const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (m: Milestone) => {
    setEditId(m.id);
    const { id: _id, ...rest } = m;
    setForm({ ...rest, expected: rest.expected ?? "" });
    setShowForm(true);
  };

  const persist = async (id: number | null, data: Form) => {
    const payload = { ...data, expected: data.expected?.trim() || null };
    return id === null ? api.admin.createMilestone(payload) : api.admin.updateMilestone(id, payload);
  };

  const saveForm = async () => {
    if (form.question.trim().length < 3) { setError("Question is too short."); return; }
    setIsSaving(true);
    setError("");
    try {
      const saved = await persist(editId, form);
      setMilestones((prev) => (editId === null ? [...prev, saved] : prev.map((m) => (m.id === editId ? saved : m))));
      setShowForm(false);
    } catch (err) {
      setError(toMessage(err, "Failed to save milestone."));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (m: Milestone) => {
    try {
      const { id, ...rest } = m;
      const saved = await persist(id, { ...rest, active: !m.active });
      setMilestones((prev) => prev.map((x) => (x.id === id ? saved : x)));
    } catch (err) {
      setError(toMessage(err));
    }
  };

  const deleteM = async (m: Milestone) => {
    if (!window.confirm(`Delete "${m.question}"? Parents' answers to it will be removed too.`)) return;
    try {
      await api.admin.deleteMilestone(m.id);
      setMilestones((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err) {
      setError(toMessage(err));
    }
  };

  const selectBracket = (b: (typeof BRACKETS)[number]) => setForm({ ...form, min_months: b.min, max_months: b.max, age_label: b.label });

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #9B8BF4 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}><X size={18} color="white" /></button>
          <div className="flex-1">
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: FONT }}>🏁 KPSP Milestones</h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: FONT, fontWeight: 600 }}>
              {isLoading ? "Loading…" : `${milestones.filter((m) => m.active).length} active · ${milestones.length} total`}
            </p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.2)", fontSize: "12px", fontWeight: 800, color: "white", fontFamily: FONT }}>
            <Plus size={13} /> Add
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["All", ...DOMAINS].map((d) => (
            <button key={d} onClick={() => setDomainFilter(d)} className="flex-shrink-0 px-3 py-1.5 rounded-full transition-colors" style={{ background: domainFilter === d ? "white" : "rgba(255,255,255,0.15)", color: domainFilter === d ? "#4F46E5" : "rgba(255,255,255,0.8)", fontFamily: FONT, fontWeight: 800, fontSize: "11px" }}>{d}</button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 pb-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{error}</p>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={24} style={{ color: "#4F46E5" }} /></div>
        ) : byBracket.length === 0 ? (
          <p className="text-center py-6" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>No milestones yet. Run the seeder or add one.</p>
        ) : (
          byBracket.map((group) => (
            <div key={group.label} className="flex flex-col gap-2.5">
              <p style={{ fontSize: "12px", fontWeight: 900, color: "#9BA3B8", fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {group.label} · {group.items.length}
              </p>
              {group.items.map((m) => {
                const dc = domainMeta[m.domain] ?? { color: "#717182", bg: "#F5F5F5", icon: "🧠" };
                const isExpanded = expandedId === m.id;
                return (
                  <div key={m.id} className="rounded-2xl overflow-hidden transition-all" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: `4px solid ${dc.color}`, opacity: m.active ? 1 : 0.6 }}>
                    <button className="w-full flex items-center gap-3 px-3 py-3 text-left" onClick={() => setExpandedId(isExpanded ? null : m.id)}>
                      <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 32, height: 32, background: dc.bg }}>
                        <span style={{ fontSize: "14px" }}>{dc.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: dc.bg, fontSize: "9px", fontWeight: 800, color: dc.color, fontFamily: FONT }}>{m.domain}</span>
                          {!m.active && <span style={{ fontSize: "9px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 800 }}>INACTIVE</span>}
                        </div>
                        <p style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT, lineHeight: 1.4 }} className="truncate">{m.question}</p>
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: "#C0C4D0", flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: "#C0C4D0", flexShrink: 0 }} />}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: "1px solid #F5F5F5" }}>
                        <p style={{ fontSize: "11px", color: "#717182", fontFamily: FONT, fontWeight: 600, paddingTop: 8 }}>
                          <span style={{ fontWeight: 800, color: "#2D3047" }}>Expected: </span>{m.expected || "Ya (child can do this)"}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => toggleActive(m)} className="flex-1 py-2 rounded-xl transition-transform active:scale-95" style={{ background: m.active ? "#FFF7ED" : "#EEF2FF", fontSize: "11px", fontWeight: 800, color: m.active ? "#F47B20" : "#4F46E5", fontFamily: FONT }}>{m.active ? "Deactivate" : "Activate"}</button>
                          <button onClick={() => openEdit(m)} className="px-3 py-2 rounded-xl transition-transform active:scale-95" style={{ background: "#EEF2FF" }}><Edit3 size={14} style={{ color: "#4F46E5" }} /></button>
                          <button onClick={() => deleteM(m)} className="px-3 py-2 rounded-xl transition-transform active:scale-95" style={{ background: "#FFF0F0" }}><Trash2 size={14} style={{ color: "#E53535" }} /></button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {showForm && (
        <FrameModal align="center" onClose={() => !isSaving && setShowForm(false)}>
          <div className="w-full rounded-3xl p-5 flex flex-col gap-3" style={{ background: "white", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <div className="flex items-center justify-between mb-1">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#1E3A8A", fontFamily: FONT }}>{editId ? "Edit Milestone" : "Add Milestone"}</p>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Age bracket</label>
              <div className="flex gap-2 flex-wrap">
                {BRACKETS.map((b) => (
                  <button key={b.label} onClick={() => selectBracket(b)} className="px-3 py-1 rounded-full transition-colors" style={{ background: form.min_months === b.min ? "#4F46E5" : "#F5F5F5", color: form.min_months === b.min ? "white" : "#717182", fontFamily: FONT, fontWeight: 800, fontSize: "11px" }}>{b.label}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Domain</label>
              <div className="flex gap-1.5 flex-wrap">
                {DOMAINS.map((d) => (
                  <button key={d} onClick={() => setForm({ ...form, domain: d })} className="px-2.5 py-1.5 rounded-xl transition-colors" style={{ background: form.domain === d ? "#4F46E5" : "#F5F5F5", color: form.domain === d ? "white" : "#717182", fontFamily: FONT, fontWeight: 800, fontSize: "10px" }}>{d}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Question (Indonesian)</label>
              <textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="e.g. Berjalan sendiri" className="px-4 py-3 rounded-2xl outline-none resize-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: FONT, height: 72 }} />
            </div>
            <div className="flex flex-col gap-1.5 mb-1">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Expected response (optional)</label>
              <input value={form.expected ?? ""} onChange={(e) => setForm({ ...form, expected: e.target.value })} className="px-4 py-3 rounded-2xl outline-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: FONT }} />
            </div>
            <button onClick={saveForm} disabled={isSaving} className="w-full py-4 rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70" style={{ background: "linear-gradient(90deg, #4F46E5, #9B8BF4)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: FONT, boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isSaving ? "Saving…" : "Save Question"}
            </button>
          </div>
        </FrameModal>
      )}
    </div>
  );
}
