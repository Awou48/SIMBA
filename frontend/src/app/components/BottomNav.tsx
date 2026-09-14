import { useNavigate, useLocation } from "react-router";
import { Home, BarChart2, Compass, Calendar, Settings } from "lucide-react";

const tabs = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: BarChart2, label: "Data", path: "/growth" },
  { icon: Compass, label: "Explore", path: "/explore" },
  { icon: Calendar, label: "Calendar", path: "/immunization" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-40"
      style={{
        background: "#fff",
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
        paddingBottom: "8px",
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map((tab) => {
          // Dynamic Active State Logic: Group sub-screens under their logical parent tab
          const isActive = 
            location.pathname === tab.path || 
            (tab.path === "/home" && location.pathname === "/recipes") ||
            (tab.path === "/growth" && ["/food-diary", "/reports", "/milestones"].includes(location.pathname));
            
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all"
              style={{
                background: isActive ? "#FFF0E0" : "transparent",
                minWidth: "60px",
              }}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{ color: isActive ? "#F47B20" : "#9BA3B8" }}
                fill={isActive ? "rgba(244,123,32,0.1)" : "none"}
              />
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#F47B20" : "#9BA3B8",
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