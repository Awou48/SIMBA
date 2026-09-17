import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, downloadBlob, errorMessage, type GrowthReport } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Body, Button, Card, Empty, ErrorBox, Icon, Loading, Pill, Section, YellowBar } from "../components/ui";
import { fmtDate, growthVerdict, immunizationVerdict, kpspVerdict, num, statusTone, zPlain } from "../../lib/id";

export function Reports() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      setReport(await api.parent.report(active.id));
    } catch (err) {
      setError(errorMessage(err, "Laporan belum bisa dibuat."));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async () => {
    if (!active) return;
    setDownloading(true);
    setError("");
    try {
      const blob = await api.parent.reportPdf(active.id);
      downloadBlob(blob, `SIMBA-${active.name.replace(/\s+/g, "_")}-${report?.generated_on?.slice(0, 10) ?? "laporan"}.pdf`);
    } catch (err) {
      setError(errorMessage(err, "PDF belum bisa diunduh."));
    } finally {
      setDownloading(false);
    }
  };

  const latest = report?.latest;
  const name = active?.name ?? "Si kecil";
  const growth = report ? growthVerdict(name, report.status?.stunting, report.status?.weight, report.status?.wasting) : null;
  const kpsp = report ? kpspVerdict(report.milestones.interpretation, report.milestones.answered, report.milestones.total) : null;
  const immun = report ? immunizationVerdict(report.immunization.overdue, report.immunization.due, report.immunization.next_dose?.name ?? null) : null;
  const n7 = report?.nutrition_7d;

  return (
    <>
      <YellowBar title="Laporan" subtitle={report ? `Diperbarui ${fmtDate(report.generated_on)}` : undefined} onBack={() => navigate(-1)} />
      <Body>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={load} />
        {loading || !report ? (
          <Loading />
        ) : (
          <>
            <Card tone="violet">
              <p className="sb-display text-[20px] text-[var(--ink)]">Bawa saat ke Posyandu atau dokter</p>
              <p className="text-[14px] text-[var(--ink)]/85 leading-5 mt-1">PDF berisi grafik pertumbuhan, catatan makan, perkembangan, dan imunisasi {name}.</p>
              <Button title="Unduh PDF" icon="download" variant="ink" onClick={download} loading={downloading} className="mt-3" />
            </Card>

            <Section title="Pertumbuhan" />
            {latest && growth ? (
              <Card>
                <div className="flex items-center gap-3">
                  <Icon name={growth.icon} size={30} className={`sb-tone-${growth.tone} bg-transparent`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-extrabold leading-[21px]">{growth.headline}</p>
                    <p className="text-[13px] text-[var(--muted)]">Diukur {fmtDate(latest.date)}</p>
                  </div>
                </div>
                <Line label={`Berat · ${num(latest.weight_kg)} kg`} plain={zPlain(latest.wfa_zscore)} status={report.status?.weight ?? null} />
                <Line label={`Tinggi · ${num(latest.height_cm)} cm`} plain={zPlain(latest.lhfa_zscore)} status={report.status?.stunting ?? null} />
                {report.change_since_first ? (
                  <p className="text-[13px] text-[var(--muted)] mt-2 leading-[18px]">
                    Sejak pengukuran pertama ({report.change_since_first.days} hari lalu): {report.change_since_first.weight_kg >= 0 ? "naik" : "turun"} {num(Math.abs(report.change_since_first.weight_kg))} kg dan {report.change_since_first.height_cm >= 0 ? "naik" : "turun"} {num(Math.abs(report.change_since_first.height_cm))} cm.
                  </p>
                ) : null}
              </Card>
            ) : (
              <Card>
                <Empty icon="ruler" title="Belum ada pengukuran" body="Ukur berat dan tinggi untuk mengisi bagian ini." />
              </Card>
            )}

            <Section title="Makan minggu ini" />
            <Card>
              <p className="text-[13px] text-[var(--muted)]">Tercatat {n7?.days_logged ?? 0} dari 7 hari</p>
              {n7?.targets ? (
                <div className="mt-2 space-y-2">
                  {(["energy", "protein"] as const).map((k) => (
                    <div key={k} className="flex justify-between text-[15px]">
                      <span className="font-extrabold">{k === "energy" ? "Energi" : "Protein"}</span>
                      <span className="text-[var(--muted)] text-[13px]">
                        <span className="sb-display text-[15px] text-[var(--ink)]">{Math.round(n7.fulfillment_percent?.[k] ?? 0)}%</span> dari kebutuhan
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--muted)] mt-1">Belum ada target harian untuk usia ini.</p>
              )}
            </Card>

            <Section title="Perkembangan & imunisasi" />
            <Card>
              {kpsp ? (
                <div className="flex items-center gap-3 py-2">
                  <Icon name={kpsp.icon} size={26} className={`sb-tone-${kpsp.tone} bg-transparent`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-extrabold">{kpsp.headline}</p>
                    <p className="text-[13px] text-[var(--muted)]">
                      {report.milestones.achieved} dari {report.milestones.total} kemampuan{report.milestones.age_label ? ` · usia ${report.milestones.age_label}` : ""}
                    </p>
                  </div>
                </div>
              ) : null}
              {immun ? (
                <div className="flex items-center gap-3 py-2 sb-dashed">
                  <Icon name={immun.icon} size={26} className={`sb-tone-${immun.tone} bg-transparent`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-extrabold">{immun.headline}</p>
                    <p className="text-[13px] text-[var(--muted)]">
                      {report.immunization.given} dari {report.immunization.total} dosis selesai
                    </p>
                  </div>
                </div>
              ) : null}
            </Card>
          </>
        )}
      </Body>
    </>
  );
}

function Line({ label, plain, status }: { label: string; plain: string; status: string | null }) {
  return (
    <div className="flex items-center gap-2 py-2.5 sb-dashed mt-1">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-extrabold">{label}</p>
        <p className="text-[13px] text-[var(--muted)]">{plain}</p>
      </div>
      <Pill tone={statusTone(status)}>{status ?? "—"}</Pill>
    </div>
  );
}
