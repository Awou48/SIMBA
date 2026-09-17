import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api, errorMessage, type Measurement } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { growthVerdict, num, statusTone, toDateString, zPlain } from "../../lib/id";
import { Body, Button, Card, Celebrate, Chips, DateField, ErrorBox, Pill, Stepper, VerdictCard, YellowBar } from "../components/ui";

type When = "today" | "yesterday" | "other";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

export function Measure() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [weight, setWeight] = useState(9);
  const [height, setHeight] = useState(75);
  const [when, setWhen] = useState<When>("today");
  const [otherDate, setOtherDate] = useState(daysAgo(2));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Measurement | null>(null);

  useEffect(() => {
    if (!active) return;
    api.parent
      .listMeasurements(active.id)
      .then((rows) => {
        const last = rows[rows.length - 1];
        if (last) {
          setWeight(last.weight_kg);
          setHeight(last.height_cm);
        }
      })
      .catch(() => undefined);
  }, [active]);

  const date = when === "today" ? daysAgo(0) : when === "yesterday" ? daysAgo(1) : otherDate;

  const submit = async () => {
    if (!active) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Pilih tanggal pengukuran dulu, ya.");
    setBusy(true);
    setError("");
    try {
      setResult(await api.parent.logMeasurement(active.id, { weight_kg: +weight.toFixed(1), height_cm: +height.toFixed(1), date_logged: date }));
    } catch (err) {
      setError(errorMessage(err, "Pengukuran belum bisa disimpan."));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const v = growthVerdict(active?.name ?? "Si kecil", result.stunting_status, result.weight_status, result.wasting_status);
    return (
      <Body>
        <Celebrate title="Tersimpan!" body={`${active?.name} · ${num(result.weight_kg)} kg · ${num(result.height_cm)} cm`} />
        <VerdictCard {...v} />
        <Card>
          <p className="text-[16px] font-extrabold mb-1">Dibanding anak seusianya</p>
          <Plain label="Berat badan" z={result.wfa_zscore} status={result.weight_status} />
          <Plain label="Tinggi badan" z={result.lhfa_zscore} status={result.stunting_status} />
          {result.wfh_zscore !== null ? <Plain label="Berat menurut tinggi" z={result.wfh_zscore} status={result.wasting_status} /> : null}
        </Card>
        <Button title="Selesai" icon="check" onClick={() => navigate("/tumbuh")} />
      </Body>
    );
  }

  return (
    <>
      <YellowBar title={`Ukur ${active?.name ?? ""}`} subtitle="Masukkan berat dan tinggi hari ini" onBack={() => navigate(-1)} />
      <Body>
        <ErrorBox message={error} />
        <Card>
          <p className="text-[16px] font-extrabold mb-2">Berat badan</p>
          <Stepper value={weight} onChange={setWeight} step={0.1} min={1} max={40} unit="kilogram" color="coral" />
          <input type="range" className="sb-range mt-2" min={1} max={40} step={0.1} value={weight} onChange={(e) => setWeight(+e.target.value)} aria-label="Geser berat" />
        </Card>
        <Card>
          <p className="text-[16px] font-extrabold mb-2">Tinggi badan</p>
          <Stepper value={height} onChange={setHeight} step={0.5} min={30} max={130} unit="sentimeter" color="teal" />
          <input type="range" className="sb-range teal mt-2" min={30} max={130} step={0.5} value={height} onChange={(e) => setHeight(+e.target.value)} aria-label="Geser tinggi" />
          <p className="text-[13px] text-[var(--muted)] mt-1 leading-[18px]">Di bawah 2 tahun: ukur sambil berbaring. Di atas 2 tahun: berdiri tegak.</p>
        </Card>
        <Card>
          <p className="text-[16px] font-extrabold mb-2">Kapan diukur?</p>
          <Chips
            options={[
              { value: "today", label: "Hari ini", icon: "map-pin" },
              { value: "yesterday", label: "Kemarin", icon: "clock" },
              { value: "other", label: "Tanggal lain", icon: "calendar" },
            ]}
            value={when}
            onChange={setWhen}
          />
          {when === "other" ? <DateField label="Tanggal pengukuran" value={otherDate} onChange={setOtherDate} max={toDateString(new Date())} /> : null}
        </Card>
        <Button title="Simpan" icon="check" onClick={submit} loading={busy} />
      </Body>
    </>
  );
}

function Plain({ label, z, status }: { label: string; z: number | null; status: string | null }) {
  return (
    <div className="flex items-center gap-2 py-2.5 sb-dashed">
      <div className="flex-1">
        <p className="text-[15px] font-extrabold">{label}</p>
        <p className="text-[13px] text-[var(--muted)]">{zPlain(z)}</p>
      </div>
      <Pill tone={statusTone(status)}>{status ?? "—"}</Pill>
    </div>
  );
}
