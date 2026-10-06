import { useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, errorMessage as toMessage, type GrowthStandardPoint } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { cn } from "../../app/components/ui/utils";
import { EmptyState, ErrorBanner, PageHeader, Panel, Spinner } from "../components/ui";

type Gender = "male" | "female";
type Metric = "wfa" | "lhfa" | "bfa";
const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: "wfa", label: "Weight-for-age", unit: "kg", color: "#f47b20" },
  { key: "lhfa", label: "Length/height-for-age", unit: "cm", color: "#5cc8c2" },
  { key: "bfa", label: "BMI-for-age", unit: "kg/m²", color: "#9b8bf4" },
];

function Seg<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex gap-1 rounded-md border bg-muted p-0.5">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cn("rounded px-3 py-1.5 text-xs font-semibold", value === o.value ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground")}>{o.label}</button>
      ))}
    </div>
  );
}

export function GrowthStandards() {
  const [gender, setGender] = useState<Gender>("male");
  const [metric, setMetric] = useState<Metric>("wfa");
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState<GrowthStandardPoint[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    api.admin.growthStandards(metric, gender)
      .then((d) => { if (!cancelled) setRows(d); })
      .catch((err) => { if (!cancelled) setError(toMessage(err)); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [metric, gender]);

  const cfg = METRICS.find((m) => m.key === metric)!;
  const chart = useMemo(() => rows.map((r) => ({ ...r, band: r.p97 - r.p3 })), [rows]);
  const table = useMemo(() => rows.filter((r) => r.age_months % step === 0), [rows, step]);

  return (
    <>
      <PageHeader
        title="WHO Growth Standards"
        description="Percentile curves derived from the WHO LMS tables shipped with SIMBA. Every z-score in the system is computed from these tables."
        actions={
          <>
            <Seg value={gender} onChange={setGender} options={[{ value: "male", label: "Boys" }, { value: "female", label: "Girls" }]} />
            <Seg value={metric} onChange={setMetric} options={METRICS.map((m) => ({ value: m.key, label: m.label }))} />
          </>
        }
      />
      <ErrorBanner message={error} />

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel title={`${cfg.label} · ${gender === "male" ? "boys" : "girls"} · 0–60 months`} description="Shaded band = 3rd–97th percentile · dashed = median" className="xl:col-span-3">
          {isLoading ? <Spinner /> : rows.length === 0 ? <EmptyState title="Not seeded yet" description="Load reference data from System." /> : (
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
                <XAxis dataKey="age_months" type="number" domain={[0, 60]} ticks={[0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60]} tickFormatter={(v) => `${v}m`} tick={{ fontSize: 11 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} unit={` ${cfg.unit}`} width={70} />
                <Tooltip labelFormatter={(v) => `${v} months`} formatter={(v: number, n: string) => (n === "band" ? [null, null] : [`${v} ${cfg.unit}`, n])} />
                <Area type="monotone" dataKey="p3" stackId="who" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" name="p3" />
                <Area type="monotone" dataKey="band" stackId="who" stroke="none" fill={cfg.color} fillOpacity={0.15} isAnimationActive={false} name="p3–p97 band" />
                <Line type="monotone" dataKey="p3" stroke={cfg.color} strokeOpacity={0.6} dot={false} isAnimationActive={false} name="P3" />
                <Line type="monotone" dataKey="p15" stroke={cfg.color} strokeOpacity={0.35} dot={false} isAnimationActive={false} name="P15" />
                <Line type="monotone" dataKey="p50" stroke={cfg.color} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} name="P50 (median)" />
                <Line type="monotone" dataKey="p85" stroke={cfg.color} strokeOpacity={0.35} dot={false} isAnimationActive={false} name="P85" />
                <Line type="monotone" dataKey="p97" stroke={cfg.color} strokeOpacity={0.6} dot={false} isAnimationActive={false} name="P97" />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title={`Percentile table (${cfg.unit})`} className="xl:col-span-2" actions={<Seg value={String(step)} onChange={(v) => setStep(Number(v))} options={[{ value: "1", label: "1 mo" }, { value: "3", label: "3 mo" }, { value: "6", label: "6 mo" }]} />}>
          <div className="overflow-auto -mx-5 -mb-5 max-h-[420px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead>Age</TableHead><TableHead className="text-right">P3</TableHead><TableHead className="text-right">P15</TableHead><TableHead className="text-right">P50</TableHead><TableHead className="text-right">P85</TableHead><TableHead className="text-right">P97</TableHead></TableRow></TableHeader>
              <TableBody>
                {table.map((r) => (
                  <TableRow key={r.age_months}>
                    <TableCell className="font-semibold">{r.age_months} mo</TableCell>
                    {[r.p3, r.p15, r.p50, r.p85, r.p97].map((v, i) => <TableCell key={i} className={cn("text-right font-mono", i === 2 && "font-bold")} style={i === 2 ? { color: cfg.color } : undefined}>{v.toFixed(1)}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Read-only. Source files: <code>backend/data/who_lms_tables/*.csv</code>. To refresh, replace the CSVs and run <code>python seed_db.py --reset</code>.
        Percentiles are computed exactly from L, M, S: value = M·(1 + L·S·z)<sup>1/L</sup> at z = ±1.881 (P3/P97), ±1.036 (P15/P85), 0 (P50).
      </p>
    </>
  );
}
