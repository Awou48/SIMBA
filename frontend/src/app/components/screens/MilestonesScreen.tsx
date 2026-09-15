import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, AlertCircle, Check, X, Loader2, RotateCcw } from "lucide-react";
import { api, errorMessage as toMessage, formatAge, type MilestoneChecklist } from "../../../lib/api";
import { useChildren } from "../../ChildContext";

const FONT = "'Nunito', sans-serif";

const BRACKETS = [
  { label: "0–6 mo", months: 0 },
  { label: "6–12 mo", months: 6 },
  { label: "12–24 mo", months: 12 },
  { label: "2–3 yr", months: 24 },
  { label: "3–4 yr", months: 36 },
  { label: "4–5 yr", months: 48 },
];

const domainMeta: Record<string, { color: string; bg: string; icon: string }> = {
  "Motorik Kasar": { color: "#4F46E5", bg: "#EEF2FF", icon: "🏃" },
  "Motorik Halus": { color: "#06B6D4", bg: "#ECFEFF", icon: "✋" },
  "Bicara & Bahasa": { color: "#F47B20", bg: "#FFF7ED", icon: "💬" },
  Sosialisasi: { color: "#5CC8C2", bg: "#E8F9F8", icon: "🤝" },
  Kemandirian: { color: "#9B8BF4", bg: "#F0EDFF", icon: "🌟" },
};

function verdictTone(interpretation: string | null) {
  if (!interpretation) return { color: "#717182", bg: "#F5F5F5", emoji: "📝" };
  if (interpretation.startsWith("Sesuai")) return { color: "#2BA89F", bg: "#E8F9F8", emoji: "🎉" };
  if (interpretation.startsWith("Meragukan")) return { color: "#F47B20", bg: "#FFF0E0", emoji: "🤔" };
  return { color: "#E53535", bg: "#FFF0F0", emoji: "🩺" };
}

function bracketFor(ageMonths: number): number {
  const b = [...BRACKETS].reverse().find((x) => ageMonths >= x.months);
  return b ? b.months : 0;
}

export function MilestonesScreen() {
  const navigate = useNavigate();
  const { activeChild: child, isLoading: childLoading } = useChildren();

  const [bracket, setBracket] = useState<number | null>(null);
  const [data, setData] = useState<MilestoneChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (childLoading) return;
    if (!child) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api.parent
      .milestones(child.id, bracket ?? undefined)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(toMessage(err, "Failed to load milestones.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [child?.id, childLoading, bracket]);

  const answer = async (milestoneId: number, achieved: boolean) => {
    if (!child) return;
    setSavingId(milestoneId);
    setError("");
    try {
      setData(await api.parent.answerMilestone(child.id, milestoneId, achieved));
    } catch (err) {
      setError(toMessage(err, "Failed to save your answer."));
    } finally {
      setSavingId(null);
    }
  };

  const currentBracket = data ? bracketFor(data.age_in_months) : 0;
  const selectedBracket = bracket ?? currentBracket;
  const tone = verdictTone(data?.interpretation ?? null);
  const progress = data && data.total ? (data.answered / data.total) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>🏁 Milestones</h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>
            {child ? `${child.name} · ${formatAge(child.birth_date)}` : "KPSP development screening"}
          </p>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{error}</p>
          </div>
        )}

        {!childLoading && !child && (
          <button onClick={() => navigate("/add-child")} className="w-full py-3 rounded-2xl font-bold text-white" style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", fontFamily: FONT }}>
            ➕ Add a child profile to start screening
          </button>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {BRACKETS.map((b) => {
            const isCurrent = b.months === currentBracket;
            const isSelected = b.months === selectedBracket;
            return (
              <button
                key={b.months}
                onClick={() => setBracket(isCurrent ? null : b.months)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: isSelected ? "#9B8BF4" : "white",
                  color: isSelected ? "white" : "#717182",
                  border: isCurrent && !isSelected ? "1.5px dashed #9B8BF4" : "1.5px solid transparent",
                  fontSize: "11px", fontWeight: 800, fontFamily: FONT,
                  boxShadow: isSelected ? "0 4px 12px rgba(155,139,244,0.4)" : "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                {b.label}{isCurrent ? " ✦" : ""}
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl p-4" style={{ background: "linear-gradient(135deg, #9B8BF4 0%, #6D5BD0 100%)", boxShadow: "0 8px 24px rgba(155,139,244,0.35)" }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: FONT, fontWeight: 700 }}>
                {data?.age_label ?? "Screening checklist"}
              </p>
              <p style={{ fontSize: "26px", fontWeight: 900, color: "white", fontFamily: FONT, lineHeight: 1.1 }}>
                {data ? `${data.achieved}/${data.total}` : "–"}<span style={{ fontSize: "13px", fontWeight: 700 }}> achieved</span>
              </p>
            </div>
            <span style={{ fontSize: 34 }}>{tone.emoji}</span>
          </div>
          <div className="w-full bg-white/30 rounded-full h-1.5 mb-2">
            <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.9)", fontFamily: FONT, fontWeight: 700 }}>
            {data?.interpretation
              ? `KPSP result: ${data.interpretation}`
              : data && data.total > 0
                ? `Answer ${data.total - data.answered} more question${data.total - data.answered === 1 ? "" : "s"} to get the KPSP result`
                : "No questions for this age bracket yet"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={22} style={{ color: "#9B8BF4" }} /></div>
          ) : (
            data?.items.map((item) => {
              const dm = domainMeta[item.domain] ?? { color: "#717182", bg: "#F5F5F5", icon: "🧠" };
              const saving = savingId === item.id;
              return (
                <div key={item.id} className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: `4px solid ${dm.color}` }}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, background: dm.bg }}>
                      <span style={{ fontSize: 16 }}>{dm.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="px-2 py-0.5 rounded-full" style={{ background: dm.bg, fontSize: "9px", fontWeight: 800, color: dm.color, fontFamily: FONT }}>{item.domain}</span>
                      <p style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: FONT, marginTop: 4, lineHeight: 1.4 }}>
                        Can {child?.name ?? "your child"}: {item.question.charAt(0).toLowerCase() + item.question.slice(1)}?
                      </p>
                      {item.answered_on && (
                        <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600, marginTop: 2 }}>
                          Answered {new Date(item.answered_on).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {[
                      { value: true, label: "Yes", icon: <Check size={14} />, color: "#2BA89F", bg: "#E8F9F8" },
                      { value: false, label: "Not yet", icon: <X size={14} />, color: "#E53535", bg: "#FFF0F0" },
                    ].map((opt) => {
                      const selected = item.achieved === opt.value;
                      return (
                        <button
                          key={opt.label}
                          onClick={() => answer(item.id, opt.value)}
                          disabled={saving}
                          className="flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60"
                          style={{
                            background: selected ? opt.color : opt.bg,
                            color: selected ? "white" : opt.color,
                            fontSize: "12px", fontWeight: 800, fontFamily: FONT,
                            boxShadow: selected ? `0 4px 12px ${opt.color}55` : "none",
                          }}
                        >
                          {saving && selected ? <Loader2 size={14} className="animate-spin" /> : opt.icon} {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {data?.interpretation && !data.interpretation.startsWith("Sesuai") && (
          <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: tone.bg }}>
            <RotateCcw size={16} style={{ color: tone.color, marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: "11px", fontWeight: 700, color: tone.color, fontFamily: FONT, lineHeight: 1.5 }}>
              {data.interpretation.startsWith("Meragukan")
                ? "Encourage these skills through play and re-check in 2 weeks. If still uncertain, consult a Posyandu/Puskesmas health worker."
                : "Please bring this result to a Posyandu/Puskesmas health worker for a full developmental assessment."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
