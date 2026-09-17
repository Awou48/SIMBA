import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Check, X } from "lucide-react";
import { api, errorMessage, EVENT_TYPES, type EventType, type HealthEvent } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Body, Button, Card, Chips, DateField, Empty, ErrorBox, Field, Loading, Pill, Section, YellowBar, toneClass } from "../components/ui";
import { EVENT_LABEL, fmtDate, parseDate, toDateString, type Tone } from "../../lib/id";
import { cn } from "../../app/components/ui/utils";

const TYPE_TONE: Record<EventType, Tone> = { Vaccination: "teal", "Doctor Visit": "violet", Checkup: "yellow", Other: "muted" };
const TYPE_ICON: Record<EventType, string> = { Vaccination: "syringe", "Doctor Visit": "stethoscope", Checkup: "clipboard-list", Other: "bookmark" };
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

export function Calendar() {
  const { activeChild: active } = useChildren();
  const navigate = useNavigate();
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", event_type: "Checkup" as EventType, date: toDateString(new Date()), time: "", notes: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError("");
    try {
      setEvents(await api.parent.listEvents(active.id));
    } catch (err) {
      setError(errorMessage(err, "Kalender belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }, [active]);

  useEffect(() => {
    load();
  }, [load]);

  const today = toDateString(new Date());
  const upcoming = events.filter((e) => !e.done && e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = events.filter((e) => e.done || e.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!active) return;
    if (form.title.trim().length < 2) return setError("Tulis nama kegiatannya dulu.");
    setBusy(true);
    setError("");
    try {
      await api.parent.createEvent(active.id, { title: form.title.trim(), event_type: form.event_type, date: form.date, time: form.time || null, notes: form.notes.trim() || null });
      setAdding(false);
      setForm({ title: "", event_type: "Checkup", date: today, time: "", notes: "" });
      load();
    } catch (err) {
      setError(errorMessage(err, "Kegiatan belum bisa disimpan."));
    } finally {
      setBusy(false);
    }
  };

  const toggleDone = async (ev: HealthEvent) => {
    if (!active) return;
    try {
      const saved = await api.parent.updateEvent(active.id, ev.id, { done: !ev.done });
      setEvents((p) => p.map((x) => (x.id === saved.id ? saved : x)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (ev: HealthEvent) => {
    if (!active) return;
    if (ev.vaccine_code) return window.alert("Terhubung ke imunisasi. Batalkan dosis ini dari halaman Imunisasi.");
    if (!window.confirm(`Hapus kegiatan "${ev.title}"?`)) return;
    try {
      await api.parent.deleteEvent(active.id, ev.id);
      setEvents((p) => p.filter((x) => x.id !== ev.id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const EventRow = ({ ev }: { ev: HealthEvent }) => {
    const d = parseDate(ev.date);
    const tone = TYPE_TONE[ev.event_type];
    return (
      <Card pad="p-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => toggleDone(ev)} aria-label="Tandai selesai" className={cn("w-14 h-[60px] rounded-[14px] sb-outline grid place-items-center shrink-0", ev.done ? "bg-[var(--green)] text-white" : toneClass(tone))}>
            {ev.done ? (
              <Check size={26} />
            ) : (
              <span className="text-center leading-none">
                <span className="sb-display text-[22px] block">{d.getDate()}</span>
                <span className="text-[12px] font-extrabold">{MONTHS[d.getMonth()]}</span>
              </span>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <p className={cn("text-[15px] font-extrabold", ev.done && "line-through text-[var(--muted)]")}>{ev.title}</p>
            <p className="text-[13px] text-[var(--muted)]">
              {fmtDate(ev.date, "day")}
              {ev.time ? ` · ${ev.time.slice(0, 5).replace(":", ".")}` : ""}
              {ev.notes ? ` · ${ev.notes}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Pill tone={tone}>{EVENT_LABEL[ev.event_type]}</Pill>
            <button type="button" onClick={() => remove(ev)} aria-label="Hapus" className="text-[var(--muted)]">
              <X size={18} />
            </button>
          </div>
        </div>
      </Card>
    );
  };

  if (adding)
    return (
      <>
        <YellowBar title="Jadwal baru" onBack={() => setAdding(false)} />
        <Body>
          <form onSubmit={save}>
            <ErrorBox message={error} />
            <Card>
              <Field label="Kegiatan" icon="pencil" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: Penimbangan Posyandu" />
              <p className="text-[14px] font-extrabold mb-1.5">Jenis</p>
              <Chips options={EVENT_TYPES.map((t) => ({ value: t, label: EVENT_LABEL[t], icon: TYPE_ICON[t] }))} value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} />
              <DateField label="Tanggal" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
              <Field label="Jam (boleh dikosongkan)" icon="clock" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              <Field label="Catatan (boleh dikosongkan)" icon="file-text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Bawa buku KIA" className="mb-0" />
            </Card>
            <Button title="Simpan" icon="check" type="submit" loading={busy} />
          </form>
        </Body>
      </>
    );

  return (
    <>
      <YellowBar title="Kalender" subtitle="Posyandu, dokter, imunisasi" onBack={() => navigate(-1)} right={<Button title="Tambah" icon="plus" variant="white" small onClick={() => setAdding(true)} />} />
      <Body>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={load} />
        {loading ? (
          <Loading />
        ) : (
          <>
            <Section title="Akan datang" />
            {upcoming.length === 0 ? (
              <Card>
                <Empty icon="calendar" title="Belum ada jadwal" body="Tambahkan jadwal Posyandu atau kunjungan dokter agar tidak terlewat." />
              </Card>
            ) : (
              upcoming.map((ev) => <EventRow key={ev.id} ev={ev} />)
            )}
            {past.length > 0 ? (
              <>
                <Section title="Selesai & lampau" />
                {past.slice(0, 20).map((ev) => <EventRow key={ev.id} ev={ev} />)}
              </>
            ) : null}
            <p className="text-center text-[13px] text-[var(--muted)] mt-2">Ketuk kotak tanggal untuk menandai selesai.</p>
          </>
        )}
      </Body>
    </>
  );
}
