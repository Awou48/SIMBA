import { useState } from "react";
import { useNavigate } from "react-router";
import { Users, Database, Shield, RefreshCw, Download, Bell, Globe, Trash2, ChevronRight, LogOut, CheckCircle, AlertTriangle } from "lucide-react";
// Watch the lowercase 'l' for Vite compatibility!
import logo2 from "../../../../imports/logo_2.png";
import { session } from "../../../../lib/api";

const systemStatus = [
  { label: "API Server",       status: "Operational", color: "#5CC8C2" },
  { label: "Database",         status: "Operational", color: "#5CC8C2" },
  { label: "Notification Svc", status: "Operational", color: "#5CC8C2" },
  { label: "Analytics Engine", status: "Degraded",    color: "#FFC72C" },
];

const users = [
  { id: 1, name: "Dr. Santika Wulandari", role: "Health Manager", email: "santika@simba.id",  active: true },
  { id: 2, name: "Nutritionist Dewi",     role: "Health Manager", email: "dewi@simba.id",     active: true },
  { id: 3, name: "Dr. Arief Rachman",     role: "Health Manager", email: "arief@simba.id",    active: false },
  { id: 4, name: "Admin System",          role: "Super Admin",    email: "admin@simba.id",    active: true },
];

// Dynamically updated to today's timestamps
const backupHistory = [
  { date: "May 11, 2026 · 02:00 AM", type: "Auto", size: "148 MB", status: "Success" },
  { date: "May 10, 2026 · 02:00 AM", type: "Auto", size: "146 MB", status: "Success" },
  { date: "May 8, 2026 · 10:14 AM",  type: "Manual", size: "145 MB", status: "Success" },
];

export function HMSystem() {
  const navigate = useNavigate();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [autoBackup,  setAutoBackup]  = useState(true);
  const [showUsers,   setShowUsers]   = useState(false);
  const [showBackup,  setShowBackup]  = useState(false);

  // Secure Logout Function
  const handleLogout = () => {
    session.clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      {/* Header */}
      <div
        className="px-4 pt-4 pb-5"
        style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #717182 100%)", borderRadius: "0 0 28px 28px" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="w-4 h-4 flex items-center justify-center">
              <span style={{ color: "white", fontSize: 16 }}>←</span>
            </div>
          </button>
          <div className="flex-1">
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>
              ⚙️ System Management
            </h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
              SIMBA v1.0.0 · Admin Panel
            </p>
          </div>
          <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 40, height: 40, background: "rgba(255,255,255,0.9)" }}>
            <img src={logo2} alt="Admin" className="w-7 h-7 object-contain" />
          </div>
        </div>

        {/* System status */}
        <div className="grid grid-cols-2 gap-2">
          {systemStatus.map(({ label, status, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.12)" }}
            >
              <div className="rounded-full" style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: "10px", fontWeight: 800, color: "white", fontFamily: "'Nunito', sans-serif" }}>{label}</p>
                <p style={{ fontSize: "9px", color, fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 pb-6">
        {/* User Management */}
        <div>
          <button
            onClick={() => setShowUsers(!showUsers)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-transform active:scale-95"
            style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
            <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: "#EEF2FF" }}>
              <Users size={20} style={{ color: "#4F46E5" }} />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>User Management</p>
              <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{users.filter(u => u.active).length} active · {users.length} total</p>
            </div>
            <ChevronRight size={16} style={{ color: "#C0C4D0", transform: showUsers ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {showUsers && (
            <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {users.map((u, i) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < users.length - 1 ? "1px solid #F5F5F5" : "none" }}
                >
                  <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, background: u.active ? "#EEF2FF" : "#F5F5F5" }}>
                    <span style={{ fontSize: 14 }}>{u.role === "Super Admin" ? "👑" : "🩺"}</span>
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: "12px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{u.name}</p>
                    <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{u.role} · {u.email}</p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: u.active ? "#E8F9F8" : "#F5F5F5", fontSize: "9px", fontWeight: 800, color: u.active ? "#5CC8C2" : "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}
                  >
                    {u.active ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data Backup */}
        <div>
          <button
            onClick={() => setShowBackup(!showBackup)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-transform active:scale-95"
            style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
            <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: "#ECFEFF" }}>
              <Database size={20} style={{ color: "#06B6D4" }} />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>Data Backup</p>
              <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>Last: May 11 · 02:00 AM</p>
            </div>
            <ChevronRight size={16} style={{ color: "#C0C4D0", transform: showBackup ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {showBackup && (
            <div className="mt-2 rounded-2xl p-4 flex flex-col gap-3" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {backupHistory.map((b, i) => (
                <div key={i} className="flex items-center gap-3 pb-3" style={{ borderBottom: i < backupHistory.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                  <CheckCircle size={16} style={{ color: "#5CC8C2", flexShrink: 0 }} />
                  <div className="flex-1">
                    <p style={{ fontSize: "11px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{b.date}</p>
                    <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{b.type} · {b.size}</p>
                  </div>
                  <button className="rounded-lg p-1.5 transition-transform active:scale-95" style={{ background: "#ECFEFF" }}>
                    <Download size={13} style={{ color: "#06B6D4" }} />
                  </button>
                </div>
              ))}
              <button
                className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                style={{ background: "linear-gradient(90deg, #1E3A8A, #06B6D4)", color: "white", fontSize: "12px", fontWeight: 800, fontFamily: "'Nunito', sans-serif" }}
              >
                <RefreshCw size={14} /> Run Manual Backup Now
              </button>
            </div>
          )}
        </div>

        {/* Settings toggles */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
          {[
            {
              icon: <Bell size={18} />, label: "Push Notifications", desc: "Alert system for parents",
              color: "#4F46E5", bg: "#EEF2FF",
              value: notifEnabled, toggle: () => setNotifEnabled(!notifEnabled),
            },
            {
              icon: <RefreshCw size={18} />, label: "Auto Backup", desc: "Daily at 02:00 AM",
              color: "#06B6D4", bg: "#ECFEFF",
              value: autoBackup, toggle: () => setAutoBackup(!autoBackup),
            },
          ].map(({ icon, label, desc, color, bg, value, toggle }, i) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: i === 0 ? "1px solid #F5F5F5" : "none" }}
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 38, height: 38, background: bg }}>
                <span style={{ color }}>{icon}</span>
              </div>
              <div className="flex-1">
                <p style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{label}</p>
                <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{desc}</p>
              </div>
              <button
                onClick={toggle}
                className="rounded-full transition-all"
                style={{ width: 46, height: 26, background: value ? color : "#E0E4EE", position: "relative", flexShrink: 0 }}
              >
                <div className="absolute rounded-full" style={{ width: 20, height: 20, background: "white", top: 3, left: value ? 23 : 3, transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
              </button>
            </div>
          ))}
        </div>

        {/* Danger zone */}
        <div>
          <p style={{ fontSize: "13px", fontWeight: 900, color: "#E53535", fontFamily: "'Nunito', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            Danger Zone
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: "1.5px solid #FFD0D0" }}>
            {[
              { icon: <Trash2 size={16} />, label: "Clear Cache", desc: "Remove temporary data" },
              { icon: <Shield size={16} />, label: "Reset Permissions", desc: "Restore default roles" },
              { icon: <Globe size={16} />, label: "Maintenance Mode", desc: "Take app offline temporarily" },
            ].map(({ icon, label, desc }, i, arr) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-red-50"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid #F5F5F5" : "none" }}
              >
                <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, background: "#FFF0F0" }}>
                  <span style={{ color: "#E53535" }}>{icon}</span>
                </div>
                <div className="flex-1">
                  <p style={{ fontSize: "13px", fontWeight: 800, color: "#E53535", fontFamily: "'Nunito', sans-serif" }}>{label}</p>
                  <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{desc}</p>
                </div>
                <AlertTriangle size={14} style={{ color: "#E53535" }} />
              </button>
            ))}
          </div>
        </div>

        {/* Secure Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-transform active:scale-95 mt-2"
          style={{ background: "#FFF0F0", border: "1.5px solid #FFD0D0" }}
        >
          <LogOut size={18} style={{ color: "#E53535" }} />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#E53535", fontFamily: "'Nunito', sans-serif" }}>Secure Log Out</span>
        </button>

        <p className="text-center mt-2" style={{ fontSize: "11px", color: "#C0C4D0", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
          SIMBA Admin Panel v1.0.0 · Build 2026.05.11 · Tangerang Server
        </p>
      </div>
    </div>
  );
}