import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { api, errorMessage as toMessage, type FoodItem } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../app/components/ui/dialog";
import { cn } from "../../app/components/ui/utils";
import { EmptyState, ErrorBanner, PageHeader, Panel, Pill, Spinner } from "../components/ui";

const CATEGORIES = ["Protein", "Main Course", "Fruit", "Vegetable", "Dairy", "Snack", "Carbs", "Other"];
const PAGE = 50;
type Form = Omit<FoodItem, "id">;
const empty: Form = { name: "", category: "Protein", energy: 0, protein: 0, carbs: 0, fat: 0, safe: true };

export function Foods() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [safeOnly, setSafeOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<{ id: number | null; form: Form } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => { const t = setTimeout(() => { setQuery(q); setPage(0); }, 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api.admin.listFoods({ q: query || undefined, category: category || undefined, safe_only: safeOnly || undefined, limit: PAGE + 1, offset: page * PAGE })
      .then((d) => { if (!cancelled) setRows(d); })
      .catch((err) => { if (!cancelled) setError(toMessage(err)); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [query, category, safeOnly, page, reload]);

  const hasNext = rows.length > PAGE;
  const visible = rows.slice(0, PAGE);

  const save = async () => {
    if (!editing) return;
    if (!editing.form.name.trim()) { setError("Name is required."); return; }
    setIsSaving(true);
    setError("");
    try {
      const payload = { ...editing.form, name: editing.form.name.trim() };
      if (editing.id === null) await api.admin.createFood(payload);
      else await api.admin.updateFood(editing.id, payload);
      setEditing(null);
      setReload((k) => k + 1);
    } catch (err) {
      setError(toMessage(err, "Failed to save food."));
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (f: FoodItem) => {
    if (!window.confirm(`Delete "${f.name}"? Parents' past meal entries keep their nutrient snapshot.`)) return;
    try {
      await api.admin.deleteFood(f.id);
      setReload((k) => k + 1);
    } catch (err) {
      setError(toMessage(err));
    }
  };

  const num = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setEditing((s) => s && ({ ...s, form: { ...s.form, [k]: parseFloat(e.target.value) || 0 } }));

  return (
    <>
      <PageHeader title="Food Database" description="Indonesian food composition table used by the parent food diary. Values are per serving." actions={<Button onClick={() => setEditing({ id: null, form: empty })}><Plus size={14} /> Add food</Button>} />
      <ErrorBanner message={error} />

      <Panel className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — every word must match, e.g. 'bubur ayam'" className="pl-9 bg-white" />
          </div>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(0); }} className="h-9 rounded-md border bg-white px-3 text-sm">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={safeOnly} onChange={(e) => { setSafeOnly(e.target.checked); setPage(0); }} /> Toddler-safe only</label>
        </div>
      </Panel>

      <Panel
        title={isLoading ? "Loading…" : `${visible.length}${hasNext ? "+" : ""} foods`}
        description={`Page ${page + 1}`}
        actions={<div className="flex gap-1"><Button variant="outline" size="icon" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={16} /></Button><Button variant="outline" size="icon" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}><ChevronRight size={16} /></Button></div>}
      >
        {isLoading ? <Spinner /> : visible.length === 0 ? <EmptyState title="No foods match" /> : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Energy (kcal)</TableHead><TableHead className="text-right">Protein (g)</TableHead><TableHead className="text-right">Carbs (g)</TableHead><TableHead className="text-right">Fat (g)</TableHead><TableHead>Toddler-safe</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {visible.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-semibold max-w-[360px] truncate">{f.name}</TableCell>
                    <TableCell><Pill>{f.category}</Pill></TableCell>
                    <TableCell className="text-right font-mono">{f.energy}</TableCell>
                    <TableCell className="text-right font-mono">{f.protein}</TableCell>
                    <TableCell className="text-right font-mono">{f.carbs}</TableCell>
                    <TableCell className="text-right font-mono">{f.fat}</TableCell>
                    <TableCell><Pill className={f.safe ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}>{f.safe ? "Safe" : "Flagged"}</Pill></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => setEditing({ id: f.id, form: { name: f.name, category: f.category, energy: f.energy, protein: f.protein, carbs: f.carbs, fat: f.fat, safe: f.safe } })} aria-label="Edit"><Pencil size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(f)} aria-label="Delete"><Trash2 size={14} className="text-red-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Dialog open={!!editing} onOpenChange={(o) => !o && !isSaving && setEditing(null)}>
        <DialogContent className="hm-portal sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id === null ? "Add food" : "Edit food"}</DialogTitle>
            <DialogDescription>Nutrient values per serving. Flag foods that are not suitable for toddlers.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <label className="text-xs font-bold text-muted-foreground">Name<Input className="mt-1 bg-white" value={editing.form.name} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, name: e.target.value } })} /></label>
              <label className="text-xs font-bold text-muted-foreground">Category
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => <button key={c} type="button" onClick={() => setEditing({ ...editing, form: { ...editing.form, category: c } })} className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold", editing.form.category === c ? "bg-primary text-primary-foreground border-primary" : "bg-white")}>{c}</button>)}
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["energy", "protein", "carbs", "fat"] as const).map((k) => (
                  <label key={k} className="text-xs font-bold text-muted-foreground capitalize">{k === "energy" ? "Energy (kcal)" : `${k} (g)`}<Input type="number" min={0} step="0.1" className="mt-1 bg-white font-mono" value={editing.form[k]} onChange={num(k)} /></label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editing.form.safe} onChange={(e) => setEditing({ ...editing, form: { ...editing.form, safe: e.target.checked } })} /> Safe for toddlers</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={isSaving}>Cancel</Button>
            <Button onClick={save} disabled={isSaving}>{isSaving && <Loader2 className="animate-spin" size={14} />} Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
