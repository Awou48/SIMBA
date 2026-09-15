import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Plus, X, Syringe, Stethoscope, Activity, Check, Trash2, Loader2, AlertCircle, Undo2 } from "lucide-react";
import {
  api,
  errorMessage as toMessage,
  toDateString,
  EVENT_TYPES,
  type EventType,
  type HealthEvent,
  type ImmunizationSummary,
  type VaccineDose,
} from "../../../lib/api";
import { useChildren } from "../../ChildContext";
import { FrameModal } from "../FrameModal";

const FONT = "'Nunito', sans-serif";

const typeIcons: Record<EventType, React.ReactNode> = {
  Vaccination: <Syringe size={12} />,
  "Doctor Visit": <Stethoscope size={12} />,
  Checkup: <Activity size={12} />,
  Other: <Plus size={12} />,
};
const typeColors: Record<EventType, { color: string; bg: string }> = {
  Vaccination: { color: "#F47B20", bg: "#FFF0E0" },
  "Doctor Visit": { color: "#5CC8C2", bg: "#E8F9F8" },
  Checkup: { color: "#9B8BF4", bg: "#F0EDFF" },
  Other: { color: "#FFC72C", bg: "#FFF8E0" },
};
const doseTone: Record<VaccineDose["status"], { color: string; bg: string; label: string }> = {
  given: { color: "#2BA89F", bg: "#E8F9F8", label: "Given" },
  due: { color: "#F47B20", bg: "#FFF0E0", label: "Due now" },
  overdue: { color: "#E53535", bg: "#FFF0F0", label: "Overdue" },
  upcoming: { color: "#9BA3B8", bg: "#F5F5F5", label: "Upcoming" },
};

const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function fmtDate(iso: string, withYear = false) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

type CalendarMark = { date: string; kind: "event" | "dose"; color: string };

export function ImmunizationScreen() {
  const navigate = useNavigate();
  const { activeChild: child, isLoading: childLoading } = useChildren();

  const today = toDateString(new Date());
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [summary, setSummary] = useState<ImmunizationSummary | null>(null);
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [showAllDoses, setShowAllDoses] = useState(false);

  const [recording, setRecording] = useState<{ dose: VaccineDose; date: string; notes: string } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<{ title: string; date: string; time: string; type: EventType; notes: string }>({ title: "", date: today, time: "", type: "Doctor Visit", notes: "" });

  const load = async (childId: number) => {
    const [s, e] = await Promise.all([api.parent.immunizations(childId), api.parent.listEvents(childId)]);
    setSummary(s);
    setEvents(e);
  };

  useEffect(() => {
    if (childLoading) return;
    if (!child) { setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    load(child.id)
      .catch((err) => { if (!cancelled) setError(toMessage(err, "Failed to load the schedule.")); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [child?.id, childLoading]);

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

  const marks = useMemo<CalendarMark[]>(() => {
    const out: CalendarMark[] = events
      .filter((e) => !e.vaccine_code)
      .map((e) => ({ date: e.date, kind: "event", color: typeColors[e.event_type].color }));
    for (const d of summary?.schedule ?? []) {
      if (d.status === "given" && d.given_on) out.push({ date: d.given_on, kind: "dose", color: doseTone.given.color });
      else if (d.status !== "given") out.push({ date: d.due_date, kind: "dose", color: doseTone[d.status].color });
    }
    return out;
  }, [events, summary]);

  const marksByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of marks) {
      if (!m.date.startsWith(monthPrefix)) continue;
      const list = map.get(m.date) ?? [];
      if (!list.includes(m.color)) list.push(m.color);
      map.set(m.date, list);
    }
    return map;
  }, [marks, monthPrefix]);

  const shiftMonth = (delta: number) => {
    setSelectedDay(null);
    setCursor(({ year, month }) => { const d = new Date(year, month + delta, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  };

  const agenda = useMemo(() => {
    const items: { key: string; date: string; title: string; subtitle: string; type: EventType; status?: VaccineDose["status"]; event?: HealthEvent; dose?: VaccineDose }[] = [];
    for (const e of events) {
      if (e.vaccine_code) continue;
      items.push({ key: `e${e.id}`, date: e.date, title: e.title, subtitle: `${fmtDate(e.date, true)}${e.time ? ` · ⏰ ${e.time}` : ""}${e.notes ? ` · 📝 ${e.notes}` : ""}`, type: e.event_type, event: e });
    }
    for (const d of summary?.schedule ?? []) {
      if (d.status === "given") continue;
      items.push({ key: `d${d.code}`, date: d.due_date, title: d.name, subtitle: `Due ${fmtDate(d.due_date, true)} · at ${d.due_age_months} mo${d.note ? ` · ${d.note}` : ""}`, type: "Vaccination", status: d.status, dose: d });
    }
    const filtered = selectedDay ? items.filter((i) => i.date === selectedDay) : items.filter((i) => i.event ? !i.event.done : true);
    return filtered.sort((a, b) => a.date.localeCompare(b.date)).slice(0, selectedDay ? 50 : 8);
  }, [events, summary, selectedDay]);

  const openRecord = (dose: VaccineDose) =>
    setRecording({ dose, date: dose.due_date <= today ? dose.due_date : today, notes: "" });

  const saveRecord = async () => {
    if (!child || !recording) return;
    setBusyCode(recording.dose.code);
    setError("");
    try {
      const s = await api.parent.markDoseGiven(child.id, recording.dose.code, {
        given_on: recording.date,
        notes: recording.notes.trim() || undefined,
      });
      setSummary(s);
      setEvents(await api.parent.listEvents(child.id));
      setRecording(null);
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyCode(null);
    }
  };

  const undoGiven = async (dose: VaccineDose) => {
    if (!child) return;
    setBusyCode(dose.code);
    setError("");
    try {
      setSummary(await api.parent.unmarkDoseGiven(child.id, dose.code));
      setEvents(await api.parent.listEvents(child.id));
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusyCode(null);
    }
  };

  const toggleEventDone = async (e: HealthEvent) => {
    if (!child) return;
    try {
      const updated = await api.parent.updateEvent(child.id, e.id, { done: !e.done });
      setEvents((prev) => prev.map((x) => (x.id === e.id ? updated : x)));
    } catch (err) {
      setError(toMessage(err));
    }
  };

  const deleteEvent = async (e: HealthEvent) => {
    if (!child) return;
    try {
      await api.parent.deleteEvent(child.id, e.id);
      setEvents((prev) => prev.filter((x) => x.id !== e.id));
    } catch (err) {
      setError(toMessage(err));
    }
  };

  const handleSaveEvent = async () => {
    if (!child || !form.title.trim() || !form.date) return;
    setIsSaving(true);
    setError("");
    try {
      const created = await api.parent.createEvent(child.id, {
        title: form.title.trim(),
        event_type: form.type,
        date: form.date,
        time: form.time || null,
        notes: form.notes.trim() || null,
      });
      setEvents((prev) => [...prev, created]);
      setForm({ title: "", date: today, time: "", type: "Doctor Visit", notes: "" });
      setShowAddForm(false);
      const d = new Date(created.date + "T00:00:00");
      setCursor({ year: d.getFullYear(), month: d.getMonth() });
    } catch (err) {
      setError(toMessage(err, "Failed to save the event."));
    } finally {
      setIsSaving(false);
    }
  };

  const openAdd = () => {
    setForm((f) => ({ ...f, date: selectedDay ?? today }));
    setShowAddForm(true);
  };

  const visibleDoses = showAllDoses ? summary?.schedule ?? [] : (summary?.schedule ?? []).filter((d) => d.status !== "given").slice(0, 6);

  return (
    <div className="flex flex-col relative min-h-screen" style={{ background: "#FFF8EF" }}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>💉 Immunization</h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>
            {child ? `${child.name}'s health schedule` : "Health schedule"}
          </p>
        </div>
        <button
          onClick={openAdd}
          disabled={!child}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-transform active:scale-95 disabled:opacity-50"
          style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", boxShadow: "0 4px 12px rgba(244,123,32,0.35)" }}
        >
          <Plus size={14} color="white" />
          <span style={{ fontSize: "12px", fontWeight: 800, color: "white", fontFamily: FONT }}>Add Event</span>
        </button>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{error}</p>
          </div>
        )}
        {!childLoading && !child && (
          <button onClick={() => navigate("/add-child")} className="w-full py-3 rounded-2xl font-bold text-white" style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", fontFamily: FONT }}>
            ➕ Add a child profile to see the vaccine schedule
          </button>
        )}

        {summary && (
          <div className="rounded-3xl p-4" style={{ background: "linear-gradient(135deg, #F47B20 0%, #FFC72C 100%)", boxShadow: "0 8px 24px rgba(244,123,32,0.3)" }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", fontFamily: FONT, fontWeight: 700 }}>National schedule coverage</p>
                <p style={{ fontSize: "26px", fontWeight: 900, color: "white", fontFamily: FONT, lineHeight: 1.1 }}>
                  {summary.given}/{summary.schedule.length}<span style={{ fontSize: "13px", fontWeight: 700 }}> doses given</span>
                </p>
              </div>
              <span style={{ fontSize: 34 }}>{summary.overdue > 0 ? "⏰" : summary.due > 0 ? "📌" : "🛡️"}</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-1.5 mb-2">
              <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${(summary.given / summary.schedule.length) * 100}%` }} />
            </div>
            <div className="flex gap-3">
              {[
                { n: summary.overdue, label: "overdue" },
                { n: summary.due, label: "due now" },
                { n: summary.upcoming, label: "upcoming" },
              ].map(({ n, label }) => (
                <span key={label} style={{ fontSize: "11px", color: "rgba(255,255,255,0.9)", fontFamily: FONT, fontWeight: 800 }}>{n} {label}</span>
              ))}
            </div>
            {summary.next_dose && (
              <p style={{ fontSize: "11px", color: "white", fontFamily: FONT, fontWeight: 700, marginTop: 6 }}>
                Next: {summary.next_dose.name} · {summary.next_dose.status === "upcoming" ? `due ${fmtDate(summary.next_dose.due_date)}` : doseTone[summary.next_dose.status].label.toLowerCase()}
              </p>
            )}
          </div>
        )}

        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => shiftMonth(-1)} className="rounded-full p-1.5" style={{ background: "#F8F9FD" }}><ChevronLeft size={18} style={{ color: "#2D3047" }} /></button>
            <p style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>{monthLabel}</p>
            <button onClick={() => shiftMonth(1)} className="rounded-full p-1.5" style={{ background: "#F8F9FD" }}><ChevronRight size={18} style={{ color: "#2D3047" }} /></button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((d) => <div key={d} className="text-center" style={{ fontSize: "11px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {[...Array(firstWeekday)].map((_, i) => <div key={`empty-${i}`} />)}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const iso = `${monthPrefix}-${String(day).padStart(2, "0")}`;
              const dots = marksByDay.get(iso) ?? [];
              const isToday = iso === today;
              const isSelected = selectedDay === iso;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : iso)}
                  className="flex flex-col items-center justify-center rounded-xl py-1 transition-colors"
                  style={{ background: isSelected ? "linear-gradient(135deg, #F47B20, #FFC72C)" : isToday ? "#FFF0E0" : "transparent", minHeight: 34 }}
                >
                  <span style={{ fontSize: "12px", fontWeight: isToday || isSelected ? 900 : 600, color: isSelected ? "white" : isToday ? "#F47B20" : "#2D3047", fontFamily: FONT }}>{day}</span>
                  <div className="flex gap-0.5" style={{ height: 4 }}>
                    {!isSelected && dots.slice(0, 3).map((c) => <div key={c} className="rounded-full" style={{ width: 4, height: 4, background: c }} />)}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3 justify-center flex-wrap">
            {[
              { color: doseTone.overdue.color, label: "Overdue dose" },
              { color: doseTone.due.color, label: "Due / Vaccination" },
              { color: doseTone.given.color, label: "Given / Visit" },
              { color: typeColors.Checkup.color, label: "Checkup" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="rounded-full" style={{ width: 8, height: 8, background: color }} />
                <span style={{ fontSize: "10px", color: "#717182", fontFamily: FONT, fontWeight: 700 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>
              {selectedDay ? `📅 ${fmtDate(selectedDay, true)}` : "📅 Coming up"}
            </p>
            {selectedDay && <button onClick={() => setSelectedDay(null)} style={{ fontSize: "11px", fontWeight: 800, color: "#F47B20", fontFamily: FONT }}>Show all</button>}
          </div>
          <div className="flex flex-col gap-3">
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={22} style={{ color: "#F47B20" }} /></div>
            ) : agenda.length === 0 ? (
              <p className="text-center py-4" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>
                {selectedDay ? "Nothing on this day." : "Nothing pending — great job! 🎉"}
              </p>
            ) : (
              agenda.map((item) => {
                const tc = item.status ? doseTone[item.status] : typeColors[item.type];
                return (
                  <div key={item.key} className="rounded-2xl p-3.5" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: `4px solid ${tc.color}`, opacity: item.event?.done ? 0.6 : 1 }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: FONT, flex: 1, textDecoration: item.event?.done ? "line-through" : "none" }}>{item.title}</p>
                      <span className="px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0" style={{ background: tc.bg, fontSize: "9px", fontWeight: 800, color: tc.color, fontFamily: FONT }}>
                        {typeIcons[item.type]} {item.status ? doseTone[item.status].label : item.type}
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#717182", fontFamily: FONT, fontWeight: 700 }}>{item.subtitle}</p>
                    <div className="flex gap-2 mt-2">
                      {item.dose && (
                        <button onClick={() => openRecord(item.dose!)} disabled={busyCode === item.dose.code} className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1 disabled:opacity-60" style={{ background: "#E8F9F8", color: "#2BA89F", fontSize: "11px", fontWeight: 800, fontFamily: FONT }}>
                          {busyCode === item.dose.code ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Record as given
                        </button>
                      )}
                      {item.event && (
                        <>
                          <button onClick={() => toggleEventDone(item.event!)} className="flex-1 py-1.5 rounded-xl flex items-center justify-center gap-1" style={{ background: item.event.done ? "#F5F5F5" : "#E8F9F8", color: item.event.done ? "#717182" : "#2BA89F", fontSize: "11px", fontWeight: 800, fontFamily: FONT }}>
                            {item.event.done ? <><Undo2 size={12} /> Mark not done</> : <><Check size={12} /> Mark done</>}
                          </button>
                          <button onClick={() => deleteEvent(item.event!)} className="px-3 py-1.5 rounded-xl" style={{ background: "#FFF0F0" }} aria-label="Delete"><Trash2 size={12} style={{ color: "#E53535" }} /></button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {summary && (
          <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between mb-3">
              <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>🛡️ Vaccine record</p>
              <button onClick={() => setShowAllDoses((v) => !v)} style={{ fontSize: "11px", fontWeight: 800, color: "#F47B20", fontFamily: FONT }}>
                {showAllDoses ? "Show pending" : `Show all ${summary.schedule.length}`}
              </button>
            </div>
            <div className="flex flex-col">
              {visibleDoses.map((d, i) => {
                const t = doseTone[d.status];
                const busy = busyCode === d.code;
                return (
                  <div key={d.code} className="flex items-center gap-3 py-2.5" style={{ borderBottom: i < visibleDoses.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                    <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34, background: t.bg }}>
                      {d.status === "given" ? <Check size={16} style={{ color: t.color }} /> : <Syringe size={15} style={{ color: t.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: "12px", fontWeight: 800, color: "#2D3047", fontFamily: FONT }}>{d.name}</p>
                      <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 700 }}>
                        {d.status === "given" && d.given_on ? `Given ${fmtDate(d.given_on, true)}` : `${d.due_age_months} mo · due ${fmtDate(d.due_date)}`}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: t.bg, color: t.color, fontSize: "9px", fontWeight: 800, fontFamily: FONT }}>{t.label}</span>
                    <button
                      onClick={() => (d.status === "given" ? undoGiven(d) : openRecord(d))}
                      disabled={busy}
                      className="rounded-full p-1.5 flex-shrink-0 disabled:opacity-60"
                      style={{ background: d.status === "given" ? "#F5F5F5" : "#E8F9F8" }}
                      aria-label={d.status === "given" ? "Undo" : "Mark given"}
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" style={{ color: "#9BA3B8" }} /> : d.status === "given" ? <Undo2 size={14} style={{ color: "#717182" }} /> : <Check size={14} style={{ color: "#2BA89F" }} />}
                    </button>
                  </div>
                );
              })}
              {visibleDoses.length === 0 && (
                <p className="text-center py-3" style={{ fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>All doses recorded. 🎉</p>
              )}
            </div>
            <p style={{ fontSize: "9px", color: "#C0C4D0", fontFamily: FONT, fontWeight: 600, marginTop: 8 }}>
              Based on the Indonesian national routine immunization programme (Kemenkes). Follow your Posyandu/Puskesmas advice for catch-up doses.
            </p>
          </div>
        )}
      </div>

      {recording && (
        <FrameModal onClose={() => busyCode === null && setRecording(null)}>
          <div className="w-full rounded-t-3xl p-5 flex flex-col gap-3" style={{ background: "white" }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: "16px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>💉 Record {recording.dose.name}</p>
                <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>Recommended at {recording.dose.due_age_months} mo · due {fmtDate(recording.dose.due_date, true)}</p>
              </div>
              <button onClick={() => setRecording(null)} className="rounded-full p-1.5" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Date given</label>
              <input
                type="date" value={recording.date} min={child?.birth_date} max={today}
                onChange={(e) => setRecording({ ...recording, date: e.target.value })}
                className="px-4 py-3 rounded-2xl outline-none"
                style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: FONT }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Notes (optional)</label>
              <input
                value={recording.notes} placeholder="e.g. Posyandu Melati, batch no."
                onChange={(e) => setRecording({ ...recording, notes: e.target.value })}
                className="px-4 py-3 rounded-2xl outline-none"
                style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: FONT }}
              />
            </div>
            <button
              onClick={saveRecord}
              disabled={busyCode !== null || !recording.date}
              className="w-full py-3.5 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(90deg, #5CC8C2, #3DA89F)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: FONT, boxShadow: "0 4px 16px rgba(92,200,194,0.35)" }}
            >
              {busyCode ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save to vaccine record
            </button>
          </div>
        </FrameModal>
      )}

      {showAddForm && (
        <FrameModal onClose={() => !isSaving && setShowAddForm(false)}>
          <div className="w-full rounded-t-3xl p-5 flex flex-col gap-4" style={{ background: "white" }}>
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#2D3047", fontFamily: FONT }}>Add New Event 📅</p>
              <button onClick={() => setShowAddForm(false)} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}>
                <X size={18} style={{ color: "#2D3047" }} />
              </button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-3" style={{ maxHeight: 460 }}>
              {[
                { label: "Event Title", type: "text", placeholder: "e.g. Posyandu weigh-in", field: "title" },
                { label: "Date", type: "date", placeholder: "", field: "date" },
                { label: "Time (optional)", type: "time", placeholder: "", field: "time" },
              ].map(({ label, type, placeholder, field }) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[field as "title" | "date" | "time"]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="px-4 py-3 rounded-2xl outline-none"
                    style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: FONT }}
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Event Type</label>
                <div className="flex gap-2 flex-wrap">
                  {EVENT_TYPES.map((type) => {
                    const s = typeColors[type];
                    return (
                      <button key={type} onClick={() => setForm({ ...form, type })} className="px-3 py-1.5 rounded-full transition-all" style={{ background: form.type === type ? s.bg : "#F5F5F5", color: form.type === type ? s.color : "#9BA3B8", fontFamily: FONT, fontWeight: 800, fontSize: "11px", border: form.type === type ? `1.5px solid ${s.color}` : "1.5px solid transparent" }}>
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 mb-2">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>Notes (optional)</label>
                <textarea placeholder="Any special notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="px-4 py-3 rounded-2xl outline-none resize-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: FONT, height: 60 }} />
              </div>
              <button
                onClick={handleSaveEvent}
                disabled={isSaving || !form.title.trim() || !form.date}
                className="w-full py-3.5 rounded-full transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: FONT, boxShadow: "0 4px 16px rgba(244,123,32,0.35)" }}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : null} {isSaving ? "Saving…" : "Save Event ✓"}
              </button>
            </div>
          </div>
        </FrameModal>
      )}
    </div>
  );
}
