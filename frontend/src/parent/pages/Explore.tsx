import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Search } from "lucide-react";
import { api, errorMessage, type ArticleView } from "../../lib/api";
import { Body, Card, Empty, ErrorBox, Icon, Loading, Pill, YellowBar } from "../components/ui";
import { CATEGORY_ICON, CATEGORY_LABEL, fmtDate, type Tone } from "../../lib/id";
import { cn } from "../../app/components/ui/utils";

const CATEGORIES = ["All", "Growth", "Nutrition", "Development", "Immunization"];
const TONE: Record<string, Tone> = { Growth: "coral", Nutrition: "teal", Development: "violet", Immunization: "yellow" };

export function Explore() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ArticleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.parent
      .listArticles()
      .then(setRows)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => rows.filter((a) => (category === "All" || a.category === category) && (!q.trim() || `${a.title} ${a.summary}`.toLowerCase().includes(q.trim().toLowerCase()))), [rows, category, q]);

  return (
    <>
      <YellowBar title="Tips & artikel" subtitle="Bacaan singkat dari tim kesehatan SIMBA" onBack={() => navigate(-1)} />
      <Body>
        <label className="sb-hard-sm rounded-full bg-white flex items-center gap-2.5 px-4 min-h-[54px] mb-3">
          <Search size={22} className="text-[var(--muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" className="flex-1 bg-transparent outline-none text-[16px] font-bold py-3" />
        </label>
        <div className="flex gap-2 overflow-x-auto sb-scroll pb-3">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={cn("shrink-0 sb-outline rounded-full px-4 py-2.5 text-[14px] font-extrabold", category === c ? "bg-[var(--ink)] text-[var(--yellow)]" : "bg-white")}>
              {c === "All" ? "Semua" : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <ErrorBox message={error} />
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Card>
            <Empty icon="book-open" title="Belum ada artikel" body="Coba topik lain atau kosongkan pencarian." />
          </Card>
        ) : (
          filtered.map((a) => (
            <Card key={a.id} onClick={() => navigate(`/artikel/${a.id}`)}>
              <div className="flex items-center gap-2 mb-2">
                <Pill tone={TONE[a.category] ?? "muted"}>{CATEGORY_LABEL[a.category] ?? a.category}</Pill>
                <span className="text-[13px] text-[var(--muted)]">{a.read_time_min} menit baca</span>
              </div>
              <p className="sb-display text-[18px] leading-6">{a.title}</p>
              <p className="text-[14px] text-[var(--muted)] leading-5 mt-1 line-clamp-2">{a.summary}</p>
              <p className="flex items-center gap-1 text-[14px] font-extrabold text-[var(--coral)] mt-2">
                <Icon name={CATEGORY_ICON[a.category] ?? "book-open"} size={16} /> Baca ›
              </p>
            </Card>
          ))
        )}
      </Body>
    </>
  );
}

export function Article() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.parent
      .article(Number(id))
      .then(setArticle)
      .catch((err) => setError(errorMessage(err, "Artikel tidak ditemukan.")));
  }, [id]);

  return (
    <>
      <YellowBar title="Artikel" onBack={() => navigate(-1)} />
      <Body>
        <ErrorBox message={error} />
        {!article && !error ? (
          <Loading />
        ) : article ? (
          <article>
            <Pill tone="coral">{CATEGORY_LABEL[article.category] ?? article.category}</Pill>
            <h1 className="sb-display text-[26px] md:text-[30px] leading-tight mt-2">{article.title}</h1>
            <p className="text-[13px] text-[var(--muted)] mt-1.5">
              {article.author} · {article.read_time_min} menit baca · {fmtDate(article.updated_at)}
            </p>
            <p className="text-[17px] font-extrabold leading-[25px] mt-4">{article.summary}</p>
            {(article.body ?? "")
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((p, i) => (
                <p key={i} className="text-[16px] leading-[26px] mt-3">
                  {p.trim()}
                </p>
              ))}
          </article>
        ) : null}
      </Body>
    </>
  );
}
