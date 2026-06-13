import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Bell, Globe, Shield, CreditCard, HelpCircle, LogOut, ChevronRight, Edit3, Plus } from "lucide-react";
import logo1 from "../../../imports/logo_1.png"; 
import logo2 from "../../../imports/logo_2.png";

const settingsGroups = [
  {
    title: "Preferences",
    items: [
      { icon: <Bell size={18} />, label: "Notifications", color: "#F47B20", bg: "#FFF0E0", desc: "On" },
      { icon: <Globe size={18} />, label: "Language", color: "#5CC8C2", bg: "#E8F9F8", desc: "English" },
      { icon: <Shield size={18} />, label: "Privacy", color: "#9B8BF4", bg: "#F0EDFF", desc: "Protected" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: <CreditCard size={18} />, label: "Subscription", color: "#FFC72C", bg: "#FFF8E0", desc: "Free Plan" },
      { icon: <HelpCircle size={18} />, label: "Help & Support", color: "#5CC8C2", bg: "#E8F9F8", desc: "" },
    ],
  },
];

export function SettingsScreen() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const calculateAge = (dobString: string) => {
    const dob = new Date(dobString);
    const today = new Date();
    let months = (today.getFullYear() - dob.getFullYear()) * 12 + today.getMonth() - dob.getMonth();
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${remainingMonths} months`;
    return `${years} yrs, ${remainingMonths} mos`;
  };

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const token = localStorage.getItem("simba_token");
        if (!token) return navigate("/login");

        const response = await fetch("http://127.0.0.1:8000/api/v1/user/children/", {
          method: "GET",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setChildren(data);
        }
      } catch (error) {
        console.error("Failed to fetch children", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, [navigate]);
  const handleLogout = () => {
    localStorage.removeItem("simba_token");
    localStorage.removeItem("simba_role");
    localStorage.removeItem("active_child_id");
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div
        className="px-4 pt-4 pb-6"
        style={{ background: "linear-gradient(160deg, #2D3047 0%, #3D4060 100%)", borderRadius: "0 0 28px 28px" }}
      >
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif", marginBottom: 16 }}>
          ⚙️ Settings
        </h1>

        {/* Parent profile card */}
        <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ width: 60, height: 60, background: "rgba(255,255,255,0.9)" }}>
            <img src={logo2} alt="Avatar" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex-1">
            <p style={{ fontSize: "17px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>Parent Profile</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>Active Account</p>
          </div>
          <button className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "rgba(255,255,255,0.15)" }}>
            <Edit3 size={16} color="white" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-5 flex flex-col gap-5 pb-6">
        {/* Child profiles */}
        <div>
          <p style={{ fontSize: "13px", fontWeight: 900, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
            Children Profiles
          </p>
          <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            
            {isLoading ? (
              <p className="text-center text-sm text-gray-400 font-['Nunito'] py-2">Loading profiles...</p>
            ) : children.length === 0 ? (
              <p className="text-center text-sm text-gray-400 font-['Nunito'] py-2">No children added yet.</p>
            ) : (
              children.map((child, index) => (
                <div key={child.id} className="flex items-center gap-3 pb-3 mb-3" style={{ borderBottom: index < children.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                  <div className="rounded-full overflow-hidden flex items-center justify-center text-xl" style={{ width: 48, height: 48, background: "#FFF0E0" }}>
                    {child.gender === 'male' ? '👦' : '👧'}
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: "14px", fontWeight: 800, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{child.name}</p>
                    <p style={{ fontSize: "11px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                      {calculateAge(child.birth_date)} · {child.gender === 'male' ? 'Boy' : 'Girl'}
                    </p>
                  </div>
                  <button className="rounded-full p-2 transition-transform active:scale-95" style={{ background: "#F5F5F5" }}>
                    <Edit3 size={14} style={{ color: "#717182" }} />
                  </button>
                </div>
              ))
            )}

            {/* Add child button */}
            <button
              onClick={() => navigate("/add-child")}
              className="w-full flex items-center gap-3 pt-3 transition-transform active:scale-95"
              style={{ borderTop: children.length > 0 ? "1px solid #F5F5F5" : "none" }}
            >
              <div className="rounded-full flex items-center justify-center" style={{ width: 48, height: 48, background: "#F5F5F5", border: "2px dashed #D0D4E0" }}>
                <Plus size={20} style={{ color: "#9BA3B8" }} />
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>Add another child</span>
            </button>
          </div>
        </div>

        {/* Settings groups */}
        {settingsGroups.map(({ title, items }) => (
          <div key={title}>
            <p style={{ fontSize: "13px", fontWeight: 900, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              {title}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              {items.map(({ icon, label, color, bg, desc }, i) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-gray-50"
                  style={{ borderBottom: i < items.length - 1 ? "1px solid #F5F5F5" : "none" }}
                >
                  <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: 38, height: 38, background: bg }}>
                    <span style={{ color }}>{icon}</span>
                  </div>
                  <span style={{ flex: 1, fontSize: "14px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{label}</span>
                  {desc && <span style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{desc}</span>}
                  <ChevronRight size={16} style={{ color: "#C0C4D0" }} />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Secure Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl transition-transform active:scale-95"
          style={{ background: "#FFF0F0", border: "1.5px solid #FFD0D0", marginTop: 8 }}
        >
          <LogOut size={18} style={{ color: "#E53535" }} />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#E53535", fontFamily: "'Nunito', sans-serif" }}>Secure Log Out</span>
        </button>

        <p className="text-center" style={{ fontSize: "11px", color: "#C0C4D0", fontFamily: "'Nunito', sans-serif", fontWeight: 600, marginTop: 8 }}>
          SIMBA v1.0.0 · Made with ❤️ in Tangerang
        </p>
      </div>
    </div>
  );
}