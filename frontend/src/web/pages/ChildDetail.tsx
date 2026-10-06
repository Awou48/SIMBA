import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, downloadBlob, errorMessage as toMessage, type AdminChildDetail, type GrowthStandardPoint, type MealLog } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { Button } from "../../app/components/ui/button";
import { cn } from "../../app/components/ui/utils";
import { EmptyState, ErrorBanner, PageHeader, Panel, Pill, Spinner, StatCard, ZBadge, fmtAge, fmtDate } from "../components/ui";

const DAYS_PER_MONTH = 30.4375;
type Metric = "weight" | "height" | "bmi";
const METRICS: Record<Metric, { label: string; unit: string; color: string; standard: "wfa" | "lhfa" | "bfa"; field: "weight_kg" | "height_cm" | "bmi" }> = {
  weight: { label: "Weight-for-age", unit: "kg", color: "#f47b20", standard: "wfa", field: "weight_kg" },
  height: { label: "Height-for-age", unit: "cm", color: "#5cc8c2", standard: "lhfa", field: "height_cm" },
  bmi: { label: "BMI-for-age", unit: "kg/m²", color: "#9b8bf4", standard: "bfa", field: "bmi" },
};

const sevClass: Record<string, string> = { high: "bg-red-50 text-red-700 border-red-200", medium: "bg-amber-50 text-amber-700 border-amber-200", low: "bg-emerald-50 text-emerald-700 border-emerald-200" };

export function ChildDetail() {
  const { id } = useParams();
  const childId = Number(id);
  const [data, setData] = useState<AdminChildDetail | null>(null);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [standards, setStandards] = useState<Record<string, GrowthStandardPoint[]>>({});
  const [metric, setMetric] = useState<Metric>("weight");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api.admin
      .childDetail(childId)
      .then(async (d) => {
        if (cancelled) return;
        setData(d);
        const [m, wfa, lhfa, bfa] = await Promise.all([
          api.admin.childMeals(childId, 7),
          api.admin.growthStandards("wfa", d.child.gender),
          api.admin.growthStandards("lhfa", d.child.gender),
          api.admin.growthStandards("bfa", d.child.gender),
        ]);
        if (cancelled) return;
        setMeals(m);
        setStandards({ wfa, lhfa, bfa });
      })
      .catch((err) => { if (!cancelled) setError(toMessage(err, "Failed to load this child.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [childId]);

  const cfg = METRICS[metric];
  const chart = useMemo(() => {
    if (!data) return [];
    const maxMonths = Math.min(60, Math.max(12, Math.ceil((data.latest?.age_in_days ?? 0) / DAYS_PER_MONTH) + 3));
    const rows: Record<string, number | null>[] = (standards[cfg.standard] ?? [])
      .filter((p) => p.age_months <= maxMonths)
      .map((p) => ({ age: p.age_months, p3: p.p3, p50: p.p50, band: p.p97 - p.p3, value: null }));
    for (const m of data.measurements) rows.push({ age: +(m.age_in_days / DAYS_PER_MONTH).toFixed(2), value: m[cfg.field], p3: null, p50: null, band: null });
    return rows.sort((a, b) => (a.age as number) - (b.age as number));
  }, [data, standards, cfg]);

  if (isLoading) return <Spinner />;
  if (!data) return <ErrorBanner message={error || "Not found"} />;

  const c = data.child;
  const latest = data.latest;
  const st = data.status;

  return (
    <>
      <PageHeader
        breadcrumb={<Link to="/hm/children" className="inline-flex items-center gap-1 hover:underline"><ArrowLeft size={12} /> Children</Link>}
        title={`${c.name} ${c.gender === "male" ? "♂" : "♀"}`}
        description={`${fmtAge(c.age_in_months)} · born ${fmtDate(c.birth_date)} · ${c.region ?? "no region"} · parent ${c.parent_email_masked}`}
        actions={<Button variant="outline" onClick={() => api.admin.childReportPdf(childId).then((b) => downloadBlob(b, `simba-report-${c.name.toLowerCase().replace(/\s+/g, "-")}.pdf`)).catch((err) => setError(toMessage(err)))}><Download size={14} /> Download PDF report</Button>}
      />
      <ErrorBanner message={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <StatCard label="Height-for-age" value={latest ? <ZBadge z={latest.lhfa_zscore} /> : "—"} hint={st?.stunting ?? "No measurement"} />
        <StatCard label="Weight-for-age" value={latest ? <ZBadge z={latest.wfa_zscore} /> : "—"} hint={st?.weight ?? "No measurement"} />
        <StatCard label="Weight-for-height" value={latest ? <ZBadge z={latest.wfh_zscore} /> : "—"} hint={st?.wasting ?? "Outside WHO table / no data"} />
        <StatCard label="Immunization" value={`${data.immunization.given}/${data.immunization.total}`} tone={data.immunization.overdue ? "warn" : "good"} hint={`${data.immunization.overdue} overdue · ${data.immunization.due} due now`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Panel
          className="lg:col-span-2"
          title="Growth chart"
          description="Shaded band = WHO 3rd–97th percentile · dashed = median"
          actions={
            <div className="flex gap-1 rounded-md border p-0.5 bg-muted">
              {(Object.keys(METRICS) as Metric[]).map((m) => (
                <button key={m} onClick={() => setMetric(m)} className={cn("rounded px-2.5 py-1 text-xs font-semibold", metric === m ? "bg-white shadow text-foreground" : "text-muted-foreground")}>{METRICS[m].label}</button>
              ))}
            </div>
          }
        >
          {chart.length === 0 ? (
            <EmptyState title="No WHO curves loaded" description="Run the seeder from System." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                <XAxis dataKey="age" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => `${Math.round(v)}m`} tick={{ fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} unit={` ${cfg.unit}`} width={70} />
                <Tooltip labelFormatter={(v) => `${Number(v).toFixed(1)} months`} formatter={(v: number, n: string) => (n === "band" || n === "p3" ? [null, null] : [`${v} ${cfg.unit}`, n === "value" ? c.name : "WHO median"])} />
                <Area type="monotone" dataKey="p3" stackId="who" stroke="none" fill="transparent" connectNulls isAnimationActive={false} legendType="none" />
                <Area type="monotone" dataKey="band" stackId="who" stroke="none" fill={cfg.color} fillOpacity={0.12} connectNulls isAnimationActive={false} name="WHO p3–p97" />
                <Line type="monotone" dataKey="p50" stroke="#9ba3b8" strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} name="WHO median" />
                <Line type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={3} dot={{ r: 4, fill: cfg.color }} connectNulls name={c.name} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Attention points" description="Derived from growth, nutrition, KPSP and immunization">
          {data.alerts.filter((a) => a.severity !== "low").length === 0 ? (
            <EmptyState title="Nothing flagged" description="All indicators within range." />
          ) : (
            <ul className="space-y-2">
              {data.alerts.filter((a) => a.severity !== "low").map((a) => (
                <li key={a.id} className={cn("rounded-lg border p-3", sevClass[a.severity])}>
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70">{a.category} · {a.severity}</p>
                  <p className="text-sm font-semibold mt-0.5">{a.title}</p>
                  <p className="text-xs mt-1 opacity-90">{a.description}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        <Panel title="Measurement history" description={data.change_since_first ? `Since first entry (${data.change_since_first.days} days): ${data.change_since_first.weight_kg >= 0 ? "+" : ""}${data.change_since_first.weight_kg} kg · ${data.change_since_first.height_cm >= 0 ? "+" : ""}${data.change_since_first.height_cm} cm` : undefined}>
          {data.measurements.length === 0 ? (
            <EmptyState title="No measurements" />
          ) : (
            <div className="overflow-x-auto -mx-5 -mb-5">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Age</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Height</TableHead><TableHead className="text-right">BMI</TableHead><TableHead>HFA</TableHead><TableHead>WFA</TableHead><TableHead>WFH</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...data.measurements].reverse().map((m) => (
                    <TableRow key={m.date + m.age_in_days}>
                      <TableCell className="whitespace-nowrap">{fmtDate(m.date)}</TableCell>
                      <TableCell>{(m.age_in_days / DAYS_PER_MONTH).toFixed(1)} mo</TableCell>
                      <TableCell className="text-right font-mono">{m.weight_kg}</TableCell>
                      <TableCell className="text-right font-mono">{m.height_cm}</TableCell>
                      <TableCell className="text-right font-mono">{m.bmi.toFixed(1)}</TableCell>
                      <TableCell><ZBadge z={m.lhfa_zscore} /></TableCell>
                      <TableCell><ZBadge z={m.wfa_zscore} /></TableCell>
                      <TableCell><ZBadge z={m.wfh_zscore} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Nutrition, last 7 days" description={data.nutrition_7d.days_logged ? `Averaged over ${data.nutrition_7d.days_logged} logged day(s)` : "No meals logged"}>
            {data.nutrition_7d.days_logged === 0 ? (
              <EmptyState title="No meals in the last 7 days" />
            ) : (
              <ul className="space-y-2">
                {(["energy", "protein", "carbs", "fat"] as const).map((k) => {
                  const avg = data.nutrition_7d.average[k];
                  const target = data.nutrition_7d.targets?.[k];
                  const p = data.nutrition_7d.fulfillment_percent?.[k] ?? 0;
                  return (
                    <li key={k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold capitalize">{k === "energy" ? "Energy" : k}</span>
                        <span className="text-muted-foreground">{Math.round(avg)}{k === "energy" ? " kcal" : " g"}{target ? ` / ${Math.round(target)} · ${Math.round(p)}%` : ""}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={cn("h-full rounded-full", p < 70 ? "bg-red-500" : p < 90 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, p)}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
            {meals.length > 0 && (
              <details className="mt-4">
                <summary className="text-xs font-semibold text-primary cursor-pointer">Show {meals.length} logged item{meals.length === 1 ? "" : "s"}</summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {meals.map((m) => (
                    <li key={m.id} className="flex justify-between gap-2 border-b py-1">
                      <span><span className="text-muted-foreground">{fmtDate(m.date, false)} · {m.meal_type}</span> {m.food_name} <span className="text-muted-foreground">×{m.servings}</span></span>
                      <span className="font-mono whitespace-nowrap">{Math.round(m.energy)} kcal</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Panel>

          <Panel title="Development (KPSP)">
            {data.milestones.total === 0 ? (
              <EmptyState title="No questions for this age bracket" />
            ) : (
              <div className="flex items-center gap-4">
                <p className="text-3xl font-extrabold">{data.milestones.achieved}<span className="text-base text-muted-foreground font-semibold">/{data.milestones.total}</span></p>
                <div className="text-sm">
                  <p className="font-semibold">{data.milestones.age_label}</p>
                  <p className="text-muted-foreground text-xs">{data.milestones.interpretation ? <Pill className={data.milestones.interpretation === "Sesuai" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : data.milestones.interpretation === "Meragukan" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}>{data.milestones.interpretation}</Pill> : `${data.milestones.total - data.milestones.answered} unanswered`}</p>
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
