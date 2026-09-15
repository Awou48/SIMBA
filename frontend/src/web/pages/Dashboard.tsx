import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Users, Ruler, Syringe, Activity, ArrowRight } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { api, errorMessage as toMessage, type DashboardOverview, type RecentMeasurement, type StuntingStats } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { Button } from "../../app/components/ui/button";
import { EmptyState, ErrorBanner, PageHeader, Panel, Spinner, StatCard, ZBadge, fmtAge, fmtDate, pct, rateTone } from "../components/ui";

const STATUS_COLORS: Record<string, string> = {
  normal: "#5cc8c2", stunted: "#e53535", underweight: "#f47b20", wasted: "#b91c1c", overweight: "#f59e0b", unmeasured: "#c0c4d0",
};

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [regions, setRegions] = useState<StuntingStats[]>([]);
  const [recent, setRecent] = useState<RecentMeasurement[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.admin.overview(), api.admin.regionStats(), api.admin.recentMeasurements(8)])
      .then(([o, r, m]) => { setOverview(o); setRegions(r); setRecent(m); })
      .catch((err) => setError(toMessage(err, "Failed to load the dashboard.")))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <Spinner />;

  const s = overview?.status;
  const donut = s
    ? [
        { key: "normal", label: "Normal", value: s.normal },
        { key: "stunted", label: "Stunted", value: s.stunted },
        { key: "underweight", label: "Underweight", value: s.underweight },
        { key: "wasted", label: "Wasted", value: s.wasted },
        { key: "overweight", label: "Overweight", value: s.overweight },
        { key: "unmeasured", label: "Unmeasured", value: s.unmeasured },
      ].filter((d) => d.value > 0)
    : [];
  const regionBars = regions.filter((r) => r.children_measured > 0).map((r) => ({ region: r.region_name, rate: +(r.stunting_rate * 100).toFixed(1), n: r.children_measured }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Programme overview built from every child's latest measurement."
        actions={<Button asChild><Link to="/hm/children">Open children registry <ArrowRight size={14} /></Link></Button>}
      />
      <ErrorBanner message={error} />

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <StatCard icon={<Users size={18} />} label="Children registered" value={overview.children_total} hint={`${overview.children_measured} measured · ${overview.parents_total} parents · ${overview.regions_total} regions`} />
          <StatCard icon={<Ruler size={18} />} label="Stunting prevalence" value={pct(overview.stunting_rate)} tone={rateTone(overview.stunting_rate)} hint={`${overview.status.stunted} stunted (${overview.status.severely_stunted} severe) of ${overview.children_measured} measured`} />
          <StatCard icon={<Syringe size={18} />} label="Immunization backlog" value={overview.immunization.children_with_overdue} tone={overview.immunization.children_with_overdue ? "warn" : "good"} hint={`${overview.immunization.overdue_doses} overdue doses across all children`} />
          <StatCard icon={<Activity size={18} />} label="Activity, last 30 days" value={overview.last_30_days.measurements} hint={`measurements · ${overview.last_30_days.meals} meals · ${overview.last_30_days.milestone_answers} KPSP answers`} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Panel title="Nutritional status" description="Each child counted once by their latest measurement" className="lg:col-span-1">
          {donut.length === 0 ? (
            <EmptyState title="No children yet" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="label" innerRadius={45} outerRadius={70} strokeWidth={2} stroke="#fff">
                      {donut.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1.5 text-sm">
                {donut.map((d) => (
                  <li key={d.key} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[d.key] }} />
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-bold ml-auto pl-4">{d.value}</span>
                  </li>
                ))}
                {s && s.stale > 0 && <li className="text-xs text-muted-foreground pt-1">{s.stale} not measured in 30+ days</li>}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Stunting rate by region" description="WHO thresholds: >20% high (amber), >30% very high (red)" className="lg:col-span-2" actions={<Button asChild variant="ghost" size="sm"><Link to="/hm/regions">Details <ArrowRight size={14} /></Link></Button>}>
          {regionBars.length === 0 ? (
            <EmptyState title="No measured children yet" description="Parents set a region on each child profile; rates appear once children are measured." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, regionBars.length * 38)}>
              <BarChart data={regionBars} layout="vertical" barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef0f6" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="region" type="category" width={140} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number, _n: string, p: any) => [`${v}% of ${p.payload.n} measured`, "Stunting"]} />
                <Bar dataKey="rate" radius={[0, 6, 6, 0]}>
                  {regionBars.map((d) => <Cell key={d.region} fill={d.rate > 30 ? "#e53535" : d.rate > 20 ? "#f47b20" : "#4f46e5"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <Panel title="Recent measurements" description="Latest entries logged by parents" actions={<Button asChild variant="ghost" size="sm"><Link to="/hm/children">All children <ArrowRight size={14} /></Link></Button>}>
        {recent.length === 0 ? (
          <EmptyState title="No measurements logged yet" />
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead><TableHead>Child</TableHead><TableHead>Region</TableHead><TableHead>Age</TableHead>
                  <TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Height</TableHead>
                  <TableHead>HFA z</TableHead><TableHead>WFA z</TableHead><TableHead>WFH z</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap">{fmtDate(m.date)}</TableCell>
                    <TableCell><Link to={`/hm/children/${m.child_id}`} className="font-semibold text-primary hover:underline">{m.child_name}</Link> <span className="text-muted-foreground">{m.gender === "male" ? "♂" : "♀"}</span></TableCell>
                    <TableCell className="text-muted-foreground">{m.region ?? "—"}</TableCell>
                    <TableCell>{fmtAge(m.age_in_months)}</TableCell>
                    <TableCell className="text-right font-mono">{m.weight_kg} kg</TableCell>
                    <TableCell className="text-right font-mono">{m.height_cm} cm</TableCell>
                    <TableCell><ZBadge z={m.lhfa_zscore} /></TableCell>
                    <TableCell><ZBadge z={m.wfa_zscore} /></TableCell>
                    <TableCell><ZBadge z={m.wfh_zscore} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs font-semibold">{m.stunting_status.split(" (")[0]}</TableCell>
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
