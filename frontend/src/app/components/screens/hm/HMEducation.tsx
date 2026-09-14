import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { X, Plus, Edit3, Trash2, Save, Eye, BookOpen, Loader2, AlertCircle } from "lucide-react";
import { api, errorMessage as toMessage, type Article } from "../../../../lib/api";
import { FrameModal } from "../../FrameModal";

type Form = Omit<Article, "id" | "created_at" | "updated_at">;

const categories = ["All", "Growth", "Nutrition", "Development", "Immunization"];
const categoryColors: Record<string, { color: string; bg: string }> = {
  Growth: { color: "#4F46E5", bg: "#EEF2FF" }, Nutrition: { color: "#F47B20", bg: "#FFF7ED" }, Development: { color: "#9B8BF4", bg: "#F0EDFF" }, Immunization: { color: "#5CC8C2", bg: "#E8F9F8" },
};

const emptyArticle: Form = { title: "", category: "Growth", author: "Tim SIMBA", read_time_min: 3, summary: "", body: "", published: false };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function HMEducation() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>([]);
  const [catFilter, setCatFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(emptyArticle);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.admin
      .listArticles()
      .then(setArticles)
      .catch((err) => setError(toMessage(err, "Failed to load articles.")))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = articles.filter((a) => catFilter === "All" || a.category === catFilter);

  const openAdd = () => { setEditId(null); setForm(emptyArticle); setShowForm(true); };
  const openEdit = (a: Article) => {
    setEditId(a.id);
    const { id: _i, created_at: _c, updated_at: _u, ...rest } = a;
    setForm({ ...rest, body: rest.body ?? "" });
    setShowForm(true);
  };

  const persist = async (id: number | null, data: Form) => {
    const payload = { ...data, title: data.title.trim(), summary: data.summary.trim(), body: data.body?.trim() || null };
    return id === null ? api.admin.createArticle(payload) : api.admin.updateArticle(id, payload);
  };

  const saveForm = async () => {
    if (form.title.trim().length < 3 || !form.summary.trim()) { setError("Title (3+ chars) and summary are required."); return; }
    setIsSaving(true);
    setError("");
    try {
      const saved = await persist(editId, form);
      setArticles((prev) => (editId === null ? [saved, ...prev] : prev.map((a) => (a.id === editId ? saved : a))));
      setShowForm(false);
    } catch (err) {
      setError(toMessage(err, "Failed to save the article."));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteArticle = async (a: Article) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    try {
      await api.admin.deleteArticle(a.id);
      setArticles((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      setError(toMessage(err));
    }
  };

  const togglePublish = async (a: Article) => {
    try {
      const { id, created_at: _c, updated_at: _u, ...rest } = a;
      const saved = await persist(id, { ...rest, published: !a.published });
      setArticles((prev) => prev.map((x) => (x.id === id ? saved : x)));
    } catch (err) {
      setError(toMessage(err));
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #5CC8C2 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}><X size={18} color="white" /></button>
          <div className="flex-1">
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>📚 Education</h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{articles.filter(a => a.published).length} published · {articles.filter(a => !a.published).length} draft</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.2)", fontSize: "12px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>
            <Plus size={13} /> New
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} className="flex-shrink-0 px-3 py-1.5 rounded-full transition-colors" style={{ background: catFilter === c ? "white" : "rgba(255,255,255,0.15)", color: catFilter === c ? "#1E3A8A" : "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px" }}>{c}</button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3 pb-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600 font-['Nunito']">{error}</p>
          </div>
        )}
        {isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={24} style={{ color: "#4F46E5" }} /></div>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center py-6" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>No articles in this category yet.</p>
        )}
        {filtered.map(article => {
          const cc = categoryColors[article.category] ?? { color: "#717182", bg: "#F5F5F5" };
          return (
            <div key={article.id} className="rounded-2xl p-4 transition-all" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", opacity: article.published ? 1 : 0.7 }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full" style={{ background: cc.bg, fontSize: "9px", fontWeight: 800, color: cc.color, fontFamily: "'Nunito', sans-serif" }}>{article.category}</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ background: article.published ? "#E8F9F8" : "#F5F5F5", fontSize: "9px", fontWeight: 800, color: article.published ? "#5CC8C2" : "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>{article.published ? "✅ Published" : "📝 Draft"}</span>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => openEdit(article)} className="rounded-xl p-1.5 transition-transform active:scale-95" style={{ background: "#EEF2FF" }}><Edit3 size={13} style={{ color: "#4F46E5" }} /></button>
                  <button onClick={() => deleteArticle(article)} className="rounded-xl p-1.5 transition-transform active:scale-95" style={{ background: "#FFF0F0" }}><Trash2 size={13} style={{ color: "#E53535" }} /></button>
                </div>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>{article.title}</p>
              <p style={{ fontSize: "11px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>{article.summary}</p>
              <div className="flex items-center justify-between">
                <p style={{ fontSize: "10px", color: "#C0C4D0", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>By {article.author} · {article.read_time_min} min · {fmtDate(article.updated_at)}</p>
                <button onClick={() => togglePublish(article)} className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-transform active:scale-95" style={{ background: article.published ? "#FFF7ED" : "#EEF2FF", fontSize: "10px", fontWeight: 800, color: article.published ? "#F47B20" : "#4F46E5", fontFamily: "'Nunito', sans-serif" }}>
                  {article.published ? <Eye size={11} /> : <BookOpen size={11} />} {article.published ? "Unpublish" : "Publish"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <FrameModal align="center" onClose={() => !isSaving && setShowForm(false)}>
          <div className="w-full rounded-3xl p-5 flex flex-col gap-3" style={{ background: "white", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>{editId ? "Edit Article" : "New Article"}</p>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-3" style={{ maxHeight: 560, paddingRight: 2 }}>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Article title..." className="px-4 py-3 rounded-2xl outline-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Category</label>
                <div className="flex gap-2 flex-wrap">
                  {categories.filter(c => c !== "All").map(c => (
                    <button key={c} onClick={() => setForm({ ...form, category: c })} className="px-3 py-1.5 rounded-full transition-colors" style={{ background: form.category === c ? "#4F46E5" : "#F5F5F5", color: form.category === c ? "white" : "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px" }}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Author</label>
                  <input value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="px-3 py-2.5 rounded-2xl outline-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Read time (min)</label>
                  <input type="number" min={1} max={60} value={form.read_time_min} onChange={e => setForm({ ...form, read_time_min: Math.max(1, parseInt(e.target.value) || 1) })} className="px-3 py-2.5 rounded-2xl outline-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Summary</label>
                <textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Brief description..." className="px-4 py-3 rounded-2xl outline-none resize-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif", height: 80 }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Body (shown to parents)</label>
                <textarea value={form.body ?? ""} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Full article text. Separate paragraphs with a blank line." className="px-4 py-3 rounded-2xl outline-none resize-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif", height: 140 }} />
              </div>
              <div className="flex items-center gap-3 py-2">
                <button onClick={() => setForm({ ...form, published: !form.published })} className="rounded-full transition-all" style={{ width: 46, height: 26, background: form.published ? "#5CC8C2" : "#E0E4EE", position: "relative" }}>
                  <div className="absolute rounded-full" style={{ width: 20, height: 20, background: "white", top: 3, left: form.published ? 23 : 3, transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                </button>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{form.published ? "Published ✅" : "Save as Draft 📝"}</span>
              </div>
              <button onClick={saveForm} disabled={isSaving} className="w-full py-4 rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-70" style={{ background: "linear-gradient(90deg, #1E3A8A, #5CC8C2)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(92,200,194,0.3)" }}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {isSaving ? "Saving…" : "Save Article"}
              </button>
            </div>
          </div>
        </FrameModal>
      )}
    </div>
  );
}