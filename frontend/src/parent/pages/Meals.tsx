import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { api, errorMessage, MEAL_TYPES, type DailyMealSummary } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Body, Button, Card, Empty, ErrorBox, Icon, Loading, Progress, Ring, Section, VerdictCard, YellowBar } from "../components/ui";
import { fmtDate, MEAL_ICON, MEAL_LABEL, num, nutritionVerdict, toDateString } from "../../lib/id";

const NUTRIENTS = [
  { key: "energy", label: "Energi", color: "var(--coral)", unit: "kkal" },
  { key: "protein", label: "Protein", color: "var(--teal)", unit: "g" },
] as const;

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export function Meals() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const today = toDateString(new Date());
  const date = params.get("tanggal") ?? today;
  const setDate = (d: string) => setParams(d === today ? {} : { tanggal: d }, { replace: true });
  const [summary, setSummary] = useState<DailyMealSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      setSummary(await api.parent.dailyMeals(active.id, date));
    } catch (err) {
      setError(errorMessage(err, "Catatan makan belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }, [active, date]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (mealId: number, name: string) => {
    if (!active || !window.confirm(`Hapus ${name} dari catatan?`)) return;
    try {
      await api.parent.deleteMeal(active.id, mealId);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const t = summary?.totals;
  const targets = summary?.targets;
  const pctOf = (k: (typeof NUTRIENTS)[number]["key"]) => (t && targets && targets[k] > 0 ? (t[k] / targets[k]) * 100 : 0);
  const verdict = nutritionVerdict(targets ? pctOf("energy") : null, (summary?.meals.length ?? 0) > 0);
  const dateLabel = date === today ? "Hari ini" : date === shiftDate(today, -1) ? "Kemarin" : fmtDate(date, "day");

  return (
    <>
      <YellowBar title="Makan" subtitle={`Apa yang ${active?.name ?? "si kecil"} makan`} />
      <Body>
        <ChildSwitcher />
        <div className="sb-hard-sm rounded-full bg-white flex items-center gap-2 p-2 mb-3">
          <button type="button" onClick={() => setDate(shiftDate(date, -1))} aria-label="Hari sebelumnya" className="size-11 rounded-full bg-[var(--yellow-soft)] sb-outline grid place-items-center">
            <ChevronLeft size={22} />
          </button>
          <button type="button" onClick={() => setDate(today)} className="flex-1 text-center">
            <span className="sb-display text-[18px] block">{dateLabel}</span>
            {date !== today ? <span className="text-[12px] text-[var(--muted)] block">ketuk untuk kembali ke hari ini</span> : null}
          </button>
          <button type="button" onClick={() => date < today && setDate(shiftDate(date, 1))} disabled={date >= today} aria-label="Hari berikutnya" className="size-11 rounded-full bg-[var(--yellow-soft)] sb-outline grid place-items-center disabled:opacity-30">
            <ChevronRight size={22} />
          </button>
        </div>

        <ErrorBox message={error} onRetry={load} />
        {loading ? (
          <Loading />
        ) : (
          <>
            <VerdictCard {...verdict} />
            <Card>
              <div className="flex justify-center gap-7 mb-2">
                {NUTRIENTS.map((n) => (
                  <Ring key={n.key} value={pctOf(n.key)} color={n.color} label={`${Math.round(pctOf(n.key))}%`} sub={n.label.toUpperCase()} />
                ))}
              </div>
              {NUTRIENTS.map((n) => (
                <div key={n.key} className="mt-3">
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-[15px] font-extrabold">{n.label}</span>
                    <span className="text-[13px] text-[var(--muted)]">
                      <span className="sb-display text-[15px] text-[var(--ink)]">{num(t?.[n.key] ?? 0, 0)}</span>
                      {targets ? ` dari ${num(targets[n.key], 0)} ${n.unit}` : ` ${n.unit}`}
                    </span>
                  </div>
                  <Progress value={pctOf(n.key)} color={n.color} />
                </div>
              ))}
              {summary?.akg_bracket ? <p className="text-[13px] text-[var(--muted)] text-center mt-4">Kebutuhan harian usia {summary.akg_bracket} (AKG 2019)</p> : null}
            </Card>

            <Button title="Tambah makanan" icon="plus" onClick={() => navigate(`/makan/tambah?tanggal=${date}`)} />

            <Section title="Sudah dicatat" />
            {!summary || summary.meals.length === 0 ? (
              <Card>
                <Empty icon="utensils" title="Belum ada catatan" body="Ketuk “Tambah makanan” dan cari apa yang dimakan si kecil. Camilan juga dihitung." />
              </Card>
            ) : (
              MEAL_TYPES.filter((mt) => summary.meals.some((m) => m.meal_type === mt)).map((mt) => (
                <Card key={mt} pad="p-3">
                  <div className="flex items-center gap-2 text-[#00777a]">
                    <Icon name={MEAL_ICON[mt]} size={20} />
                    <span className="text-[15px] font-extrabold text-[var(--ink)]">{MEAL_LABEL[mt]}</span>
                  </div>
                  {summary.meals
                    .filter((m) => m.meal_type === mt)
                    .map((m) => (
                      <div key={m.id} className="flex items-center gap-3 pt-2.5 mt-2.5 sb-dashed">
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-extrabold">{m.food_name}</p>
                          <p className="text-[13px] text-[var(--muted)]">
                            {num(m.servings)} porsi · {num(m.energy, 0)} kkal · {num(m.protein)} g protein
                          </p>
                        </div>
                        <button type="button" onClick={() => remove(m.id, m.food_name)} aria-label="Hapus" className="size-9 rounded-full bg-[var(--track)] sb-outline grid place-items-center">
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                </Card>
              ))
            )}
          </>
        )}
      </Body>
    </>
  );
}
