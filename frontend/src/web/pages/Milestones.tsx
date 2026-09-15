import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { api, errorMessage as toMessage, type Milestone } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../app/components/ui/dialog";
import { cn } from "../../app/components/ui/utils";
import { EmptyState, ErrorBanner, PageHeader, Panel, Pill, Spinner } from "../components/ui";

const DOMAINS = ["Motorik Kasar", "Motorik Halus", "Bicara & Bahasa", "Sosialisasi", "Kemandirian"];
const BRACKETS = [
  { label: "0 - 6 Months", min: 0, max: 6 }, { label: "6 - 12 Months", min: 6, max: 12 }, { label: "12 - 24 Months", min: 12, max: 24 },
  { label: "2 - 3 Years", min: 24, max: 36 }, { label: "3 - 4 Years", min: 36, max: 48 }, { label: "4 - 5 Years", min: 48, max: 60 },
];
type Form = Omit<Milestone, "id">;
const empty: Form = { min_months: 0, max_months: 6, age_label: "0 - 6 Months", domain: "Motorik Kasar", question: "", expected: "", active: true, sort_order: 0 };

export function Milestones() {
  const [rows, setRows] = useState<Milestone[]>([]);
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ id: number | null; form: Form } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api.admin.listMilestones().then(setRows).catch((err) => setError(toMessage(err))).finally(() => setIsLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const filtered = rows.filter((m) => !domain || m.domain === domain);
    const labels = Array.from(new Set(filtered.map((m) => m.age_label)));
    return labels.map((l) => ({ label: l, items: filtered.filter((m) => m.age_label === l) })).sort((a, b) => a.items[0].min_months - b.items[0].min_months);
  }, [rows, domain]);

  const persist = async (id: number | null, form: Form) => {
    const payload = { ...form, question: form.question.trim(), expected: form.expected?.trim() || null };
    return id === null ? api.admin.createMilestone(payload) : api.admin.updateMilestone(id, payload);
  };

  const save = async () => {
    if (!editing || editing.form.question.trim().length < 3) { setError("Question must be at least 3 characters."); return; }
    setIsSaving(true); setError("");
    try {
      const saved = await persist(editing.id, editing.form);
      setRows((p) => (editing.id === null ? [...p, saved] : p.map((m) => (m.id === editing.id ? saved : m))));
      setEditing(null);
    } catch (err) { setError(toMessage(err)); } finally { setIsSaving(false); }
  };

  const toggle = async (m: Milestone) => {
    try {
      const { id, ...rest } = m;
      const saved = await persist(id, { ...rest, active: !m.active });
      setRows((p) => p.map((x) => (x.id === id ? saved : x)));
    } catch (err) { setError(toMessage(err)); }
  };

  const remove = async (m: Milestone) => {
    if (!window.confirm(`Delete "${m.question}"? Parents' answers to it will be removed.`)) return;
    try { await api.admin.deleteMilestone(m.id); setRows((p) => p.filter((x) => x.id !== m.id)); } catch (err) { setError(toMessage(err)); }
  };

  return (
    <>
      <PageHeader
        title="KPSP Milestones"
        description="Kuesioner Pra Skrining Perkembangan. Parents answer the active questions for their child's age bracket; 90%+ yes = Sesuai, 70–89% = Meragukan, below = Penyimpangan."
        actions={<Button onClick={() => setEditing({ id: null, form: empty })}><Plus size={14} /> Add question</Button>}
      />
      <ErrorBanner message={error} />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {["", ...DOMAINS].map((d) => (
          <button key={d || "all"} onClick={() => setDomain(d)} className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", domain === d ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-accent")}>{d || "All domains"}</button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">{rows.filter((m) => m.active).length} active · {rows.length} total</span>
      </div>

      {isLoading ? <Spinner /> : grouped.length === 0 ? <Panel><EmptyState title="No questions" description="Load reference data from System or add one." /></Panel> : (
        <div className="grid gap-4">
          {grouped.map((g) => (
            <Panel key={g.label} title={g.label} description={`${g.items.length} question${g.items.length === 1 ? "" : "s"} · ages ${g.items[0].min_months}–${g.items[0].max_months - 1} months`}>
              <div className="overflow-x-auto -mx-5 -mb-5">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-44">Domain</TableHead><TableHead>Question</TableHead><TableHead>Expected</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {g.items.map((m) => (
                      <TableRow key={m.id} className={cn(!m.active && "opacity-60")}>
                        <TableCell><Pill>{m.domain}</Pill></TableCell>
                        <TableCell className="font-semibold">{m.question}</TableCell>
                        <TableCell className="text-muted-foreground">{m.expected || "Ya"}</TableCell>
                        <TableCell><Pill className={m.active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>{m.active ? "Active" : "Inactive"}</Pill></TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" title={m.active ? "Deactivate" : "Activate"} onClick={() => toggle(m)}>{m.active ? <EyeOff size={14} /> : <Eye size={14} />}</Button>
                          <Button variant="ghost" size="icon" onClick={() => { const { id, ...rest } = m; setEditing({ id, form: { ...rest, expected: rest.expected ?? "" } }); }}><Pencil size={14} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(m)}><Trash2 size={14} className="text-red-600" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && !isSaving && setEditing(null)}>
        <DialogContent className="hm-portal sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id === null ? "Add question" : "Edit question"}</DialogTitle><DialogDescription>Write the question in Indonesian as parents will read it.</DialogDescription></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1">Age bracket</p>
                <div className="flex flex-wrap gap-1.5">
                  {BRACKETS.map((b) => <button key={b.label} type="button" onClick={() => setEditing({ ...editing, form: { ...editing.form, min_months: b.min, max_months: b.max, age_label: b.label } })} className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", editing.form.min_months === b.min ? "bg-primary text-primary-foreground border-primary" : "bg-white")}>{b.label}</button>)}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground mb-1">Domain</p>
                <div className="flex flex-wrap gap-1.5">
                  {DOMAINS.map((d) => <button key={d} type="button" onClick={() => setEditing({ ...editing, form: { ...editing.form, domain: d } })} className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", editing.form.domain === d ? "bg-primary text-primary-foreground border-primary" : "bg-white")}>{d}</button>)}
                </div>
              </div>
              <label className="text-xs font-bold text-muted-foreground">Question<textarea className="mt-1 w-full rounded-md border bg-white p-2 text-sm" rows={3} value={editing.form.question} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, question: e.target.value } })} /></label>
              <label className="text-xs font-bold text-muted-foreground">Expected response (optional)<Input className="mt-1 bg-white" value={editing.form.expected ?? ""} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, expected: e.target.value } })} /></label>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editing.form.active} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, active: e.target.checked } })} /> Active (visible to parents)</label>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)} disabled={isSaving}>Cancel</Button><Button onClick={save} disabled={isSaving}>{isSaving && <Loader2 className="animate-spin" size={14} />} Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
