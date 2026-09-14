import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight, Plus, X, Syringe, Stethoscope, Activity } from "lucide-react";

const daysInMonth = 31;

// Initial Dummy Data
const initialImmunizationDates = [3, 10, 18, 25];
const initialCheckupDates = [7, 22];

const initialVaccinations = [
  { id: 1, name: "MMR Vaccine (2nd dose)", date: "May 10, 2026", time: "10:00 AM", type: "Vaccination", typeColor: "#F47B20", typeBg: "#FFF0E0", notes: "Bring immunization card" },
  { id: 2, name: "General Checkup", date: "May 18, 2026", time: "2:30 PM", type: "Doctor Visit", typeColor: "#5CC8C2", typeBg: "#E8F9F8", notes: "Routine 2-year checkup" },
  { id: 3, name: "Flu Vaccine", date: "May 25, 2026", time: "9:00 AM", type: "Vaccination", typeColor: "#F47B20", typeBg: "#FFF0E0", notes: "" },
  { id: 4, name: "Blood Test", date: "Jun 7, 2026", time: "8:00 AM", type: "Checkup", typeColor: "#9B8BF4", typeBg: "#F0EDFF", notes: "Fasting required" },
];

const eventTypes = ["Vaccination", "Doctor Visit", "Checkup", "Other"];
const typeIcons: Record<string, React.ReactNode> = {
  Vaccination: <Syringe size={14} />,
  "Doctor Visit": <Stethoscope size={14} />,
  Checkup: <Activity size={14} />,
  Other: <Plus size={14} />,
};
const typeColors: Record<string, { color: string; bg: string }> = {
  Vaccination: { color: "#F47B20", bg: "#FFF0E0" },
  "Doctor Visit": { color: "#5CC8C2", bg: "#E8F9F8" },
  Checkup: { color: "#9B8BF4", bg: "#F0EDFF" },
  Other: { color: "#FFC72C", bg: "#FFF8E0" },
};

export function ImmunizationScreen() {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Convert static arrays to React State!
  const [vaccinations, setVaccinations] = useState(initialVaccinations);
  const [immunizationDates, setImmunizationDates] = useState<number[]>(initialImmunizationDates);
  const [checkupDates, setCheckupDates] = useState<number[]>(initialCheckupDates);
  
  const [form, setForm] = useState({ title: "", date: "", time: "", type: "Vaccination", notes: "" });

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const handleSaveEvent = () => {
    if (!form.title || !form.date) return; // Prevent empty saves

    // Extract the day number from the date string (e.g., "2026-05-15" -> 15)
    const [year, month, dayStr] = form.date.split('-');
    const dayNum = parseInt(dayStr, 10);

    // Format the date to match our UI (e.g., "May 15, 2026")
    const formattedDate = new Date(parseInt(year), parseInt(month) - 1, dayNum).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // Grab the right colors for the event type
    const styling = typeColors[form.type] || typeColors["Other"];

    // Build the new event object
    const newEvent = {
      id: Date.now(),
      name: form.title,
      date: formattedDate,
      time: form.time || "TBD",
      type: form.type,
      typeColor: styling.color,
      typeBg: styling.bg,
      notes: form.notes
    };

    // 1. Add to the list of upcoming events (putting it at the top for visibility)
    setVaccinations([newEvent, ...vaccinations]);

    // 2. Add the dot to the calendar
    if (form.type === "Vaccination") {
      setImmunizationDates([...immunizationDates, dayNum]);
    } else {
      setCheckupDates([...checkupDates, dayNum]);
    }

    // 3. Reset form and close sheet
    setForm({ title: "", date: "", time: "", type: "Vaccination", notes: "" });
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col relative min-h-screen" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
            💉 Immunization
          </h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
            Health schedule
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-transform active:scale-95"
          style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", boxShadow: "0 4px 12px rgba(244,123,32,0.35)" }}
        >
          <Plus size={14} color="white" />
          <span style={{ fontSize: "12px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>Add Event</span>
        </button>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-6">
        {/* Calendar */}
        <div className="rounded-3xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <button className="rounded-full p-1.5" style={{ background: "#F8F9FD" }}>
              <ChevronLeft size={18} style={{ color: "#2D3047" }} />
            </button>
            <p style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>May 2026</p>
            <button className="rounded-full p-1.5" style={{ background: "#F8F9FD" }}>
              <ChevronRight size={18} style={{ color: "#2D3047" }} />
            </button>
          </div>

          {/* Week days header */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map(d => (
              <div key={d} className="text-center" style={{ fontSize: "11px", fontWeight: 700, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>{d}</div>
            ))}
          </div>

          {/* Days grid - May 2026 starts on Friday */}
          <div className="grid grid-cols-7 gap-y-1">
            {[...Array(5)].map((_, i) => <div key={`empty-${i}`} />)}
            {[...Array(daysInMonth)].map((_, i) => {
              const day = i + 1;
              const hasVaccine = immunizationDates.includes(day);
              const hasCheckup = checkupDates.includes(day);
              const isToday = day === 8;
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="flex flex-col items-center justify-center rounded-xl py-1 transition-colors"
                  style={{ background: isSelected ? "linear-gradient(135deg, #F47B20, #FFC72C)" : isToday ? "#FFF0E0" : "transparent" }}
                >
                  <span style={{ fontSize: "12px", fontWeight: isToday || isSelected ? 900 : 600, color: isSelected ? "white" : isToday ? "#F47B20" : "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
                    {day}
                  </span>
                  {(hasVaccine || hasCheckup) && !isSelected && (
                    <div className="flex gap-0.5">
                      {hasVaccine && <div className="rounded-full" style={{ width: 4, height: 4, background: "#F47B20" }} />}
                      {hasCheckup && <div className="rounded-full" style={{ width: 4, height: 4, background: "#5CC8C2" }} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 justify-center">
            {[
              { color: "#F47B20", label: "Vaccination" },
              { color: "#5CC8C2", label: "Doctor Visit" },
              { color: "#9B8BF4", label: "Checkup" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="rounded-full" style={{ width: 8, height: 8, background: color }} />
                <span style={{ fontSize: "10px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div>
          <p style={{ fontSize: "15px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 10 }}>📅 Upcoming Events</p>
          <div className="flex flex-col gap-3">
            {vaccinations.map(({ id, name, date, time, type, typeColor, typeBg, notes }) => (
              <div
                key={id}
                className="rounded-2xl p-4 transition-all"
                style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", borderLeft: `4px solid ${typeColor}` }}
              >
                <div className="flex items-start justify-between mb-1">
                  <p style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif", flex: 1, marginRight: 8 }}>{name}</p>
                  <span className="px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0" style={{ background: typeBg, fontSize: "9px", fontWeight: 800, color: typeColor, fontFamily: "'Nunito', sans-serif" }}>
                    {typeIcons[type]}
                    {type}
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>
                  📅 {date} · ⏰ {time}
                </p>
                {notes && (
                  <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600, marginTop: 2 }}>
                    📝 {notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Event Form Sheet */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          style={{ background: "rgba(45,48,71,0.5)" }}
        >
          <div className="w-full max-w-md rounded-t-3xl p-5 flex flex-col gap-4" style={{ background: "white", animation: "slideUp 0.3s ease-out forwards" }}>
            <div className="flex items-center justify-between">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Add New Event 💉</p>
              <button onClick={() => setShowAddForm(false)} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}>
                <X size={18} style={{ color: "#2D3047" }} />
              </button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-3" style={{ maxHeight: "60vh" }}>
              {[
                { label: "Event Title", type: "text", placeholder: "e.g. Polio Booster", field: "title" },
                { label: "Date", type: "date", placeholder: "", field: "date" },
                { label: "Time", type: "time", placeholder: "", field: "time" },
              ].map(({ label, type, placeholder, field }) => (
                <div key={field} className="flex flex-col gap-1.5">
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[field as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="px-4 py-3 rounded-2xl outline-none"
                    style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}
                  />
                </div>
              ))}

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Event Type</label>
                <div className="flex gap-2 flex-wrap">
                  {eventTypes.map(type => {
                    const s = typeColors[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setForm({ ...form, type })}
                        className="px-3 py-1.5 rounded-full transition-all"
                        style={{ background: form.type === type ? s.bg : "#F5F5F5", color: form.type === type ? s.color : "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: "11px", border: form.type === type ? `1.5px solid ${s.color}` : "1.5px solid transparent" }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mb-2">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Notes (optional)</label>
                <textarea
                  placeholder="Any special notes..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="px-4 py-3 rounded-2xl outline-none resize-none"
                  style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif", height: 60 }}
                />
              </div>

              <button
                onClick={handleSaveEvent}
                className="w-full py-3.5 rounded-full transition-transform active:scale-95"
                style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(244,123,32,0.35)" }}
              >
                Save Event ✓
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}