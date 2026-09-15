import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Users, Ruler, Syringe, Activity, ArrowRight, AlertTriangle, MapPin, Utensils, Flag, Sparkles, CalendarDays, TrendingUp, ShieldCheck } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { api, errorMessage as toMessage, type AdminInfo, type DashboardOverview, type RecentMeasurement, type RegistryChild, type StuntingStats } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { Button } from "../../app/components/ui/button";
import { cn } from "../../app/components/ui/utils";
import logoMark from "../../imports/logo_mark.png";
import { EmptyState, ErrorBanner, FlagBadge, Panel, Spinner, ZBadge, fmtAge, fmtDate, pct } from "../components/ui";

const STATUS_COLORS: Record<string, string> = {
  normal: "#5cc8c2", stunted: "#e53535", underweight: "#f47b20", wasted: "#b91c1c", overweight: "#f59e0b", unmeasured: "#c0c4d0",
};

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}

/** KPI tile with a coloured accent and icon well. */
function Kpi({ icon, label, value, hint, accent, to }: { icon: ReactNode; label: string; value: ReactNode; hint: string; accent: string; to?: string }) {
  const body = (
    <div className="hm-panel-lift relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm h-full">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <div className="absolute -right-6 -top-6 size-24 rounded-full opacity-[0.08]" style={{ background: accent }} />
      <div className="flex items-start gap-4">
        <div className="rounded-xl p-2.5 text-white shadow-sm shrink-0" style={{ background: accent }}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-3xl font-extrabold leading-tight mt-1 tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{hint}</p>
        </div>
      </div>
      {to && <ArrowRight size={14} className="absolute right-4 bottom-4 text-muted-foreground/60" />}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

function HeroTile({ icon, label, value, unit, hint, accent }: { icon: ReactNode; label: string; value: number | string; unit?: string; hint: string; accent?: string }) {
  return (
    <div className="hm-hero-tile flex items-center gap-3">
      <span className="size-9 rounded-xl grid place-items-center shrink-0" style={{ background: accent ? `${accent}33` : "rgba(255,255,255,0.18)", color: accent ?? "#fff" }}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide font-bold text-white/70">{label}</p>
        <p className="font-extrabold leading-tight"><span className="text-xl">{value}</span>{unit && <span className="text-xs text-white/75 ml-1">{unit}</span>}</p>
        <p className="text-[11px] text-white/70 truncate">{hint}</p>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [regions, setRegions] = useState<StuntingStats[]>([]);
  const [recent, setRecent] = useState<RecentMeasurement[]>([]);
  const [attention, setAttention] = useState<RegistryChild[]>([]);
  const [me, setMe] = useState<AdminInfo | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.admin.overview(), api.admin.regionStats(), api.admin.recentMeasurements(8), api.admin.listChildren({ limit: 200 }), api.admin.me()])
      .then(([o, r, m, kids, who]) => {
        setOverview(o); setRegions(r); setRecent(m); setMe(who);
        const rank: Record<string, number> = { wasted: 0, stunted: 1, underweight: 2, overweight: 3, stale: 4, no_data: 5, normal: 9 };
        setAttention(kids.items.filter((k) => !k.flags.includes("normal")).sort((a, b) => Math.min(...a.flags.map((f) => rank[f] ?? 9)) - Math.min(...b.flags.map((f) => rank[f] ?? 9))).slice(0, 6));
      })
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
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const rateAccent = overview ? (overview.stunting_rate > 0.3 ? "#e53535" : overview.stunting_rate > 0.2 ? "#f47b20" : "#10b981") : "#4f46e5";

  return (
    <div className="hm-stagger">
      <ErrorBanner message={error} />

      {/* Hero */}
      <section className="hm-hero relative overflow-hidden rounded-3xl text-white p-6 md:p-8 mb-6 shadow-lg">
        <div className="absolute -right-10 -top-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-24 bottom-0 size-40 rounded-full bg-[#f47b20]/40 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
        <div className="relative max-w-2xl flex-1">
          <p className="text-sm font-semibold text-white/80 flex items-center gap-2"><Sparkles size={14} /> {greeting()}, {me?.name ?? "Health Manager"} · {today}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-2 leading-tight">
            {overview?.children_total ?? 0} children monitored{overview && overview.regions_total > 0 ? ` across ${overview.regions_total} region${overview.regions_total === 1 ? "" : "s"}` : ""}.
          </h1>
          <p className="mt-2 text-white/85 max-w-xl">
            {overview
              ? overview.status.stunted > 0
                ? `${overview.status.stunted} child${overview.status.stunted === 1 ? "" : "ren"} currently below −2 SD height-for-age. Follow-up is the highest-value action this week.`
                : overview.children_measured > 0
                  ? "No stunting detected among measured children. Keep monthly measurements going to hold the line."
                  : "No measurements yet. Once parents log growth data, prevalence and alerts appear here."
              : ""}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="font-bold"><Link to="/hm/children">Open children registry <ArrowRight size={14} /></Link></Button>
            <Button asChild variant="ghost" className="text-white hover:bg-white/15 hover:text-white"><Link to="/hm/regions"><MapPin size={14} /> Regions</Link></Button>
            <Button asChild variant="ghost" className="text-white hover:bg-white/15 hover:text-white"><Link to="/hm/education"><Flag size={14} /> Publish an article</Link></Button>
          </div>
        </div>

        {/* Right column: this month's pulse + mascot */}
        {overview && (
          <div className="hidden lg:flex flex-1 items-center justify-between gap-8 pl-2">
            <div className="hidden xl:grid gap-2.5 w-64">
              <HeroTile icon={<CalendarDays size={15} />} label="Last 30 days" value={overview.last_30_days.measurements} unit="measurements" hint={`${overview.last_30_days.children_measured} children · ${overview.last_30_days.meals} meals logged`} />
              <HeroTile icon={<TrendingUp size={15} />} label="Stunting rate" value={pct(overview.stunting_rate)} hint={`${overview.status.stunted} of ${overview.children_measured} measured`} accent={rateAccent} />
              <HeroTile icon={<ShieldCheck size={15} />} label="Immunization" value={overview.immunization.children_with_overdue} unit="overdue" hint={overview.immunization.children_with_overdue === 0 ? "everyone is on schedule" : `${overview.immunization.overdue_doses} doses to catch up`} accent={overview.immunization.children_with_overdue > 0 ? "#f47b20" : "#10b981"} />
            </div>
            <div className="relative flex items-center justify-center size-44">
              <div className="hm-hero-ring hm-hero-ring-1" />
              <div className="hm-hero-ring hm-hero-ring-2" />
              <img src={logoMark} alt="" aria-hidden className="hm-hero-mascot relative" />
            </div>
          </div>
        )}
        </div>
      </section>

      {/* KPIs */}
      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <Kpi icon={<Users size={20} />} accent="#4f46e5" label="Children registered" value={overview.children_total} hint={`${overview.children_measured} measured · ${overview.parents_total} parent account${overview.parents_total === 1 ? "" : "s"}`} to="/hm/children" />
          <Kpi icon={<Ruler size={20} />} accent={rateAccent} label="Stunting prevalence" value={pct(overview.stunting_rate)} hint={`${overview.status.stunted} stunted (${overview.status.severely_stunted} severe) of ${overview.children_measured} measured`} to="/hm/children?flag=stunted" />
          <Kpi icon={<Syringe size={20} />} accent={overview.immunization.children_with_overdue ? "#f47b20" : "#10b981"} label="Immunization backlog" value={overview.immunization.children_with_overdue} hint={`${overview.immunization.overdue_doses} overdue dose${overview.immunization.overdue_doses === 1 ? "" : "s"} across all children`} />
          <Kpi icon={<Activity size={20} />} accent="#5cc8c2" label="Last 30 days" value={overview.last_30_days.measurements} hint={`measurements · ${overview.last_30_days.meals} meals · ${overview.last_30_days.milestone_answers} KPSP answers`} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Panel title="Nutritional status" description="Each child counted once, by latest measurement" className="hm-panel-lift">
          {donut.length === 0 ? (
            <EmptyState title="No children yet" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-40 h-40 shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2} cornerRadius={4} strokeWidth={0}>
                      {donut.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-2xl font-extrabold leading-none">{overview?.children_measured ?? 0}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">measured</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm flex-1">
                {donut.map((d) => (
                  <li key={d.key} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[d.key] }} />
                    <span className="text-muted-foreground">{d.label}</span>
                    <span className="font-bold ml-auto pl-4 tabular-nums">{d.value}</span>
                  </li>
                ))}
                {s && s.stale > 0 && <li className="text-xs text-muted-foreground pt-1 border-t mt-2">{s.stale} not measured in 30+ days</li>}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Stunting rate by region" description="WHO thresholds: >20% high (amber), >30% very high (red)" className="lg:col-span-2 hm-panel-lift" actions={<Button asChild variant="ghost" size="sm"><Link to="/hm/regions">Details <ArrowRight size={14} /></Link></Button>}>
          {regionBars.length === 0 ? (
            <EmptyState title="No regional data yet" description="Rates appear once children with a region have been measured. Parents set the region on the child profile." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, regionBars.length * 40)}>
              <BarChart data={regionBars} layout="vertical" barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef0f6" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="region" type="category" width={140} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#eef2ff" }} formatter={(v: number, _n: string, p: any) => [`${v}% of ${p.payload.n} measured`, "Stunting"]} />
                <Bar dataKey="rate" radius={[0, 8, 8, 0]} background={{ fill: "#f3f4f9", radius: 8 }}>
                  {regionBars.map((d) => <Cell key={d.region} fill={d.rate > 30 ? "#e53535" : d.rate > 20 ? "#f47b20" : "#4f46e5"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Panel title="Needs attention" description="Children with a flag on their latest status" className="hm-panel-lift" actions={<Button asChild variant="ghost" size="sm"><Link to="/hm/children?flag=stunted">All <ArrowRight size={14} /></Link></Button>}>
          {attention.length === 0 ? (
            <EmptyState title="Nothing flagged 🎉" description="Every measured child is within the normal range and up to date." />
          ) : (
            <ul className="-mx-5 -mb-5 divide-y">
              {attention.map((c) => (
                <li key={c.id}>
                  <Link to={`/hm/children/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/60 transition-colors">
                    <div className={cn("size-9 rounded-full flex items-center justify-center shrink-0 text-white", c.flags.some((f) => ["stunted", "wasted", "underweight"].includes(f)) ? "bg-red-500" : "bg-slate-400")}>
                      <AlertTriangle size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{c.name} <span className="text-muted-foreground font-normal">· {fmtAge(c.age_in_months)}{c.region ? ` · ${c.region}` : ""}</span></p>
                      <div className="flex flex-wrap gap-1 mt-1">{c.flags.map((f) => <FlagBadge key={f} flag={f} />)}</div>
                    </div>
                    <ArrowRight size={14} className="text-muted-foreground/60" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent measurements" description="Latest entries logged by parents" className="lg:col-span-2 hm-panel-lift" actions={<Button asChild variant="ghost" size="sm"><Link to="/hm/children">All children <ArrowRight size={14} /></Link></Button>}>
          {recent.length === 0 ? (
            <EmptyState title="No measurements logged yet" />
          ) : (
            <div className="overflow-x-auto -mx-5 -mb-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead><TableHead>Child</TableHead><TableHead>Age</TableHead>
                    <TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Height</TableHead>
                    <TableHead>HFA z</TableHead><TableHead>WFA z</TableHead><TableHead>WFH z</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((m) => (
                    <TableRow key={m.id} className="hover:bg-accent/40">
                      <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(m.date)}</TableCell>
                      <TableCell><Link to={`/hm/children/${m.child_id}`} className="font-bold text-primary hover:underline">{m.child_name}</Link> <span className="text-muted-foreground">{m.gender === "male" ? "♂" : "♀"}</span>{m.region && <span className="block text-[11px] text-muted-foreground">{m.region}</span>}</TableCell>
                      <TableCell className="whitespace-nowrap">{fmtAge(m.age_in_months)}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{m.weight_kg} kg</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{m.height_cm} cm</TableCell>
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
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { to: "/hm/food-database", icon: <Utensils size={16} />, label: "Food Database", hint: "1,600+ Indonesian foods" },
          { to: "/hm/akg-targets", icon: <Ruler size={16} />, label: "AKG Targets", hint: "Daily nutrition goals by age" },
          { to: "/hm/milestones", icon: <Flag size={16} />, label: "KPSP Milestones", hint: "Developmental screening bank" },
          { to: "/hm/growth-standards", icon: <Activity size={16} />, label: "WHO Standards", hint: "Percentile curves & tables" },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="hm-panel-lift flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
            <span className="rounded-lg bg-accent p-2 text-primary">{q.icon}</span>
            <span className="min-w-0"><span className="block text-sm font-bold">{q.label}</span><span className="block text-xs text-muted-foreground truncate">{q.hint}</span></span>
            <ArrowRight size={14} className="ml-auto text-muted-foreground/60" />
          </Link>
        ))}
      </div>
    </div>
  );
}
