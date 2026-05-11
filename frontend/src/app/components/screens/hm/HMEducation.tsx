import { useState } from "react";
import { useNavigate } from "react-router";
import { X, Plus, Edit3, Trash2, Save, Eye, BookOpen } from "lucide-react";

interface Article { id: number; title: string; category: string; author: string; readTime: string; summary: string; published: boolean; date: string; }

const initialArticles: Article[] = [
  { id: 1, title: "Understanding Child Growth Charts", category: "Growth", author: "Dr. Santika", readTime: "4 min", summary: "A guide for parents on how to read WHO growth charts.", published: true, date: "May 5, 2026" },
  { id: 2, title: "Best Foods for Toddlers Aged 1–3", category: "Nutrition", author: "Nutr. Dewi", readTime: "6 min", summary: "Comprehensive list of nutritious foods recommended for toddlers.", published: true, date: "May 3, 2026" },
];

const categories = ["All", "Growth", "Nutrition", "Development", "Immunization"];
const categoryColors: Record<string, { color: string; bg: string }> = {
  Growth: { color: "#4F46E5", bg: "#EEF2FF" }, Nutrition: { color: "#F47B20", bg: "#FFF7ED" }, Development: { color: "#9B8BF4", bg: "#F0EDFF" }, Immunization: { color: "#5CC8C2", bg: "#E8F9F8" },
};

const emptyArticle: Omit<Article, "id"> = { title: "", category: "Growth", author: "Dr. Santika", readTime: "3 min", summary: "", published: false, date: "May 11, 2026" };

export function HMEducation() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [catFilter, setCatFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Article, "id">>(emptyArticle);

  const filtered = articles.filter(a => catFilter === "All" || a.category === catFilter);

  const openAdd  = () => { setEditId(null); setForm(emptyArticle); setShowForm(true); };
  const openEdit = (a: Article) => { setEditId(a.id); setForm({ ...a }); setShowForm(true); };
  const saveForm = () => {
    if (editId !== null) setArticles(prev => prev.map(a => a.id === editId ? { ...form, id: editId } : a));
    else setArticles(prev => [{ ...form, id: Date.now() }, ...prev]);
    setShowForm(false);
  };
  const deleteArticle = (id: number) => setArticles(prev => prev.filter(a => a.id !== id));
  const togglePublish = (id: number) => setArticles(prev => prev.map(a => a.id === id ? { ...a, published: !a.published } : a));

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
                  <button onClick={() => deleteArticle(article.id)} className="rounded-xl p-1.5 transition-transform active:scale-95" style={{ background: "#FFF0F0" }}><Trash2 size={13} style={{ color: "#E53535" }} /></button>
                </div>
              </div>
              <p style={{ fontSize: "14px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>{article.title}</p>
              <p style={{ fontSize: "11px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>{article.summary}</p>
              <div className="flex items-center justify-between">
                <p style={{ fontSize: "10px", color: "#C0C4D0", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>By {article.author} · {article.date}</p>
                <button onClick={() => togglePublish(article.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-transform active:scale-95" style={{ background: article.published ? "#FFF7ED" : "#EEF2FF", fontSize: "10px", fontWeight: 800, color: article.published ? "#F47B20" : "#4F46E5", fontFamily: "'Nunito', sans-serif" }}>
                  {article.published ? <Eye size={11} /> : <BookOpen size={11} />} {article.published ? "Unpublish" : "Publish"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,58,138,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-md rounded-3xl p-5 flex flex-col gap-3" style={{ background: "white", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", animation: "slideUp 0.3s ease-out forwards" }}>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>{editId ? "Edit Article" : "New Article"}</p>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-3" style={{ maxHeight: "65vh" }}>
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
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Summary</label>
                <textarea value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} placeholder="Brief description..." className="px-4 py-3 rounded-2xl outline-none resize-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif", height: 80 }} />
              </div>
              <div className="flex items-center gap-3 py-2">
                <button onClick={() => setForm({ ...form, published: !form.published })} className="rounded-full transition-all" style={{ width: 46, height: 26, background: form.published ? "#5CC8C2" : "#E0E4EE", position: "relative" }}>
                  <div className="absolute rounded-full" style={{ width: 20, height: 20, background: "white", top: 3, left: form.published ? 23 : 3, transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
                </button>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{form.published ? "Published ✅" : "Save as Draft 📝"}</span>
              </div>
              <button onClick={saveForm} className="w-full py-4 rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2 mt-2" style={{ background: "linear-gradient(90deg, #1E3A8A, #5CC8C2)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(92,200,194,0.3)" }}>
                <Save size={16} /> Save Article
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}