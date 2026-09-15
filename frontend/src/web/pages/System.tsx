import { useEffect, useState } from "react";
import { Crown, Stethoscope, RefreshCw, Loader2, Plus, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { api, errorMessage as toMessage, type AdminInfo, type SystemSummary } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../app/components/ui/dialog";
import { EmptyState, ErrorBanner, PageHeader, Panel, Pill, Spinner, StatCard, fmtDate } from "../components/ui";

const COUNT_LABELS: Record<string, string> = { parents: "Parents", children: "Children", measurements: "Measurements", meals: "Meals logged", milestone_answers: "KPSP answers", health_events: "Calendar events", admins: "Admin accounts" };
const REF_LABELS: Record<string, string> = { foods: "Foods", akg_targets: "AKG rows", growth_standards: "WHO curve points", milestones: "KPSP questions", articles: "Articles" };

export function System() {
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [me, setMe] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<Record<string, number> | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", is_superadmin: false });
  const [isSaving, setIsSaving] = useState(false);

  const load = () => Promise.all([api.admin.systemSummary(), api.admin.listAdmins(), api.admin.me()]).then(([s, a, m]) => { setSummary(s); setAdmins(a); setMe(m); });
  useEffect(() => { load().catch((err) => setError(toMessage(err))).finally(() => setIsLoading(false)); }, []);

  const seed = async () => {
    if (!window.confirm("Load reference data into any table that is still empty? Existing rows are never changed.")) return;
    setSeeding(true); setError("");
    try { setSeedResult(await api.admin.seedReferenceData()); setSummary(await api.admin.systemSummary()); } catch (err) { setError(toMessage(err)); } finally { setSeeding(false); }
  };

  const createAdmin = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) { setError("Name, email and a password of 8+ characters are required."); return; }
    setIsSaving(true); setError("");
    try {
      const created = await api.admin.registerAdmin({ ...form, name: form.name.trim(), email: form.email.trim() });
      setAdmins((p) => [...p, created]);
      setForm({ name: "", email: "", password: "", is_superadmin: false });
      setAdding(false);
    } catch (err) { setError(toMessage(err, "Could not create the account.")); } finally { setIsSaving(false); }
  };

  if (isLoading) return <Spinner />;
  const refComplete = summary ? Object.values(summary.reference).every((n) => n > 0) : false;

  return (
    <>
      <PageHeader title="System" description={`SIMBA v${summary?.version ?? "…"} · signed in as ${me?.name ?? "…"}${me?.is_superadmin ? " (superadmin)" : ""}`} />
      <ErrorBanner message={error} />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <StatCard icon={<Database size={18} />} label="Database" value={summary.database.split(" · ")[0]} hint={summary.database.split(" · ")[1]} />
          <StatCard label="Reference data" value={refComplete ? "Complete" : "Incomplete"} tone={refComplete ? "good" : "warn"} hint={`${Object.values(summary.reference).reduce((a, b) => a + b, 0).toLocaleString()} rows`} />
          <StatCard label="Last measurement" value={summary.last_measurement_at ? fmtDate(summary.last_measurement_at) : "none"} hint={summary.last_meal_on ? `last meal ${fmtDate(summary.last_meal_on)}` : "no meals yet"} />
          <StatCard label="Admin accounts" value={admins.length} hint={`${admins.filter((a) => a.is_superadmin).length} superadmin`} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Panel title="Data overview" description="Rows per table">
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(summary.counts).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted p-3">
                  <p className="text-xl font-extrabold">{v.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground font-semibold">{COUNT_LABELS[k] ?? k}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Reference data" description="WHO tables, AKG, food composition, KPSP, articles" actions={me?.is_superadmin && <Button size="sm" onClick={seed} disabled={seeding}>{seeding ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Load missing</Button>}>
          {summary && (
            <ul className="divide-y">
              {Object.entries(summary.reference).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-semibold">{REF_LABELS[k] ?? k}</span>
                  <span className={v > 0 ? "text-emerald-600 font-bold inline-flex items-center gap-1" : "text-red-600 font-bold inline-flex items-center gap-1"}>{v > 0 ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />} {v.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
          {seedResult && <p className="text-xs text-emerald-700 font-semibold mt-3">Seeded: {Object.entries(seedResult).map(([k, v]) => `${REF_LABELS[k] ?? k} ${v}`).join(" · ")}</p>}
          {!me?.is_superadmin && <p className="text-xs text-muted-foreground mt-3">Only a superadmin can load reference data.</p>}
          <p className="text-xs text-muted-foreground mt-3">Equivalent CLI: <code>python seed_db.py</code> (add <code>--reset</code> to reload).</p>
        </Panel>
      </div>

      <Panel title="Health Manager accounts" actions={me?.is_superadmin && <Button size="sm" onClick={() => setAdding(true)}><Plus size={14} /> Add account</Button>}>
        {admins.length === 0 ? <EmptyState title="No accounts" /> : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead></TableRow></TableHeader>
              <TableBody>
                {admins.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-semibold flex items-center gap-2">{a.is_superadmin ? <Crown size={14} className="text-amber-500" /> : <Stethoscope size={14} className="text-primary" />} {a.name}{me?.id === a.id && <Pill>you</Pill>}</TableCell>
                    <TableCell className="font-mono text-xs">{a.email}</TableCell>
                    <TableCell><Pill className={a.is_superadmin ? "bg-amber-50 text-amber-700 border-amber-200" : ""}>{a.is_superadmin ? "Superadmin" : "Health Manager"}</Pill></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <Dialog open={adding} onOpenChange={(o) => !o && !isSaving && setAdding(false)}>
        <DialogContent className="hm-portal sm:max-w-md">
          <DialogHeader><DialogTitle>New Health Manager account</DialogTitle><DialogDescription>Share the temporary password securely; there is no self-service reset yet.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            <label className="text-xs font-bold text-muted-foreground">Full name<Input className="mt-1 bg-white" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted-foreground">Official email<Input type="email" className="mt-1 bg-white" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="text-xs font-bold text-muted-foreground">Temporary password (8+)<Input type="password" className="mt-1 bg-white" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_superadmin} onChange={(e) => setForm({ ...form, is_superadmin: e.target.checked })} /> Superadmin (can manage accounts and reference data)</label>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAdding(false)} disabled={isSaving}>Cancel</Button><Button onClick={createAdmin} disabled={isSaving}>{isSaving && <Loader2 className="animate-spin" size={14} />} Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
