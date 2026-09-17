import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, errorMessage as toMessage, type StuntingStats } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { EmptyState, ErrorBanner, PageHeader, Panel, Pill, Spinner, StatCard, pct, rateTone } from "../components/ui";

export function Regions() {
  const [rows, setRows] = useState<StuntingStats[]>([]);
  const [overall, setOverall] = useState<StuntingStats | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.admin.regionStats(), api.admin.stats()])
      .then(([r, o]) => { setRows(r); setOverall(o); })
      .catch((err) => setError(toMessage(err, "Failed to load regional data.")))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;
  const bars = rows.filter((r) => r.children_measured > 0).map((r) => ({ region: r.region_name, rate: +(r.stunting_rate * 100).toFixed(1), n: r.children_measured }));

  return (
    <>
      <PageHeader title="Regions" description="Stunting prevalence per kecamatan/kota. A child counts once, by their most recent measurement." />
      <ErrorBanner message={error} />

      {overall && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <StatCard label="Overall stunting rate" value={pct(overall.stunting_rate)} tone={rateTone(overall.stunting_rate)} hint={overall.warning} />
          <StatCard label="Children measured" value={`${overall.children_measured} / ${overall.total_children}`} hint={`${overall.total_measurements} measurements in total`} />
          <StatCard label="Regions reporting" value={rows.filter((r) => r.region_name !== "Unspecified").length} hint={rows.some((r) => r.region_name === "Unspecified") ? `${rows.find((r) => r.region_name === "Unspecified")!.total_children} children without a region` : "all children have a region"} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5 mb-6">
        <Panel title="Stunting rate by region" description="WHO public-health thresholds: >20% high, >30% very high" className="lg:col-span-2">
          {bars.length === 0 ? <EmptyState title="No measured children yet" /> : (
            <ResponsiveContainer width="100%" height={Math.max(180, bars.length * 40)}>
              <BarChart data={bars} layout="vertical" barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef0f6" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="region" type="category" width={130} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number, _n: string, p: any) => [`${v}% of ${p.payload.n}`, "Stunting"]} />
                <Bar dataKey="rate" radius={[0, 6, 6, 0]}>{bars.map((d) => <Cell key={d.region} fill={d.rate > 30 ? "#e53535" : d.rate > 20 ? "#f47b20" : "#4f46e5"} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Region table" className="lg:col-span-3">
          {rows.length === 0 ? <EmptyState title="No children registered" /> : (
            <div className="overflow-x-auto -mx-5 -mb-5">
              <Table>
                <TableHeader><TableRow><TableHead>Region</TableHead><TableHead className="text-right">Children</TableHead><TableHead className="text-right">Measured</TableHead><TableHead className="text-right">Stunted</TableHead><TableHead className="text-right">Severe</TableHead><TableHead className="text-right">Rate</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.region_name}>
                      <TableCell className="font-semibold">{r.region_name}</TableCell>
                      <TableCell className="text-right">{r.total_children}</TableCell>
                      <TableCell className="text-right">{r.children_measured}</TableCell>
                      <TableCell className="text-right">{r.stunted_cases}</TableCell>
                      <TableCell className="text-right">{r.severely_stunted_cases}</TableCell>
                      <TableCell className="text-right font-mono">{r.children_measured ? pct(r.stunting_rate) : "—"}</TableCell>
                      <TableCell>{r.children_measured ? <Pill className={rateTone(r.stunting_rate) === "bad" ? "bg-red-50 text-red-700 border-red-200" : rateTone(r.stunting_rate) === "warn" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>{r.warning}</Pill> : <Pill>no data</Pill>}</TableCell>
                      <TableCell className="text-right"><Link to={`/hm/children?region=${encodeURIComponent(r.region_name)}`} className="text-xs font-semibold text-primary hover:underline">View children →</Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
