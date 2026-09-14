import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Users, Database, RefreshCw, ChevronRight, LogOut, CheckCircle, AlertCircle, Loader2, Plus, X, Crown, Stethoscope } from "lucide-react";
import logo2 from "../../../../imports/logo_2.png";
import { api, errorMessage as toMessage, session, type AdminInfo, type SystemSummary } from "../../../../lib/api";
import { FrameModal } from "../../FrameModal";

const FONT = "'Nunito', sans-serif";

const COUNT_LABELS: Record<string, string> = {
  parents: "Parents", children: "Children", measurements: "Measurements", meals: "Meals logged",
  milestone_answers: "KPSP answers", health_events: "Calendar events", admins: "Admins",
};
const REF_LABELS: Record<string, string> = {
  foods: "Foods", akg_targets: "AKG rows", growth_standards: "WHO curve points", milestones: "KPSP questions", articles: "Articles",
};

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function HMSystem() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SystemSummary | null>(null);
  const [admins, setAdmins] = useState<AdminInfo[]>([]);
  const [me, setMe] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [seedResult, setSeedResult] = useState<Record<string, number> | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", is_superadmin: false });
  const [isSaving, setIsSaving] = useState(false);

  const load = () =>
    Promise.all([api.admin.systemSummary(), api.admin.listAdmins(), api.admin.me()]).then(([s, a, m]) => {
      setSummary(s);
      setAdmins(a);
      setMe(m);
    });

  useEffect(() => {
    load()
      .catch((err) => setError(toMessage(err, "Failed to load system data.")))
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = () => {
    session.clear();
    navigate("/login", { replace: true });
  };

  const runSeed = async () => {
    if (!window.confirm("Load reference data into any table that is still empty? Existing rows are never changed.")) return;
    setIsSeeding(true);
    setError("");
    try {
      setSeedResult(await api.admin.seedReferenceData());
      setSummary(await api.admin.systemSummary());
    } catch (err) {
      setError(toMessage(err, "Seeding failed."));
    } finally {
      setIsSeeding(false);
    }
  };

  const saveAdmin = async () => {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 8) { setError("Name, email and a password of 8+ characters are required."); return; }
    setIsSaving(true);
    setError("");
    try {
      const created = await api.admin.registerAdmin({ ...form, name: form.name.trim(), email: form.email.trim() });
      setAdmins((prev) => [...prev, created]);
      setSummary((s) => (s ? { ...s, counts: { ...s.counts, admins: s.counts.admins + 1 } } : s));
      setForm({ name: "", email: "", password: "", is_superadmin: false });
      setShowAddAdmin(false);
    } catch (err) {
      setError(toMessage(err, "Could not create the admin account."));
    } finally {
      setIsSaving(false);
    }
  };

  const status = [
    { label: "API Server", status: summary ? "Operational" : error ? "Unreachable" : "Checking…", color: summary ? "#5CC8C2" : error ? "#E53535" : "#FFC72C" },
    { label: "Database", status: summary?.database ?? "…", color: summary ? "#5CC8C2" : "#FFC72C" },
    { label: "Last measurement", status: summary?.last_measurement_at ? fmtDateTime(summary.last_measurement_at) : "none yet", color: "#FFC72C" },
    { label: "Reference data", status: summary && Object.values(summary.reference).every((n) => n > 0) ? "Complete" : "Incomplete", color: summary && Object.values(summary.reference).every((n) => n > 0) ? "#5CC8C2" : "#F47B20" },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-5" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #717182 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/hm/dashboard")} className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="w-4 h-4 flex items-center justify-center"><span style={{ color: "white", fontSize: 16 }}>←</span></div>
          </button>
          <div className="flex-1">
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: FONT }}>⚙️ System Management</h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: FONT, fontWeight: 600 }}>
              SIMBA v{summary?.version ?? "…"} · {me ? `${me.name}${me.is_superadmin ? " (superadmin)" : ""}` : "Admin Panel"}
            </p>
          </div>
          <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: 40, height: 40, background: "rgba(255,255,255,0.9)" }}>
            <img src={logo2} alt="Admin" className="w-7 h-7 object-contain" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {status.map(({ label, status: st, color }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
              <div className="rounded-full" style={{ width: 8, height: 8, background: color, flexShrink: 0 }} />
              <div className="min-w-0">
                <p style={{ fontSize: "10px", fontWeight: 800, color: "white", fontFamily: FONT }}>{label}</p>
                <p className="truncate" style={{ fontSize: "9px", color, fontFamily: FONT, fontWeight: 700 }}>{st}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 pb-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600" style={{ fontFamily: FONT }}>{error}</p>
          </div>
        )}
        {isLoading && <div className="flex justify-center py-6"><Loader2 className="animate-spin" size={22} style={{ color: "#4F46E5" }} /></div>}

        {/* Data overview */}
        {summary && (
          <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: "#ECFEFF" }}><Database size={20} style={{ color: "#06B6D4" }} /></div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#1E3A8A", fontFamily: FONT }}>Data overview</p>
                <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>{summary.database}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(summary.counts).map(([k, v]) => (
                <div key={k} className="rounded-xl p-2 text-center" style={{ background: "#F8F9FD" }}>
                  <p style={{ fontSize: "16px", fontWeight: 900, color: "#1E3A8A", fontFamily: FONT }}>{v}</p>
                  <p style={{ fontSize: "9px", fontWeight: 700, color: "#9BA3B8", fontFamily: FONT }}>{COUNT_LABELS[k] ?? k}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reference data + seed */}
        {summary && (
          <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: "#FFF7ED" }}><RefreshCw size={20} style={{ color: "#F47B20" }} /></div>
              <div className="flex-1">
                <p style={{ fontSize: "14px", fontWeight: 800, color: "#1E3A8A", fontFamily: FONT }}>Reference data</p>
                <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>WHO tables, AKG, foods, KPSP, articles</p>
              </div>
            </div>
            <div className="flex flex-col">
              {Object.entries(summary.reference).map(([k, v], i, arr) => (
                <div key={k} className="flex items-center justify-between py-2" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>{REF_LABELS[k] ?? k}</span>
                  <span className="flex items-center gap-1.5" style={{ fontSize: "12px", fontWeight: 800, color: v > 0 ? "#2BA89F" : "#E53535", fontFamily: FONT }}>
                    {v > 0 ? <CheckCircle size={13} /> : <AlertCircle size={13} />} {v.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            {me?.is_superadmin ? (
              <button onClick={runSeed} disabled={isSeeding} className="w-full mt-3 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60" style={{ background: "linear-gradient(90deg, #1E3A8A, #F47B20)", color: "white", fontSize: "12px", fontWeight: 800, fontFamily: FONT }}>
                {isSeeding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {isSeeding ? "Seeding…" : "Load missing reference data"}
              </button>
            ) : (
              <p style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600, marginTop: 8 }}>Only a superadmin can (re)load reference data.</p>
            )}
            {seedResult && (
              <p style={{ fontSize: "10px", color: "#2BA89F", fontFamily: FONT, fontWeight: 700, marginTop: 6 }}>
                Seeded: {Object.entries(seedResult).map(([k, v]) => `${REF_LABELS[k] ?? k} ${v}`).join(" · ")}
              </p>
            )}
          </div>
        )}

        {/* Admin accounts */}
        <div>
          <button onClick={() => setShowUsers(!showUsers)} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-transform active:scale-95" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: "#EEF2FF" }}><Users size={20} style={{ color: "#4F46E5" }} /></div>
            <div className="flex-1">
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#1E3A8A", fontFamily: FONT }}>Health Manager accounts</p>
              <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>{admins.length} account{admins.length === 1 ? "" : "s"} · {admins.filter((a) => a.is_superadmin).length} superadmin</p>
            </div>
            <ChevronRight size={16} style={{ color: "#C0C4D0", transform: showUsers ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
          </button>
          {showUsers && (
            <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {admins.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #F5F5F5" }}>
                  <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, background: u.is_superadmin ? "#FFF8E0" : "#EEF2FF" }}>
                    {u.is_superadmin ? <Crown size={15} style={{ color: "#D4A017" }} /> : <Stethoscope size={15} style={{ color: "#4F46E5" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: "12px", fontWeight: 800, color: "#2D3047", fontFamily: FONT }}>{u.name}{me?.id === u.id ? " (you)" : ""}</p>
                    <p className="truncate" style={{ fontSize: "10px", color: "#9BA3B8", fontFamily: FONT, fontWeight: 600 }}>{u.is_superadmin ? "Superadmin" : "Health Manager"} · {u.email}</p>
                  </div>
                </div>
              ))}
              {me?.is_superadmin && (
                <button onClick={() => setShowAddAdmin(true)} className="w-full flex items-center justify-center gap-2 px-4 py-3" style={{ fontSize: "12px", fontWeight: 800, color: "#4F46E5", fontFamily: FONT }}>
                  <Plus size={14} /> Add Health Manager account
                </button>
              )}
            </div>
          )}
        </div>

        {/* Secure Logout */}
        <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-transform active:scale-95 mt-2" style={{ background: "#FFF0F0", border: "1.5px solid #FFD0D0" }}>
          <LogOut size={18} style={{ color: "#E53535" }} />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#E53535", fontFamily: FONT }}>Secure Log Out</span>
        </button>

        <p className="text-center mt-2" style={{ fontSize: "11px", color: "#C0C4D0", fontFamily: FONT, fontWeight: 600 }}>
          SIMBA Admin Panel v{summary?.version ?? "…"} · {me?.email ?? ""}
        </p>
      </div>

      {showAddAdmin && (
        <FrameModal align="center" onClose={() => !isSaving && setShowAddAdmin(false)}>
          <div className="w-full rounded-3xl p-5 flex flex-col gap-3" style={{ background: "white", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            <div className="flex items-center justify-between mb-1">
              <p style={{ fontSize: "17px", fontWeight: 900, color: "#1E3A8A", fontFamily: FONT }}>New Health Manager</p>
              <button onClick={() => setShowAddAdmin(false)} className="rounded-full p-1.5" style={{ background: "#F5F5F5" }}><X size={18} style={{ color: "#2D3047" }} /></button>
            </div>
            {[
              { label: "Full name", field: "name", type: "text", placeholder: "Dr. Santika Wulandari" },
              { label: "Official email", field: "email", type: "email", placeholder: "santika@simba.id" },
              { label: "Temporary password (8+ chars)", field: "password", type: "password", placeholder: "••••••••" },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field} className="flex flex-col gap-1.5">
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>{label}</label>
                <input type={type} placeholder={placeholder} value={form[field as "name" | "email" | "password"]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="px-4 py-3 rounded-2xl outline-none" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5", fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: FONT }} />
              </div>
            ))}
            <div className="flex items-center gap-3 py-1">
              <button onClick={() => setForm({ ...form, is_superadmin: !form.is_superadmin })} className="rounded-full transition-all" style={{ width: 46, height: 26, background: form.is_superadmin ? "#D4A017" : "#E0E4EE", position: "relative" }}>
                <div className="absolute rounded-full" style={{ width: 20, height: 20, background: "white", top: 3, left: form.is_superadmin ? 23 : 3, transition: "left 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
              </button>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: FONT }}>{form.is_superadmin ? "Superadmin 👑 (can manage accounts & data)" : "Health Manager"}</span>
            </div>
            <button onClick={saveAdmin} disabled={isSaving} className="w-full py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70" style={{ background: "linear-gradient(90deg, #1E3A8A, #4F46E5)", color: "white", fontSize: "14px", fontWeight: 800, fontFamily: FONT, boxShadow: "0 4px 16px rgba(79,70,229,0.3)" }}>
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {isSaving ? "Creating…" : "Create account"}
            </button>
          </div>
        </FrameModal>
      )}
    </div>
  );
}
