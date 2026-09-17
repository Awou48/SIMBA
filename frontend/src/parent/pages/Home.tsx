import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, ChevronRight } from "lucide-react";
import { api, errorMessage, type AlertItem, type GrowthReport } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Body, Card, ErrorBox, Icon, Loading, Ring, Section, VerdictCard, toneClass } from "../components/ui";
import { CATEGORY_ICON, fmtDate, growthVerdict, immunizationVerdict, kpspVerdict, num, nutritionVerdict, type Tone } from "../../lib/id";
import { cn } from "../../app/components/ui/utils";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

const ALERT_ROUTE: Record<AlertItem["category"], string> = { Growth: "/tumbuh", Nutrition: "/makan", Development: "/kembang", Immunization: "/imunisasi" };
const SEVERITY: Record<AlertItem["severity"], Tone> = { high: "bad", medium: "warn", low: "teal" };

export function Home() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      setReport(await api.parent.report(active.id));
    } catch (err) {
      setError(errorMessage(err, "Data belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const name = active?.name ?? "si kecil";
  const latest = report?.latest;
  const growth = growthVerdict(name, report?.status?.stunting, report?.status?.weight, report?.status?.wasting);
  const nutrition = report ? nutritionVerdict(report.nutrition_7d.fulfillment_percent?.energy, report.nutrition_7d.logged_today || report.nutrition_7d.days_logged > 0) : null;
  const kpsp = report ? kpspVerdict(report.milestones.interpretation, report.milestones.answered, report.milestones.total) : null;
  const immun = report ? immunizationVerdict(report.immunization.overdue, report.immunization.due, report.immunization.next_dose?.name ?? null) : null;
  const alerts = report?.alerts ?? [];
  const energyPct = report?.nutrition_7d.fulfillment_percent?.energy ?? 0;
  const proteinPct = report?.nutrition_7d.fulfillment_percent?.protein ?? 0;

  return (
    <>
      <div className="bg-[var(--yellow)] border-b-2 border-[var(--ink)] px-4 pt-4 pb-9 md:px-8 md:pt-8">
        <div className="max-w-[640px] mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[var(--header-sub)]">{greeting()}</p>
              <h1 className="sb-display text-[25px] leading-8">Bagaimana {name} hari ini?</h1>
            </div>
            <button type="button" onClick={() => navigate("/pengingat")} aria-label="Pengingat" className="relative size-[46px] rounded-full bg-[var(--ink)] text-[var(--yellow)] grid place-items-center sb-press-sm">
              <Bell size={22} />
              {alerts.length > 0 ? <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-[var(--coral)] text-white text-[12px] font-extrabold grid place-items-center border-2 border-[var(--ink)]">{alerts.length}</span> : null}
            </button>
          </div>
          <ChildSwitcher />
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Berat" value={latest ? `${num(latest.weight_kg)} kg` : "—"} />
            <Stat label="Tinggi" value={latest ? `${num(latest.height_cm)} cm` : "—"} />
            <Stat label="Diukur" value={latest ? fmtDate(latest.date, "dayMonth") : "belum"} />
          </div>
        </div>
      </div>

      <Body className="-mt-5 pt-0">
        <ErrorBox message={error} onRetry={load} />
        {loading ? (
          <Loading />
        ) : (
          <>
            <VerdictCard {...growth} onClick={() => navigate(latest ? "/tumbuh" : "/ukur")} action={latest ? "Lihat grafik pertumbuhan" : "Ukur sekarang"} />

            <div className="grid grid-cols-4 gap-2 mb-3 mt-1">
              <Quick icon="ruler" label="Ukur" tone="coral" onClick={() => navigate("/ukur")} />
              <Quick icon="utensils" label="Catat makan" tone="teal" onClick={() => navigate("/makan/tambah")} />
              <Quick icon="syringe" label="Imunisasi" tone="yellow" onClick={() => navigate("/imunisasi")} />
              <Quick icon="file-text" label="Laporan" tone="violet" onClick={() => navigate("/laporan")} />
            </div>

            <Section title="Makan hari ini" action="Lihat" onAction={() => navigate("/makan")} />
            <Card onClick={() => navigate("/makan")}>
              <div className="flex justify-center gap-7">
                <Ring value={energyPct} color="var(--coral)" label={`${Math.round(energyPct)}%`} sub="ENERGI" />
                <Ring value={proteinPct} color="var(--teal)" label={`${Math.round(proteinPct)}%`} sub="PROTEIN" />
              </div>
              <p className="sb-display text-[17px] text-center mt-3">{nutrition?.headline}</p>
              <p className="text-[14px] text-[var(--muted)] text-center leading-5">{nutrition?.detail}</p>
            </Card>

            <Section title="Perlu diperhatikan" />
            {immun ? <VerdictCard {...immun} onClick={() => navigate("/imunisasi")} action="Buka jadwal imunisasi" /> : null}
            {kpsp ? <VerdictCard {...kpsp} onClick={() => navigate("/kembang")} action="Buka perkembangan" /> : null}

            {alerts.length > 0 ? (
              <>
                <Section title="Pengingat" action="Semua" onAction={() => navigate("/pengingat")} />
                {alerts.slice(0, 3).map((a) => (
                  <Card key={a.id} onClick={() => navigate(ALERT_ROUTE[a.category])} pad="p-3">
                    <div className="flex items-center gap-3">
                      <span className={cn("size-[46px] rounded-[14px] sb-outline grid place-items-center shrink-0", toneClass(SEVERITY[a.severity]))}>
                        <Icon name={CATEGORY_ICON[a.category]} size={22} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-extrabold">{a.title}</span>
                        <span className="block text-[13px] text-[var(--muted)] leading-[18px] line-clamp-2">{a.description}</span>
                      </span>
                      <ChevronRight size={20} className="text-[var(--muted)]" />
                    </div>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
      </Body>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--ink)] text-white rounded-2xl py-3 text-center">
      <p className="sb-display text-[18px] leading-6">{value}</p>
      <p className="text-[13px] font-bold text-white/80">{label}</p>
    </div>
  );
}

function Quick({ icon, label, tone, onClick }: { icon: string; label: string; tone: Tone; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-2 group">
      <span className={cn("size-[62px] rounded-[20px] sb-hard-sm group-active:translate-x-px group-active:translate-y-px grid place-items-center", toneClass(tone))}>
        <Icon name={icon} size={28} />
      </span>
      <span className="text-[13px] font-extrabold text-center leading-tight">{label}</span>
    </button>
  );
}
