import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { BarChart2, BookOpen, Utensils, Activity, TrendingUp, Settings, Target } from "lucide-react";
// Ensure lowercase 'l' to prevent Vite crashes!
import logo2 from "../../../../imports/logo_2.png";

export function HMDashboard() {
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem("simba_token");
        if (!token) return navigate("/login");

        const response = await fetch("http://127.0.0.1:8000/api/v1/admin/dashboard/stunting-stats", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStatsData(data);
        } else {
          localStorage.removeItem("simba_token");
          navigate("/login");
        }
      } catch (error) {
        console.error("Failed to fetch admin stats", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [navigate]);

  const dynamicStats = [
    { label: "Total Measurements", value: statsData?.total_measurements || "0", delta: "Database Records", color: "#4F46E5", bg: "rgba(255,255,255,0.15)" },
    { label: "Stunted Cases", value: statsData?.stunted_cases || "0", delta: statsData?.warning || "Normal", color: "#E53535", bg: "rgba(255,255,255,0.15)" },
  ];

  // The navigation grid for all the admin tools we built
  const adminModules = [
    { title: "Regional Trends", desc: "Live stunting analytics", icon: <TrendingUp size={22} />, path: "/hm/regional-trends", color: "#4F46E5", bg: "#EEF2FF" },
    { title: "Growth Standards", desc: "WHO reference charts", icon: <BarChart2 size={22} />, path: "/hm/growth-standards", color: "#06B6D4", bg: "#ECFEFF" },
    { title: "AKG Targets", desc: "National nutrition goals", icon: <Target size={22} />, path: "/hm/akg-targets", color: "#F47B20", bg: "#FFF7ED" },
    { title: "Food Database", desc: "Manage food & macros", icon: <Utensils size={22} />, path: "/hm/food-database", color: "#E53535", bg: "#FFF0F0" },
    { title: "Milestones", desc: "Developmental checklist", icon: <Activity size={22} />, path: "/hm/milestones", color: "#9B8BF4", bg: "#F0EDFF" },
    { title: "Education", desc: "Publish articles & tips", icon: <BookOpen size={22} />, path: "/hm/education", color: "#5CC8C2", bg: "#E8F9F8" },
    { title: "System Config", desc: "Users & backups", icon: <Settings size={22} />, path: "/hm/system", color: "#717182", bg: "#F5F5F5" },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#EEF2FF" }}>
      {/* Header & Live Stats */}
      <div className="px-4 pt-4 pb-6" style={{ background: "linear-gradient(160deg, #1E3A8A 0%, #4F46E5 100%)", borderRadius: "0 0 28px 28px" }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>Hello! 👋</p>
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>Health Manager</h1>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>SIMBA Admin Console</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate("/hm/system")}
              className="rounded-full overflow-hidden flex items-center justify-center transition-transform active:scale-95" 
              style={{ width: 44, height: 44, background: "rgba(255,255,255,0.9)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            >
              <img src={logo2} alt="Avatar" className="w-8 h-8 object-contain" />
            </button>
          </div>
        </div>

        {/* Dynamic Stats row */}
        <div className="grid grid-cols-2 gap-2.5">
          {dynamicStats.map(({ label, value, delta, bg }) => (
            <div key={label} className="rounded-2xl p-3" style={{ background: bg, backdropFilter: "blur(10px)" }}>
              <p style={{ fontSize: "24px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif", lineHeight: 1.1 }}>
                {isLoading ? "..." : value}
              </p>
              <p style={{ fontSize: "11px", fontWeight: 800, color: "rgba(255,255,255,0.9)", fontFamily: "'Nunito', sans-serif", marginTop: 4 }}>{label}</p>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>{delta}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-4">
        <h2 style={{ fontSize: "16px", fontWeight: 900, color: "#1E3A8A", fontFamily: "'Nunito', sans-serif" }}>
          System Modules
        </h2>

        {/* Modules Grid */}
        <div className="grid grid-cols-2 gap-3">
          {adminModules.map(({ title, desc, icon, path, color, bg }) => (
            <button
              key={title}
              onClick={() => navigate(path)}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-transform active:scale-95"
              style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}
            >
              <div
                className="rounded-xl flex items-center justify-center"
                style={{ width: 40, height: 40, background: bg, color: color }}
              >
                {icon}
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.2 }}>
                  {title}
                </p>
                <p style={{ fontSize: "10px", fontWeight: 600, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", marginTop: 2 }}>
                  {desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}