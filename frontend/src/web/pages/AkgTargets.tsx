import { useEffect, useState } from "react";
import { Plus, Save, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { api, errorMessage as toMessage, type AKGRow } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { EmptyState, ErrorBanner, PageHeader, Panel, Spinner } from "../components/ui";

const COLS: { key: keyof AKGRow; label: string; unit: string; width: string }[] = [
  { key: "ageGroup", label: "Age group", unit: "", width: "w-40" },
  { key: "gender", label: "Sex", unit: "", width: "w-20" },
  { key: "energy", label: "Energy", unit: "kcal", width: "w-24" },
  { key: "protein", label: "Protein", unit: "g", width: "w-24" },
  { key: "fat", label: "Fat", unit: "g", width: "w-24" },
  { key: "carbs", label: "Carbs", unit: "g", width: "w-24" },
  { key: "vitA", label: "Vit A", unit: "mcg", width: "w-24" },
  { key: "vitC", label: "Vit C", unit: "mg", width: "w-24" },
  { key: "iron", label: "Iron", unit: "mg", width: "w-24" },
  { key: "calcium", label: "Calcium", unit: "mg", width: "w-24" },
];

const emptyRow = (): AKGRow => ({ ageGroup: "", gender: "M/F", energy: "", protein: "", fat: "", carbs: "", vitA: null, vitC: null, iron: null, calcium: null });

export function AkgTargets() {
  const [rows, setRows] = useState<AKGRow[]>([]);
  const [original, setOriginal] = useState<AKGRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const load = () =>
    api.admin.getAkg().then((d) => { setRows(d); setOriginal(d); });

  useEffect(() => {
    load().catch((err) => setError(toMessage(err))).finally(() => setIsLoading(false));
  }, []);

  const dirty = JSON.stringify(rows) !== JSON.stringify(original);

  const update = (i: number, key: keyof AKGRow, value: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const save = async () => {
    const invalid = rows.find((r) => !r.ageGroup.trim() || !r.energy || !r.protein || !r.fat || !r.carbs);
    if (invalid) { setError("Every row needs an age group and energy/protein/fat/carbs values."); return; }
    setIsSaving(true);
    setError("");
    try {
      await api.admin.updateAkg(rows.map((r) => ({ ...r, vitA: r.vitA || null, vitC: r.vitC || null, iron: r.iron || null, calcium: r.calcium || null })));
      await load();
      setSavedAt(new Date());
    } catch (err) {
      setError(toMessage(err, "Failed to save AKG targets."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="AKG Nutrition Targets"
        description="Angka Kecukupan Gizi 2019 — daily targets by age group. The Food Diary compares each child's intake against the row that matches their age."
        actions={
          <>
            {dirty && <Button variant="ghost" onClick={() => setRows(original)}><RotateCcw size={14} /> Discard</Button>}
            <Button variant="outline" onClick={() => setRows((p) => [...p, emptyRow()])}><Plus size={14} /> Add row</Button>
            <Button onClick={save} disabled={!dirty || isSaving}>{isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Save changes</Button>
          </>
        }
      />
      <ErrorBanner message={error} />
      {savedAt && !dirty && <p className="text-xs text-emerald-600 font-semibold mb-3">Saved at {savedAt.toLocaleTimeString()}. Parents' targets update immediately.</p>}

      <Panel description="Age groups are matched by the numbers in the label: '6-11 bulan' = months 6–11, '1-3 tahun' = months 12–47. Leave micronutrients blank if unknown.">
        {isLoading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No AKG rows" action={<Button onClick={() => setRows([emptyRow()])}>Add first row</Button>} /> : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <Table>
              <TableHeader><TableRow>{COLS.map((c) => <TableHead key={c.key}>{c.label}{c.unit && <span className="normal-case font-normal"> ({c.unit})</span>}</TableHead>)}<TableHead /></TableRow></TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.id ?? `new-${i}`}>
                    {COLS.map((c) => (
                      <TableCell key={c.key} className={c.width}>
                        <Input value={(r[c.key] as string | null) ?? ""} onChange={(e) => update(i, c.key, e.target.value)} className="h-8 bg-white font-mono text-xs" placeholder={c.key === "ageGroup" ? "e.g. 1-3 tahun" : "—"} />
                      </TableCell>
                    ))}
                    <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))} aria-label="Remove row"><Trash2 size={14} className="text-red-600" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </>
  );
}
