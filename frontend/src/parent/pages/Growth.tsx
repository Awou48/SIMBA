import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import { api, errorMessage, type GrowthStandardPoint, type Measurement } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { GrowthChart, type ChartPoint } from "../components/GrowthChart";
import { Body, Button, Card, Chips, Empty, ErrorBox, Icon, Loading, Pill, Section, VerdictCard, YellowBar } from "../components/ui";
import { fmtDate, fmtZ, growthVerdict, num, statusTone, zPlain } from "../../lib/id";

type Metric = "wfa" | "lhfa";

export function Growth() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [metric, setMetric] = useState<Metric>("wfa");
  const [rows, setRows] = useState<Measurement[]>([]);
  const [standards, setStandards] = useState<Record<Metric, GrowthStandardPoint[]>>({ wfa: [], lhfa: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [details, setDetails] = useState(false);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      const [m, wfa, lhfa] = await Promise.all([api.parent.listMeasurements(active.id), api.parent.growthStandards("wfa", active.gender), api.parent.growthStandards("lhfa", active.gender)]);
      setRows(m);
      setStandards({ wfa, lhfa });
    } catch (err) {
      setError(errorMessage(err, "Data pertumbuhan belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const points = useMemo<ChartPoint[]>(() => rows.map((r) => ({ ageMonths: r.age_in_days / 30.4375, value: metric === "wfa" ? r.weight_kg : r.height_cm, label: fmtDate(r.date_logged) })), [rows, metric]);
  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const verdict = growthVerdict(active?.name ?? "Si kecil", latest?.stunting_status, latest?.weight_status, latest?.wasting_status);

  return (
    <>
      <YellowBar title="Pertumbuhan" subtitle="Dibandingkan standar WHO" />
      <Body>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={load} />
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Card>
            <Empty icon="ruler" title="Belum ada pengukuran" body="Masukkan berat dan tinggi hari ini untuk melihat pertumbuhannya dibanding anak seusianya." action={<Button title="Ukur sekarang" icon="plus" onClick={() => navigate("/ukur")} />} />
          </Card>
        ) : (
          <>
            <VerdictCard {...verdict} />
            {latest ? (
              <div className="grid grid-cols-2 gap-3">
                <Delta icon="ruler" color="text-[#c4302e]" label="Berat badan" value={`${num(latest.weight_kg)} kg`} delta={previous ? latest.weight_kg - previous.weight_kg : null} unit="kg" />
                <Delta icon="trending-up" color="text-[#00777a]" label="Tinggi badan" value={`${num(latest.height_cm)} cm`} delta={previous ? latest.height_cm - previous.height_cm : null} unit="cm" />
              </div>
            ) : null}

            <Card>
              <Chips
                options={[
                  { value: "wfa", label: "Berat", icon: "ruler" },
                  { value: "lhfa", label: "Tinggi", icon: "trending-up" },
                ]}
                value={metric}
                onChange={setMetric}
              />
              <GrowthChart standards={standards[metric]} points={points} unit={metric === "wfa" ? "kg" : "cm"} />
              <p className="text-[14px] text-[var(--muted)] mt-2 leading-5">Area hijau = rentang sehat. Titik {active?.name} sebaiknya tetap di dalamnya.</p>
            </Card>

            <Button title="Ukur sekarang" icon="plus" onClick={() => navigate("/ukur")} />

            {latest ? (
              <>
                <button type="button" onClick={() => setDetails((d) => !d)} className="w-full flex items-center justify-center gap-1.5 py-3 text-[14px] font-extrabold text-[var(--coral)]">
                  {details ? "Sembunyikan angka rinci" : "Lihat angka rinci"} {details ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {details ? (
                  <Card>
                    <ZRow label="Berat menurut usia" z={latest.wfa_zscore} status={latest.weight_status} />
                    <ZRow label="Tinggi menurut usia" z={latest.lhfa_zscore} status={latest.stunting_status} />
                    <ZRow label="Berat menurut tinggi" z={latest.wfh_zscore} status={latest.wasting_status} last />
                    <p className="text-[13px] text-[var(--muted)] mt-2 leading-[18px]">Angka −2 sampai +2 berarti normal. Mengikuti standar WHO dan Permenkes 2/2020.</p>
                  </Card>
                ) : null}
              </>
            ) : null}

            <Section title="Riwayat pengukuran" />
            <Card pad="px-4 py-1">
              {[...rows].reverse().map((r, i) => (
                <div key={r.id} className={`flex items-center gap-3 py-3 ${i > 0 ? "sb-dashed" : ""}`}>
                  <span className="size-3 rounded-full bg-[var(--coral)] sb-outline shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-extrabold">{fmtDate(r.date_logged)}</p>
                    <p className="text-[13px] text-[var(--muted)]">
                      {Math.floor(r.age_in_days / 30.4375)} bulan · {num(r.weight_kg)} kg · {num(r.height_cm)} cm
                    </p>
                  </div>
                  <Pill tone={statusTone(r.stunting_status)} className="max-w-[45%]">
                    {r.stunting_status}
                  </Pill>
                </div>
              ))}
            </Card>
          </>
        )}
      </Body>
    </>
  );
}

function Delta({ icon, color, label, value, delta, unit }: { icon: string; color: string; label: string; value: string; delta: number | null; unit: string }) {
  return (
    <Card>
      <Icon name={icon} size={26} className={color} />
      <p className="sb-display text-[26px] mt-1">{value}</p>
      <p className="text-[13px] text-[var(--muted)]">{label}</p>
      {delta !== null && delta !== 0 ? (
        <p className={`text-[13px] font-extrabold mt-0.5 ${delta > 0 ? "text-[var(--green)]" : "text-[#c4302e]"}`}>
          {delta > 0 ? "▲ naik" : "▼ turun"} {num(Math.abs(delta))} {unit}
        </p>
      ) : null}
    </Card>
  );
}

function ZRow({ label, z, status, last }: { label: string; z: number | null; status: string | null; last?: boolean }) {
  return (
    <div className={`flex items-center gap-2 py-2.5 ${last ? "" : "border-b-2 border-dashed border-[var(--track)]"}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-extrabold">{label}</p>
        <p className="text-[13px] text-[var(--muted)]">{zPlain(z)}</p>
      </div>
      {z === null ? (
        <span className="text-[13px] text-[var(--muted)]">—</span>
      ) : (
        <>
          <span className="sb-display text-[15px] w-14 text-right">{fmtZ(z)}</span>
          <Pill tone={statusTone(status)}>{status ?? "—"}</Pill>
        </>
      )}
    </div>
  );
}
