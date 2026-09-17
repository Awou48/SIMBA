import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Check } from "lucide-react";
import { api, errorMessage, type DoseStatus, type ImmunizationSummary, type VaccineDose } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Body, Card, ErrorBox, Loading, Pill, Progress, VerdictCard, YellowBar } from "../components/ui";
import { fmtDate, immunizationVerdict, type Tone } from "../../lib/id";
import { cn } from "../../app/components/ui/utils";

const STATUS_TONE: Record<DoseStatus, Tone> = { given: "good", due: "warn", overdue: "bad", upcoming: "muted" };
const STATUS_LABEL: Record<DoseStatus, string> = { given: "Selesai", due: "Saatnya", overdue: "Terlambat", upcoming: "Nanti" };

export function Immunization() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [data, setData] = useState<ImmunizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.parent.immunizations(active.id));
    } catch (err) {
      setError(errorMessage(err, "Jadwal imunisasi belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (dose: VaccineDose) => {
    if (!active) return;
    if (dose.status === "given" && !window.confirm(`Batalkan tanda? ${dose.name} akan ditandai belum diberikan.`)) return;
    setBusyCode(dose.code);
    try {
      setData(dose.status === "given" ? await api.parent.unmarkDoseGiven(active.id, dose.code) : await api.parent.markDoseGiven(active.id, dose.code));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyCode(null);
    }
  };

  const groups = data ? Array.from(new Set(data.schedule.map((d) => d.due_age_months))).map((m) => ({ months: m, doses: data.schedule.filter((d) => d.due_age_months === m) })) : [];
  const total = data?.schedule.length ?? 0;
  const verdict = data ? immunizationVerdict(data.overdue, data.due, data.next_dose?.name ?? null) : null;

  return (
    <>
      <YellowBar title="Imunisasi" subtitle="Ketuk kotak jika sudah diberikan" onBack={() => navigate(-1)} />
      <Body>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={load} />
        {loading || !data ? (
          <Loading />
        ) : (
          <>
            {verdict ? <VerdictCard {...verdict} /> : null}
            <Card>
              <div className="flex justify-between mb-2">
                <span className="text-[15px] font-extrabold">
                  {data.given} dari {total} dosis selesai
                </span>
                <span className="text-[14px] font-extrabold text-[#00777a]">{total ? Math.round((data.given / total) * 100) : 0}%</span>
              </div>
              <Progress value={total ? (data.given / total) * 100 : 0} color="var(--teal)" />
            </Card>
            {groups.map((g) => (
              <div key={g.months}>
                <p className="text-[15px] font-extrabold mt-2 mb-2">{g.months === 0 ? "Saat lahir" : `Usia ${g.months} bulan`}</p>
                <Card pad="px-4 py-1">
                  {g.doses.map((d, i) => {
                    const done = d.status === "given";
                    return (
                      <button key={d.code} type="button" onClick={() => toggle(d)} disabled={busyCode === d.code} className={cn("w-full flex items-center gap-3 py-3 text-left disabled:opacity-50", i > 0 && "sb-dashed")}>
                        <span className={cn("size-[34px] rounded-[10px] border-2 grid place-items-center shrink-0", done ? "bg-[var(--green)] border-[var(--ink)] text-white" : d.status === "overdue" ? "bg-white border-[var(--coral)]" : "bg-white border-[var(--ink)]")}>{done ? <Check size={20} /> : null}</span>
                        <span className="flex-1 min-w-0">
                          <span className={cn("block text-[15px] font-extrabold", done && "text-[var(--muted)]")}>{d.name}</span>
                          <span className="block text-[13px] text-[var(--muted)]">{done && d.given_on ? `Diberikan ${fmtDate(d.given_on)}` : d.status === "overdue" ? `Seharusnya ${fmtDate(d.due_date)}` : `Jadwal ${fmtDate(d.due_date)}`}</span>
                        </span>
                        <Pill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Pill>
                      </button>
                    );
                  })}
                </Card>
              </div>
            ))}
          </>
        )}
      </Body>
    </>
  );
}
