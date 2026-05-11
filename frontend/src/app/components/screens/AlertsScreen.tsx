import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell, AlertTriangle, TrendingDown, Utensils, Activity, ChevronRight, Check, ChevronLeft } from "lucide-react";

type AlertSeverity = "high" | "medium" | "low";

interface Alert {
  id: number;
  title: string;
  description: string;
  time: string;
  severity: AlertSeverity;
  category: string;
  icon: React.ReactNode;
  read: boolean;
}

const initialAlerts: Alert[] = [
  {
    id: 1,
    title: "Weight Gain Concern",
    description: "Liam's weight gain rate has slowed below the 15th percentile over the past 2 months. Consider consulting a pediatrician.",
    time: "Today, 08:30 AM",
    severity: "high",
    category: "Growth",
    icon: <TrendingDown size={18} />,
    read: false,
  },
  {
    id: 2,
    title: "Low Protein Intake",
    description: "Average daily protein intake this week is 8g — below the recommended 20g for Liam's age group.",
    time: "Yesterday, 06:00 PM",
    severity: "high",
    category: "Nutrition",
    icon: <Utensils size={18} />,
    read: false,
  },
  {
    id: 3,
    title: "Milestone Check Due",
    description: "Liam is 27 months old. It's time to verify the 24-month development milestones.",
    time: "May 8, 2026",
    severity: "medium",
    category: "Development",
    icon: <Activity size={18} />,
    read: false,
  },
  {
    id: 4,
    title: "Calorie Target Not Met",
    description: "Liam's calorie intake has been below 900 kcal/day for 3 consecutive days.",
    time: "May 7, 2026",
    severity: "medium",
    category: "Nutrition",
    icon: <Utensils size={18} />,
    read: true,
  },
  {
    id: 5,
    title: "Height Growth On Track",
    description: "Liam's height growth is tracking nicely along the 50th percentile. Keep up the great work!",
    time: "May 5, 2026",
    severity: "low",
    category: "Growth",
    icon: <Activity size={18} />,
    read: true,
  },
  {
    id: 6,
    title: "Immunization Reminder",
    description: "MMR Vaccine (2nd dose) is scheduled for May 10, 2026 at 10:00 AM. Don't forget to bring the immunization card.",
    time: "May 3, 2026",
    severity: "low",
    category: "Immunization",
    icon: <Bell size={18} />,
    read: true,
  },
];

const severityConfig: Record<AlertSeverity, { color: string; bg: string; label: string }> = {
  high:   { color: "#E53535", bg: "#FFF0F0", label: "High" },
  medium: { color: "#F47B20", bg: "#FFF0E0", label: "Medium" },
  low:    { color: "#5CC8C2", bg: "#E8F9F8", label: "Low" },
};

const filterTabs = ["All", "Growth", "Nutrition", "Development", "Immunization"];

export function AlertsScreen() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [activeFilter, setFilter] = useState("All");
  const [childName, setChildName] = useState("Your child");

  // Fetch the active child's name
  useEffect(() => {
    const fetchChild = async () => {
      try {
        const token = localStorage.getItem("simba_token");
        if (!token) return;
        const response = await fetch("http://127.0.0.1:8000/api/v1/user/children/", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) setChildName(data[0].name);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchChild();
  }, []);

  const unread = alerts.filter(a => !a.read).length;

  const filtered = alerts.filter(a =>
    activeFilter === "All" ? true : a.category === activeFilter
  );

  const markAllRead = () => setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  const markRead = (id: number) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div
        className="px-4 pt-4 pb-6"
        style={{ background: "linear-gradient(160deg, #2D3047 0%, #3D4060 100%)", borderRadius: "0 0 28px 28px" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/home")} className="rounded-full p-1.5 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}>
            <ChevronLeft size={20} color="white" />
          </button>
          <div className="flex-1">
             <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>
               🔔 Early Warnings
             </h1>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1 mt-2">
          <div>
            <p style={{ fontSize: "14px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              Alerts for {childName}
            </p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              {unread > 0 ? `${unread} unread alert${unread > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl transition-transform active:scale-95"
              style={{ background: "rgba(255,255,255,0.15)", fontSize: "11px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}
            >
              <Check size={13} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {filterTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full transition-all"
            style={{
              background: activeFilter === tab ? "linear-gradient(90deg, #F47B20, #FFC72C)" : "white",
              color: activeFilter === tab ? "white" : "#717182",
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              fontSize: "11px",
              boxShadow: activeFilter === tab ? "0 4px 12px rgba(244,123,32,0.3)" : "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="px-4 flex flex-col gap-3 pt-2 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="rounded-full flex items-center justify-center" style={{ width: 64, height: 64, background: "#F5F5F5" }}>
              <Bell size={28} style={{ color: "#C0C4D0" }} />
            </div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>No alerts in this category</p>
          </div>
        ) : (
          filtered.map(alert => {
            const sev = severityConfig[alert.severity];
            // Dynamically replace "Liam" or "Liam's" with the active child's name
            const personalizedTitle = alert.title.replace(/Liam/g, childName);
            const personalizedDescription = alert.description.replace(/Liam's/g, `${childName}'s`).replace(/Liam/g, childName);

            return (
              <button
                key={alert.id}
                onClick={() => markRead(alert.id)}
                className="w-full rounded-2xl p-4 text-left transition-transform active:scale-95"
                style={{
                  background: alert.read ? "white" : "#FFFBF5",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  borderLeft: `4px solid ${sev.color}`,
                  opacity: alert.read ? 0.8 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ width: 38, height: 38, background: sev.bg }}
                  >
                    <span style={{ color: sev.color }}>{alert.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif", flex: 1 }}>
                        {!alert.read && (
                          <span className="inline-block rounded-full mr-1.5" style={{ width: 7, height: 7, background: sev.color, verticalAlign: "middle" }} />
                        )}
                        {personalizedTitle}
                      </p>
                      <span
                        className="px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: sev.bg, fontSize: "9px", fontWeight: 800, color: sev.color, fontFamily: "'Nunito', sans-serif" }}
                      >
                        {sev.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 600, lineHeight: 1.5 }}>
                      {personalizedDescription}
                    </p>
                    <p style={{ fontSize: "10px", color: "#C0C4D0", fontFamily: "'Nunito', sans-serif", fontWeight: 700, marginTop: 4 }}>
                      {alert.time}
                    </p>
                  </div>
                  <ChevronRight size={16} style={{ color: "#C0C4D0", flexShrink: 0, marginTop: 2 }} />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Consult recommendation banner */}
      <div className="px-4 pb-4">
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: "linear-gradient(135deg, #4F46E5, #06B6D4)", boxShadow: "0 6px 20px rgba(79,70,229,0.25)" }}
        >
          <AlertTriangle size={26} color="white" />
          <div className="flex-1">
            <p style={{ fontSize: "13px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              Consult a Pediatrician
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              High-priority alerts detected. Professional advice recommended.
            </p>
          </div>
          <button
            className="px-3 py-2 rounded-xl flex-shrink-0 transition-transform active:scale-95"
            style={{ background: "rgba(255,255,255,0.2)", fontSize: "11px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}
          >
            Learn →
          </button>
        </div>
      </div>
    </div>
  );
}