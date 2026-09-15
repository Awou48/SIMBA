import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Play, MessageCircle, ThumbsUp, MapPin, Clock, X, Loader2 } from "lucide-react";
import { api, type ArticleView } from "../../../lib/api";
import { useChildren } from "../../ChildContext";
import { FrameModal } from "../FrameModal";

const categoryColors: Record<string, { color: string; bg: string; emoji: string }> = {
  Growth: { color: "#4F46E5", bg: "#EEF2FF", emoji: "📈" },
  Nutrition: { color: "#F47B20", bg: "#FFF0E0", emoji: "🥗" },
  Development: { color: "#9B8BF4", bg: "#F0EDFF", emoji: "🏁" },
  Immunization: { color: "#5CC8C2", bg: "#E8F9F8", emoji: "💉" },
};

const videos = [
  { id: 1, title: "5 Finger Foods for Toddlers", duration: "4:32", thumb: "https://images.unsplash.com/photo-1610415946201-295954703dd9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMHRvZGRsZXIlMjBmb29kJTIwZnJ1aXRzJTIwdmVnZXRhYmxlc3xlbnwxfHx8fDE3NzgyNTIxODl8MA&ixlib=rb-4.1.0&q=80&w=1080" },
  { id: 2, title: "Building Healthy Habits Early", duration: "6:15", thumb: "https://images.unsplash.com/photo-1592783074241-ec3763189417?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXJlbnQlMjB0b2RkbGVyJTIwY2hpbGQlMjBncm93dGglMjBoZWFsdGh5fGVufDF8fHx8MTc3ODI1MjE4OXww&ixlib=rb-4.1.0&q=80&w=1080" },
  { id: 3, title: "Iron-Rich Meals for Toddlers", duration: "3:48", thumb: "https://images.unsplash.com/photo-1636044992119-be0892f9de94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWxtb24lMjByaWNlJTIwaGVhbHRoeSUyMG1lYWwlMjBwbGF0ZXxlbnwxfHx8fDE3NzgyNTIxOTR8MA&ixlib=rb-4.1.0&q=80&w=1080" },
];


const forumQuestions = [
  { id: 1, question: "My 2-year-old refuses to eat vegetables. Any tips?", answers: 12, tag: "👨‍⚕️ Doctor", time: "2h ago", liked: 24 },
  { id: 2, question: "At what age should I introduce solid protein foods?", answers: 8, tag: "👤 Parent", time: "5h ago", liked: 15 },
  { id: 3, question: "Is it normal for toddlers to have growth spurts?", answers: 21, tag: "👨‍⚕️ Doctor", time: "1d ago", liked: 38 },
];

export function ExploreScreen() {
  const navigate = useNavigate();
  const { activeChild } = useChildren();
  const childName = activeChild?.name ?? "your toddler";

  const [articles, setArticles] = useState<ArticleView[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reading, setReading] = useState<ArticleView | null>(null);

  useEffect(() => {
    api.parent
      .listArticles()
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setArticlesLoading(false));
  }, []);

  const visibleArticles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? articles.filter((a) => `${a.title} ${a.summary} ${a.category}`.toLowerCase().includes(q)) : articles;
  }, [articles, search]);


  return (
    <div className="flex flex-col min-h-screen pb-20" style={{ background: "#FFF8EF" }}>
      <div
        className="px-4 pt-4 pb-5"
        style={{ background: "linear-gradient(160deg, #2D3047 0%, #3D4060 100%)", borderRadius: "0 0 24px 24px" }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>
          🌍 Explore
        </h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
          Discover content tailored for <span className="text-[#FFC72C] font-bold">{childName}</span>
        </p>
        <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-2xl transition-colors focus-within:bg-white/20" style={{ background: "rgba(255,255,255,0.12)" }}>
          <span style={{ fontSize: "14px" }}>🔍</span>
          <input
            placeholder="Search articles, recipes, tips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white placeholder-white/60"
            style={{ fontSize: "13px", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}
          />
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>🎬 Discover</h3>
            <button style={{ fontSize: "11px", color: "#F47B20", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>See all →</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {videos.map(({ id, title, duration, thumb }) => (
              <div key={id} className="flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-transform active:scale-95" style={{ width: 160, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                <div className="relative" style={{ height: 100 }}>
                  <img src={thumb} alt={title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center transition-colors hover:bg-black/40" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="rounded-full flex items-center justify-center shadow-lg" style={{ width: 36, height: 36, background: "rgba(255,255,255,0.9)" }}>
                      <Play size={16} style={{ color: "#F47B20" }} fill="#F47B20" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded backdrop-blur-md" style={{ background: "rgba(0,0,0,0.6)", fontSize: "9px", color: "white", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                    {duration}
                  </span>
                </div>
                <div className="p-2" style={{ background: "white" }}>
                  <p style={{ fontSize: "10px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.3 }}>{title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>💡 Insights</h3>
            <span style={{ fontSize: "11px", color: "#9BA3B8", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>{articles.length} article{articles.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex flex-col gap-3">
            {articlesLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={20} style={{ color: "#F47B20" }} /></div>
            ) : visibleArticles.length === 0 ? (
              <p className="text-center py-4" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>
                {search ? `No articles match "${search}".` : "No articles published yet."}
              </p>
            ) : (
              visibleArticles.map((article) => {
                const c = categoryColors[article.category] ?? { color: "#717182", bg: "#F5F5F5", emoji: "📄" };
                return (
                  <button key={article.id} onClick={() => setReading(article)} className="flex gap-3 rounded-2xl overflow-hidden text-left transition-transform active:scale-95" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                    <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 80, minHeight: 80, background: c.bg, fontSize: 30 }}>{c.emoji}</div>
                    <div className="flex-1 px-3 py-3 flex flex-col justify-center gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color, fontSize: "9px", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>{article.category}</span>
                        <span className="flex items-center gap-1" style={{ fontSize: "9px", fontWeight: 800, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}><Clock size={10} /> {article.read_time_min} min</span>
                      </div>
                      <p style={{ fontSize: "12px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.3 }}>{article.title}</p>
                      <p className="line-clamp-2" style={{ fontSize: "10px", fontWeight: 600, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", lineHeight: 1.4 }}>{article.summary}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <button
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95"
          style={{ background: "white", border: "2px dashed #5CC8C2", boxShadow: "0 2px 8px rgba(92,200,194,0.15)" }}
        >
          <MapPin size={18} style={{ color: "#5CC8C2" }} />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#5CC8C2", fontFamily: "'Nunito', sans-serif" }}>
            Kid-Friendly Restaurants Nearby 🍽️
          </span>
        </button>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>💬 Ask Forum</h3>
            <button style={{ fontSize: "11px", color: "#F47B20", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>View all →</button>
          </div>
          <div className="flex flex-col gap-3">
            {forumQuestions.map(({ id, question, answers, tag, time, liked }) => (
              <div key={id} className="rounded-2xl p-4 cursor-pointer transition-shadow hover:shadow-md" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.4, marginBottom: 12 }}>
                  {question}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 rounded-full" style={{ background: tag.includes("Doctor") ? "#E8F9F8" : "#F5F5F5", fontSize: "9px", fontWeight: 800, color: tag.includes("Doctor") ? "#5CC8C2" : "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>
                      {tag}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle size={14} style={{ color: "#9BA3B8" }} />
                      <span style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{answers} answers</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <ThumbsUp size={14} style={{ color: "#9BA3B8" }} />
                      <span style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{liked}</span>
                    </div>
                    <span style={{ fontSize: "10px", color: "#C0C4D0", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {reading && (
        <FrameModal onClose={() => setReading(null)}>
          <div className="w-full rounded-t-3xl p-5 flex flex-col gap-3" style={{ background: "white", maxHeight: "85%" }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="px-2 py-0.5 rounded-full" style={{ background: (categoryColors[reading.category] ?? { bg: "#F5F5F5" }).bg, color: (categoryColors[reading.category] ?? { color: "#717182" }).color, fontSize: "9px", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}>{reading.category}</span>
                <p style={{ fontSize: "17px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginTop: 6, lineHeight: 1.3 }}>{reading.title}</p>
                <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600, marginTop: 2 }}>
                  {reading.author} · {reading.read_time_min} min read · {new Date(reading.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <button onClick={() => setReading(null)} className="rounded-full p-1.5" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-3" style={{ maxHeight: 460 }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.6 }}>{reading.summary}</p>
              {(reading.body ?? "").split(/\n\s*\n/).filter(Boolean).map((para, i) => (
                <p key={i} style={{ fontSize: "13px", fontWeight: 600, color: "#4A4D63", fontFamily: "'Nunito', sans-serif", lineHeight: 1.7 }}>{para}</p>
              ))}
            </div>
          </div>
        </FrameModal>
      )}
    </div>
  );
}
