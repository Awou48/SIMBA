import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BarChart2, BookOpen, TrendingUp, Settings } from "lucide-react";

const tabs = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/hm/dashboard" },
  { icon: BarChart2,       label: "Standards",  path: "/hm/growth-standards" },
  { icon: BookOpen,        label: "Content",    path: "/hm/food-database" },
  { icon: TrendingUp,      label: "Trends",     path: "/hm/regional-trends" },
  { icon: Settings,        label: "System",     path: "/hm/system" },
];

export function HMBottomNav() {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-40"
      style={{
        background: "white",
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        paddingBottom: "8px",
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          const isActive =
            location.pathname === tab.path ||
            (tab.path === "/hm/growth-standards" && location.pathname === "/hm/akg-targets") ||
            (tab.path === "/hm/food-database" && (location.pathname === "/hm/milestones" || location.pathname === "/hm/education"));
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all"
              style={{
                background: isActive ? "#EEF2FF" : "transparent",
                minWidth: "56px",
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{ color: isActive ? "#4F46E5" : "#9BA3B8" }}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#4F46E5" : "#9BA3B8",
                  fontFamily: "'Nunito', sans-serif",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
