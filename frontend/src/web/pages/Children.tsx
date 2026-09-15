import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { api, errorMessage as toMessage, type ChildFlag, type RegistryChild, type StuntingStats } from "../../lib/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../app/components/ui/table";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { cn } from "../../app/components/ui/utils";
import { EmptyState, ErrorBanner, FLAG_META, FlagBadge, PageHeader, Panel, Spinner, ZBadge, fmtAge, fmtDate } from "../components/ui";

const PAGE = 25;
const FLAG_FILTERS: (ChildFlag | "")[] = ["", "stunted", "underweight", "wasted", "overweight", "stale", "no_data", "normal"];

export function Children() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const region = params.get("region") ?? "";
  const flag = (params.get("flag") ?? "") as ChildFlag | "";
  const page = Math.max(0, parseInt(params.get("page") ?? "0") || 0);

  const [rows, setRows] = useState<RegistryChild[]>([]);
  const [total, setTotal] = useState(0);
  const [regions, setRegions] = useState<StuntingStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(q);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.admin.regionStats().then(setRegions).catch(() => setRegions([]));
  }, []);

  // Debounce the search box into the URL.
  useEffect(() => {
    const t = setTimeout(() => { if (search !== q) set({ q: search }); }, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api.admin
      .listChildren({ q: q || undefined, region: region || undefined, flag: flag || undefined, limit: PAGE, offset: page * PAGE })
      .then((r) => { if (!cancelled) { setRows(r.items); setTotal(r.total); } })
      .catch((err) => { if (!cancelled) setError(toMessage(err, "Failed to load children.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [q, region, flag, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const regionOptions = useMemo(() => regions.map((r) => r.region_name), [regions]);

  return (
    <>
      <PageHeader title="Children" description="Every child registered by parents, with their latest WHO assessment. Names and masked parent contacts only." />
      <ErrorBanner message={error} />

      <Panel className="mb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by child name…" className="pl-9 bg-white" />
          </div>
          <select value={region} onChange={(e) => set({ region: e.target.value })} className="h-9 rounded-md border bg-white px-3 text-sm">
            <option value="">All regions</option>
            {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {FLAG_FILTERS.map((f) => (
            <button
              key={f || "all"}
              onClick={() => set({ flag: f })}
              className={cn("rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors", flag === f ? "bg-primary text-primary-foreground border-primary" : "bg-white hover:bg-accent")}
            >
              {f ? FLAG_META[f].label : "All statuses"}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={`${total} child${total === 1 ? "" : "ren"}`} description={pages > 1 ? `Page ${page + 1} of ${pages}` : undefined}
        actions={pages > 1 ? (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" disabled={page === 0} onClick={() => set({ page: String(page - 1) })}><ChevronLeft size={16} /></Button>
            <Button variant="outline" size="icon" disabled={page + 1 >= pages} onClick={() => set({ page: String(page + 1) })}><ChevronRight size={16} /></Button>
          </div>
        ) : undefined}
      >
        {isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="No children match" description="Try clearing the filters." action={<Button variant="outline" size="sm" onClick={() => { setSearch(""); setParams({}, { replace: true }); }}>Clear filters</Button>} />
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead><TableHead>Age</TableHead><TableHead>Region</TableHead><TableHead>Parent</TableHead>
                  <TableHead>Last measured</TableHead><TableHead className="text-right">Weight</TableHead><TableHead className="text-right">Height</TableHead>
                  <TableHead>HFA z</TableHead><TableHead>WFA z</TableHead><TableHead>WFH z</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id} className="hover:bg-accent/40">
                    <TableCell>
                      <Link to={`/hm/children/${c.id}`} className="font-semibold text-primary hover:underline">{c.name}</Link>
                      <span className="text-muted-foreground ml-1">{c.gender === "male" ? "♂" : "♀"}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{fmtAge(c.age_in_months)}</TableCell>
                    <TableCell className="text-muted-foreground">{c.region ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{c.parent_email_masked}</TableCell>
                    <TableCell className="whitespace-nowrap">{fmtDate(c.last_measured_on)} <span className="text-muted-foreground text-xs">({c.measurements_count})</span></TableCell>
                    <TableCell className="text-right font-mono">{c.latest ? `${c.latest.weight_kg} kg` : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{c.latest ? `${c.latest.height_cm} cm` : "—"}</TableCell>
                    <TableCell><ZBadge z={c.latest?.lhfa_zscore} /></TableCell>
                    <TableCell><ZBadge z={c.latest?.wfa_zscore} /></TableCell>
                    <TableCell><ZBadge z={c.latest?.wfh_zscore} /></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{c.flags.map((f) => <FlagBadge key={f} flag={f} />)}</div></TableCell>
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
