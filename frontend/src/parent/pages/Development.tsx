import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { api, errorMessage, type MilestoneChecklist, type MilestoneItem } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Body, Card, Empty, ErrorBox, Icon, Loading, Progress, Section, VerdictCard, YellowBar } from "../components/ui";
import { DOMAIN_LABEL, kpspVerdict } from "../../lib/id";
import { cn } from "../../app/components/ui/utils";

const DOMAIN_ICON: Record<string, string> = { "Motorik Kasar": "footprints", "Motorik Halus": "hand", Bicara: "message-circle", "Bicara & Bahasa": "message-circle", Sosialisasi: "users", "Sosialisasi & Kemandirian": "users" };

export function Development() {
  const { activeChild: active } = useChildren();
  const [data, setData] = useState<MilestoneChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [reviewAll, setReviewAll] = useState(false);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.parent.milestones(active.id));
    } catch (err) {
      setError(errorMessage(err, "Daftar pertanyaan belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const answer = async (item: MilestoneItem, achieved: boolean) => {
    if (!active) return;
    setSavingId(item.id);
    try {
      setData(await api.parent.answerMilestone(active.id, item.id, achieved));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const next = useMemo(() => data?.items.find((i) => i.achieved === null) ?? null, [data]);
  const verdict = data ? kpspVerdict(data.interpretation, data.answered, data.total) : null;
  const domains = data ? Array.from(new Set(data.items.map((i) => i.domain))) : [];
  const name = active?.name ?? "si kecil";

  return (
    <>
      <YellowBar title="Perkembangan" subtitle="Jawab satu per satu, sambil bermain" />
      <Body>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={load} />
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <Card>
            <Empty icon="puzzle" title="Belum ada pertanyaan untuk usia ini" body="Pertanyaan perkembangan mulai usia 3 bulan dan berubah sesuai usia. Coba lagi nanti." />
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex justify-between mb-2">
                <span className="text-[15px] font-extrabold">Usia {data.age_label ?? `${data.age_in_months} bulan`}</span>
                <span className="text-[14px] font-extrabold text-[#5a43d6]">
                  {data.answered} dari {data.total} dijawab
                </span>
              </div>
              <Progress value={(data.answered / data.total) * 100} color="var(--violet)" />
            </Card>

            {verdict && data.answered === data.total ? <VerdictCard {...verdict} /> : null}

            {next && !reviewAll ? (
              <Card tone="violet" pad="p-5">
                <div className="flex items-center gap-2 text-[#5a43d6]">
                  <Icon name={DOMAIN_ICON[next.domain] ?? "puzzle"} size={20} />
                  <span className="text-[13px] font-extrabold tracking-wide">{(DOMAIN_LABEL[next.domain] ?? next.domain).toUpperCase()}</span>
                </div>
                <p className="sb-display text-[24px] leading-[30px] text-[var(--ink)] mt-1">Apakah {name} bisa {lowerFirst(next.question)}</p>
                {next.expected ? <p className="text-[14px] text-[var(--muted)] leading-5 mt-1">{next.expected}</p> : null}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Choice icon={<Check size={36} strokeWidth={3} />} label="Ya, bisa" cls="sb-tone-good" busy={savingId === next.id} onClick={() => answer(next, true)} />
                  <Choice icon={<Clock size={36} strokeWidth={3} />} label="Belum" cls="sb-tone-yellow" busy={savingId === next.id} onClick={() => answer(next, false)} />
                </div>
              </Card>
            ) : null}

            {data.answered > 0 || reviewAll ? (
              <button type="button" onClick={() => setReviewAll((s) => !s)} className="w-full flex items-center justify-center gap-1.5 py-2 text-[14px] font-extrabold text-[var(--coral)]">
                {reviewAll ? "Kembali ke satu per satu" : "Lihat semua pertanyaan"} {reviewAll ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            ) : null}

            {reviewAll || !next
              ? domains.map((domain) => (
                  <div key={domain}>
                    <Section title={DOMAIN_LABEL[domain] ?? domain} />
                    {data.items
                      .filter((i) => i.domain === domain)
                      .map((item) => (
                        <Card key={item.id} pad="p-3">
                          <p className="text-[15px] font-extrabold leading-[21px] mb-2">{item.question}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Small label="Ya, bisa" on={item.achieved === true} onCls="bg-[var(--green)] text-white" offCls="sb-tone-good" busy={savingId === item.id} onClick={() => answer(item, true)} />
                            <Small label="Belum" on={item.achieved === false} onCls="bg-[#7a5a00] text-white" offCls="sb-tone-yellow" busy={savingId === item.id} onClick={() => answer(item, false)} />
                          </div>
                        </Card>
                      ))}
                  </div>
                ))
              : null}
          </>
        )}
      </Body>
    </>
  );
}

function lowerFirst(s: string) {
  const t = s.trim().replace(/\?$/, "");
  return `${t.charAt(0).toLowerCase()}${t.slice(1)}?`;
}

function Choice({ icon, label, cls, busy, onClick }: { icon: React.ReactNode; label: string; cls: string; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className={cn("sb-hard sb-press rounded-[20px] flex flex-col items-center gap-1.5 py-5 disabled:opacity-60", cls)}>
      {icon}
      <span className="sb-display text-[19px]">{label}</span>
    </button>
  );
}

function Small({ label, on, onCls, offCls, busy, onClick }: { label: string; on: boolean; onCls: string; offCls: string; busy: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={busy} onClick={onClick} className={cn("sb-outline rounded-full py-3 text-[14px] font-extrabold disabled:opacity-60", on ? onCls : offCls)}>
      {label}
    </button>
  );
}
