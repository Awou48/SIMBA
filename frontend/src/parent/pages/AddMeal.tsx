import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { AlertCircle, Plus, Search, Utensils, X } from "lucide-react";
import { api, errorMessage, MEAL_TYPES, type FoodItem, type MealType } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { fmtDate, MEAL_ICON, MEAL_LABEL, num, toDateString } from "../../lib/id";
import { Body, Button, Card, Celebrate, Chips, ErrorBox, Pill, Stepper, YellowBar } from "../components/ui";
import { cn } from "../../app/components/ui/utils";

const SUGGESTIONS = ["Bubur", "Nasi", "Telur", "Ayam", "Ikan", "Tempe", "Tahu", "Pisang", "Susu", "Sayur"];

function defaultMealType(): MealType {
  const h = new Date().getHours();
  return h < 10 ? "Breakfast" : h < 15 ? "Lunch" : h < 18 ? "Snack" : "Dinner";
}

export function AddMeal() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const today = toDateString(new Date());
  const date = params.get("tanggal") ?? today;
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [food, setFood] = useState<FoodItem | null>(null);
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [servings, setServings] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await api.parent.searchFoods({ q: q.trim(), limit: 30 }));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  const save = async () => {
    if (!active || !food) return;
    setBusy(true);
    setError("");
    try {
      await api.parent.logMeal(active.id, { food_id: food.id, meal_type: mealType, date, servings });
      setSaved(true);
      setTimeout(() => navigate(date === today ? "/makan" : `/makan?tanggal=${date}`, { replace: true }), 1100);
    } catch (err) {
      setError(errorMessage(err, "Makanan belum bisa dicatat."));
    } finally {
      setBusy(false);
    }
  };

  if (saved && food)
    return (
      <Body>
        <Celebrate icon="utensils" title="Tercatat!" body={`${food.name} · ${num(servings)} porsi`} />
      </Body>
    );

  if (food)
    return (
      <>
        <YellowBar title="Tambah makanan" subtitle={date === today ? "Hari ini" : fmtDate(date, "day")} onBack={() => setFood(null)} />
        <Body>
          <ErrorBox message={error} />
          <Card>
            <div className="flex items-start justify-between gap-2">
              <p className="sb-display text-[22px]">{food.name}</p>
              <Pill tone={food.safe ? "good" : "warn"}>{food.safe ? "Aman untuk balita" : "Cek usia"}</Pill>
            </div>
            <p className="text-[14px] text-[var(--muted)] mt-1">
              1 porsi = {num(food.energy, 0)} kkal dan {num(food.protein)} g protein
            </p>
          </Card>
          <p className="text-[16px] font-extrabold mb-2">Makan yang mana?</p>
          <Chips options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABEL[m], icon: MEAL_ICON[m] }))} value={mealType} onChange={setMealType} />
          <p className="text-[16px] font-extrabold mb-2">Berapa banyak?</p>
          <Card>
            <Stepper value={servings} onChange={setServings} step={0.5} min={0.5} max={10} unit="porsi" color="teal" />
            <p className="text-center text-[14px] font-bold text-[var(--muted)] mt-2">
              = {num(food.energy * servings, 0)} kkal · {num(food.protein * servings)} g protein
            </p>
          </Card>
          <Button title="Catat" icon="check" onClick={save} loading={busy} />
        </Body>
      </>
    );

  return (
    <>
      <YellowBar title="Apa yang dimakan?" subtitle="Ketik nama makanan atau pilih di bawah" onBack={() => navigate(-1)} />
      <Body>
        <label className="sb-hard-sm rounded-full bg-white flex items-center gap-2.5 px-4 min-h-[56px] mb-3">
          <Search size={22} className="text-[var(--muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Contoh: bubur ayam" autoFocus className="flex-1 bg-transparent outline-none text-[17px] font-bold py-3" />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Hapus pencarian">
              <X size={20} className="text-[var(--muted)]" />
            </button>
          ) : null}
        </label>
        {!q ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setQ(s)} className="sb-outline sb-press-sm rounded-full bg-white px-4 py-2.5 text-[14px] font-extrabold">
                {s}
              </button>
            ))}
          </div>
        ) : null}
        <ErrorBox message={error} />
        {results.length === 0 ? <p className="text-center text-[13px] text-[var(--muted)] mt-6">{!q.trim() ? "Ketik nama makanan atau ketuk pilihan di atas." : searching ? "Mencari…" : "Tidak ditemukan. Coba kata yang lebih sederhana."}</p> : null}
        <div className="flex flex-col gap-2">
          {results.map((item) => (
            <button key={item.id} type="button" onClick={() => setFood(item)} className="sb-hard-sm sb-press-sm rounded-[18px] bg-white flex items-center gap-3 p-3 text-left">
              <span className={cn("size-[46px] rounded-[14px] sb-outline grid place-items-center shrink-0", item.safe ? "sb-tone-teal" : "sb-tone-yellow")}>{item.safe ? <Utensils size={24} /> : <AlertCircle size={24} />}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-extrabold">{item.name}</span>
                <span className="block text-[13px] text-[var(--muted)]">{num(item.energy, 0)} kkal per porsi</span>
              </span>
              <span className="size-10 rounded-full bg-[var(--coral)] text-white sb-outline grid place-items-center">
                <Plus size={22} />
              </span>
            </button>
          ))}
        </div>
      </Body>
    </>
  );
}
