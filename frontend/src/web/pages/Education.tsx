import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Eye, EyeOff, Save } from "lucide-react";
import { api, errorMessage as toMessage, type Article } from "../../lib/api";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { cn } from "../../app/components/ui/utils";
import { EmptyState, ErrorBanner, PageHeader, Panel, Pill, Spinner, fmtDate } from "../components/ui";

const CATEGORIES = ["Growth", "Nutrition", "Development", "Immunization"];
type Form = Omit<Article, "id" | "created_at" | "updated_at">;
const empty: Form = { title: "", category: "Growth", author: "Tim SIMBA", read_time_min: 3, summary: "", body: "", published: false };

/** Two-pane editor: list on the left, editor/preview on the right. */
export function Education() {
  const [rows, setRows] = useState<Article[]>([]);
  const [selected, setSelected] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    api.admin.listArticles().then((d) => { setRows(d); if (d.length) select(d[0]); }).catch((err) => setError(toMessage(err))).finally(() => setIsLoading(false));
  }, []);

  const select = (a: Article) => {
    const { id: _i, created_at: _c, updated_at: _u, ...rest } = a;
    setSelected(a.id);
    setForm({ ...rest, body: rest.body ?? "" });
    setPreview(false);
  };
  const startNew = () => { setSelected("new"); setForm(empty); setPreview(false); };

  const current = rows.find((r) => r.id === selected);
  const dirty = current ? JSON.stringify({ ...form, body: form.body || "" }) !== JSON.stringify({ title: current.title, category: current.category, author: current.author, read_time_min: current.read_time_min, summary: current.summary, body: current.body ?? "", published: current.published }) : selected === "new";

  const save = async (override?: Partial<Form>) => {
    const data = { ...form, ...override, title: form.title.trim(), summary: form.summary.trim(), body: form.body?.trim() || null };
    if (data.title.length < 3 || !data.summary) { setError("Title (3+ chars) and summary are required."); return; }
    setIsSaving(true); setError("");
    try {
      const saved = selected === "new" ? await api.admin.createArticle(data) : await api.admin.updateArticle(selected as number, data);
      setRows((p) => (selected === "new" ? [saved, ...p] : p.map((a) => (a.id === saved.id ? saved : a))));
      select(saved);
    } catch (err) { setError(toMessage(err)); } finally { setIsSaving(false); }
  };

  const remove = async () => {
    if (!current || !window.confirm(`Delete "${current.title}"?`)) return;
    try {
      await api.admin.deleteArticle(current.id);
      const rest = rows.filter((a) => a.id !== current.id);
      setRows(rest);
      rest.length ? select(rest[0]) : (setSelected(null), setForm(empty));
    } catch (err) { setError(toMessage(err)); }
  };

  return (
    <>
      <PageHeader title="Education" description="Articles shown to parents in the app's Explore tab. Drafts are only visible here." actions={<Button onClick={startNew}><Plus size={14} /> New article</Button>} />
      <ErrorBanner message={error} />

      {isLoading ? <Spinner /> : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Panel className="lg:col-span-2" title={`${rows.length} article${rows.length === 1 ? "" : "s"}`} description={`${rows.filter((a) => a.published).length} published`}>
            {rows.length === 0 && selected !== "new" ? <EmptyState title="No articles yet" action={<Button onClick={startNew}>Write the first one</Button>} /> : (
              <ul className="-mx-5 -mb-5 divide-y">
                {selected === "new" && <li className="px-5 py-3 bg-accent text-sm font-semibold">✍️ New article (unsaved)</li>}
                {rows.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => select(a)} className={cn("w-full text-left px-5 py-3 hover:bg-accent/60 transition-colors", selected === a.id && "bg-accent")}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Pill>{a.category}</Pill>
                        <Pill className={a.published ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>{a.published ? "Published" : "Draft"}</Pill>
                        <span className="ml-auto text-[11px] text-muted-foreground">{fmtDate(a.updated_at)}</span>
                      </div>
                      <p className="text-sm font-bold leading-snug">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{a.summary}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            className="lg:col-span-3"
            title={selected === "new" ? "New article" : current ? "Edit article" : "Select an article"}
            description={current ? `By ${current.author} · created ${fmtDate(current.created_at)} · updated ${fmtDate(current.updated_at)}` : undefined}
            actions={selected !== null && (
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>{preview ? "Edit" : "Preview"}</Button>
                {current && <Button variant="outline" size="sm" onClick={() => save({ published: !form.published })} disabled={isSaving}>{form.published ? <><EyeOff size={14} /> Unpublish</> : <><Eye size={14} /> Publish</>}</Button>}
                {current && <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete"><Trash2 size={14} className="text-red-600" /></Button>}
                <Button size="sm" onClick={() => save()} disabled={isSaving || !dirty}>{isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save</Button>
              </div>
            )}
          >
            {selected === null ? <EmptyState title="Nothing selected" /> : preview ? (
              <article className="prose-sm max-w-none">
                <Pill>{form.category}</Pill>
                <h2 className="text-xl font-extrabold mt-2">{form.title || "Untitled"}</h2>
                <p className="text-xs text-muted-foreground">{form.author} · {form.read_time_min} min read</p>
                <p className="mt-3 font-semibold">{form.summary}</p>
                {(form.body ?? "").split(/\n\s*\n/).filter(Boolean).map((p, i) => <p key={i} className="mt-3 text-sm leading-relaxed text-foreground/85">{p}</p>)}
              </article>
            ) : (
              <div className="grid gap-3">
                <label className="text-xs font-bold text-muted-foreground">Title<Input className="mt-1 bg-white text-base font-semibold" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-bold text-muted-foreground">Category
                    <select className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                  </label>
                  <label className="text-xs font-bold text-muted-foreground">Author<Input className="mt-1 bg-white" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label>
                  <label className="text-xs font-bold text-muted-foreground">Read time (min)<Input type="number" min={1} max={60} className="mt-1 bg-white" value={form.read_time_min} onChange={(e) => setForm({ ...form, read_time_min: Math.max(1, parseInt(e.target.value) || 1) })} /></label>
                </div>
                <label className="text-xs font-bold text-muted-foreground">Summary<textarea rows={2} className="mt-1 w-full rounded-md border bg-white p-2 text-sm" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
                <label className="text-xs font-bold text-muted-foreground">Body <span className="font-normal">(blank line = new paragraph)</span><textarea rows={14} className="mt-1 w-full rounded-md border bg-white p-3 text-sm leading-relaxed" value={form.body ?? ""} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Published (visible to parents)</label>
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
