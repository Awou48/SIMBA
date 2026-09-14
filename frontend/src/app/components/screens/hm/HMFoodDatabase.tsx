import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, Plus, Edit3, Trash2, X, Save, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { api, errorMessage as toMessage, type FoodItem } from "../../../../lib/api";

const PAGE_SIZE = 100;

const categories = ["All", "Protein", "Main Course", "Fruit", "Vegetable", "Dairy", "Snack", "Carbs", "Other"];
const categoryColors: Record<string, { color: string; bg: string }> = {
  Protein:     { color: "#4F46E5", bg: "#EEF2FF" },
  "Main Course": { color: "#F47B20", bg: "#FFF7ED" },
  Fruit:       { color: "#E53535", bg: "#FFF0F0" },
  Vegetable:   { color: "#5CC8C2", bg: "#E8F9F8" },
  Dairy:       { color: "#06B6D4", bg: "#ECFEFF" },
  Snack:       { color: "#FFC72C", bg: "#FEFCE8" },
  Carbs:       { color: "#9B8BF4", bg: "#F0EDFF" },
  Other:       { color: "#717182", bg: "#F5F5F5" },
};

const emptyFood: Omit<FoodItem, "id"> = { name: "", category: "Protein", energy: 0, protein: 0, carbs: 0, fat: 0, safe: true };

export function HMFoodDatabase() {
  const navigate = useNavigate();
  const [foods, setFoods]         = useState<FoodItem[]>([]);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState<number | null>(null);
  const [form, setForm]           = useState<Omit<FoodItem, "id">>(emptyFood);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Server-side search/filter, debounced so we don't hit the API on every keystroke.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setIsLoading(true);
      setError("");
      api.admin
        .listFoods({ q: search.trim() || undefined, category: catFilter === "All" ? undefined : catFilter, limit: PAGE_SIZE })
        .then((data) => { if (!cancelled) setFoods(data); })
        .catch((err) => { if (!cancelled) setError(toMessage(err, "Failed to load the food database.")); })
        .finally(() => { if (!cancelled) setIsLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search, catFilter, reloadKey]);

  const openAdd  = () => { setEditId(null); setForm(emptyFood); setShowForm(true); };
  const openEdit = (f: FoodItem) => { setEditId(f.id); setForm({ name: f.name, category: f.category, energy: f.energy, protein: f.protein, carbs: f.carbs, fat: f.fat, safe: f.safe }); setShowForm(true); };

  const saveForm = async () => {
    if (!form.name.trim()) {
      setError("Food name is required.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      if (editId !== null) {
        const updated = await api.admin.updateFood(editId, { ...form, name: form.name.trim() });
        setFoods(prev => prev.map(f => f.id === editId ? updated : f));
      } else {
        const created = await api.admin.createFood({ ...form, name: form.name.trim() });
        setFoods(prev => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      setError(toMessage(err, "Failed to save food item."));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFood = async (food: FoodItem) => {
    if (!window.confirm(`Delete "${food.name}" from the database?`)) return;
    setError("");
    try {
      await api.admin.deleteFood(food.id);
      setFoods(prev => prev.filter(f => f.id !== food.id));
    } catch (err) {
      setError(toMessage(err, "Failed to delete food item."));
      setReloadKey(k => k + 1);
    }
  };

  const filtered = foods;

  return (
    <div className="flex flex-col relative min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #F47B20 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={18} color="white" />
          </button>
          <div className="flex-1">
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              🍎 Food Database
            </h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              {isLoading ? "Loading…" : `${foods.length}${foods.length === PAGE_SIZE ? "+" : ""} items · ${foods.filter(f => !f.safe).length} flagged`}
            </p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.2)", fontSize: "12px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>
            <Plus size={13} /> Add
          </button>
        </div>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl focus-within:bg-white/30 transition-colors" style={{ background: "rgba(255,255,255,0.2)" }}>
          <Search size={16} color="rgba(255,255,255,0.7)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search food items..." className="flex-1 bg-transparent outline-none text-white placeholder-white/50" style={{ fontSize: "13px", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }} />
        </div>
      </div>

      <div className="flex gap-2 px-4 pt-4 pb-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {categories.map(c => (
          <button key={c} onClick={() => setCatFilter(c)} className="flex-shrink-0 px-3 py-1.5 rounded-full transition-all" style={{ background: catFilter === c ? "#4F46E5" : "white", color: catFilter === c ? "white" : "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px", boxShadow: catFilter === c ? "0 4px 12px rgba(79,70,229,0.3)" : "0 2px 8px rgba(0,0,0,0.06)" }}>
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2 px-4 pt-3">
        {[
          { label: "Milestones", path: "/hm/milestones", emoji: "🏁" },
          { label: "Education", path: "/hm/education", emoji: "📚" },
        ].map(({ label, path, emoji }) => (
          <button key={label} onClick={() => navigate(path)} className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl transition-transform active:scale-95" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 16 }}>{emoji}</span>
            <span style={{ fontSize: "12px", fontWeight: 800, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>{label}</span>
            <ChevronRight size={14} style={{ color: "#C0C4D0", marginLeft: "auto" }} />
          </button>
        ))}
      </div>

      <div className="px-4 pt-3 flex flex-col gap-3">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600 font-['Nunito']">{error}</p>
          </div>
        )}
        {!isLoading && foods.length === PAGE_SIZE && (
          <p className="text-center text-[10px] font-bold text-[#9BA3B8] font-['Nunito']">Showing the first {PAGE_SIZE} matches — refine your search to narrow down.</p>
        )}
        {isLoading ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin text-[#4F46E5]" size={24} /></div>
        ) : filtered.length === 0 ? (
           <p className="text-center text-[#9BA3B8] font-['Nunito'] font-bold py-6 text-sm">No food items found.</p>
        ) : (
          filtered.map(food => {
            const c = categoryColors[food.category] ?? { color: "#717182", bg: "#F5F5F5" };
            return (
              <div key={food.id} className="rounded-2xl p-3 transition-transform active:scale-[0.98]" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <p style={{ fontSize: "13px", fontWeight: 800, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>{food.name}</p>
                      <span className="px-2 py-0.5 rounded-full" style={{ background: c.bg, fontSize: "9px", fontWeight: 800, color: c.color, fontFamily: "'Nunito', sans-serif" }}>{food.category}</span>
                      {!food.safe && <span className="px-2 py-0.5 rounded-full" style={{ background: "#FFF0F0", fontSize: "9px", fontWeight: 800, color: "#E53535", fontFamily: "'Nunito', sans-serif" }}>⚠️ Flagged</span>}
                    </div>
                    <div className="flex gap-3">
                      {[
                        { label: "Kcal", value: food.energy, color: "#F47B20" },
                        { label: "Prot", value: `${food.protein}g`, color: "#4F46E5" },
                        { label: "Carbs", value: `${food.carbs}g`, color: "#06B6D4" },
                        { label: "Fat", value: `${food.fat}g`, color: "#FFC72C" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                          <p style={{ fontSize: "11px", fontWeight: 900, color, fontFamily: "'Nunito', sans-serif" }}>{value}</p>
                          <p style={{ fontSize: "9px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => openEdit(food)} className="rounded-xl p-2 transition-colors hover:bg-[#E0E7FF]" style={{ background: "#EEF2FF" }}><Edit3 size={14} style={{ color: "#4F46E5" }} /></button>
                    <button onClick={() => deleteFood(food)} className="rounded-xl p-2 transition-colors hover:bg-[#FFE4E4]" style={{ background: "#FFF0F0" }}><Trash2 size={14} style={{ color: "#E53535" }} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CENTERED MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,58,138,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-3xl p-5 flex flex-col gap-4" style={{ background: "white", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", animation: "slideUp 0.3s ease-out forwards" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>{editId ? "Edit Food Item" : "Add New Food Item"}</p>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            
            <div className="overflow-y-auto flex flex-col gap-4" style={{ maxHeight: "65vh", paddingRight: "4px" }}>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Food Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nasi Tim Ayam" className="px-4 py-3 rounded-2xl outline-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Category</label>
                <div className="flex gap-2 flex-wrap">
                  {categories.filter(c => c !== "All").map(c => (
                    <button key={c} onClick={() => setForm({ ...form, category: c })} className="px-3 py-1.5 rounded-full transition-all" style={{ background: form.category === c ? "#4F46E5" : "#F5F5F5", color: form.category === c ? "white" : "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px" }}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Energy (kcal)", field: "energy" }, { label: "Protein (g)", field: "protein" },
                  { label: "Carbs (g)", field: "carbs" }, { label: "Fat (g)", field: "fat" },
                ].map(({ label, field }) => (
                  <div key={field} className="flex flex-col gap-1.5">
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{label}</label>
                    <input type="number" value={form[field as keyof typeof form] as number} onChange={e => setForm({ ...form, [field]: parseFloat(e.target.value) || 0 })} className="px-3 py-2.5 rounded-2xl outline-none focus:border-[#4F46E5] transition-colors" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }} />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 py-2">
                <button onClick={() => setForm({ ...form, safe: !form.safe })} className="rounded-full transition-all" style={{ width: 46, height: 26, background: form.safe ? "#5CC8C2" : "#E53535", position: "relative" }}>
                  <div className="absolute rounded-full" style={{ width: 20, height: 20, background: "white", top: 3, left: form.safe ? 23 : 3, transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                </button>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Safe for toddlers {form.safe ? "✅" : "⚠️ (Flagged)"}</span>
              </div>
              
              <button onClick={saveForm} disabled={isSaving} className="w-full py-4 rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-70" style={{ background: "linear-gradient(90deg, #4F46E5, #818CF8)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isSaving ? "Saving…" : "Save Food Item"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}