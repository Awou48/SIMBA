import { useState } from "react";
import { useNavigate } from "react-router";
import { Camera, ChevronLeft, Calendar, AlertCircle } from "lucide-react";
// Ensure this path matches exactly!
import logo1 from "../../../imports/logo_1.png";

export function AddChildScreen() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"boy" | "girl" | null>(null);

  // API connection states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSaveChild = async () => {
    setErrorMessage("");
    
    if (!name || !dob || !gender) {
      setErrorMessage("Please fill in the name, date of birth, and gender.");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("simba_token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Map UI gender to backend standard
      const backendGender = gender === "boy" ? "male" : "female";

      const payload = {
        name: name,
        gender: backendGender,
        birth_date: dob
      };

      const response = await fetch("http://127.0.0.1:8000/api/v1/user/children/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add child profile.");
      }

      // Success! Go back to home, which will now automatically fetch this new child
      navigate("/home");
      
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto min-h-screen" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 pt-4 pb-6"
        style={{ background: "linear-gradient(160deg, #FFF8EF 0%, #FFE8C8 100%)" }}
      >
        <button onClick={() => navigate("/home")} className="flex items-center gap-1 mb-4">
          <ChevronLeft size={22} style={{ color: "#2D3047" }} />
        </button>
        <h1 style={{ fontSize: "26px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.2 }}>
          Tell us about your<br />little one 👶
        </h1>
        <p style={{ fontSize: "13px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 600, marginTop: 4 }}>
          Let's create a profile for your toddler
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-6 flex flex-col gap-5 pb-8">
        
        {/* Error Message Display */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-xs font-semibold text-red-600 font-['Nunito']">{errorMessage}</p>
          </div>
        )}

        {/* Avatar upload */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              className="rounded-full flex items-center justify-center overflow-hidden"
              style={{ width: 110, height: 110, background: "linear-gradient(135deg, #FFE8C8, #FFF0D6)", border: "3px dashed #F47B20" }}
            >
              <img src={logo1} alt="Avatar placeholder" className="w-16 h-16 object-contain opacity-60" />
            </div>
            <button
              className="absolute bottom-1 right-1 rounded-full flex items-center justify-center"
              style={{ width: 34, height: 34, background: "linear-gradient(90deg, #F47B20, #FFC72C)", boxShadow: "0 2px 8px rgba(244,123,32,0.4)" }}
            >
              <Camera size={16} color="white" />
            </button>
          </div>
        </div>
        
        {/* Name field */}
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Child's Name</label>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={{ background: "white", border: "1.5px solid #F0F1F5", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <span style={{ fontSize: "20px" }}>🧸</span>
            <input
              type="text"
              placeholder="e.g. Liam, Emma..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: "14px", color: "#2D3047", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Date of Birth */}
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Date of Birth</label>
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={{ background: "white", border: "1.5px solid #F0F1F5", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            <Calendar size={18} style={{ color: "#5CC8C2" }} />
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: "14px", color: dob ? "#2D3047" : "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Gender toggle */}
        <div className="flex flex-col gap-2">
          <label style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Gender</label>
          <div className="flex gap-3">
            {[
              { value: "boy" as const, emoji: "👦", label: "Boy", color: "#5CC8C2", bg: "#E8F9F8" },
              { value: "girl" as const, emoji: "👧", label: "Girl", color: "#F47B20", bg: "#FFF0E0" },
            ].map(({ value, emoji, label, color, bg }) => (
              <button
                key={value}
                onClick={() => setGender(value)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all"
                style={{
                  background: gender === value ? bg : "white",
                  border: `2px solid ${gender === value ? color : "#F0F1F5"}`,
                  boxShadow: gender === value ? `0 4px 12px ${color}30` : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{ fontSize: "22px" }}>{emoji}</span>
                <span style={{ fontSize: "14px", fontWeight: 800, color: gender === value ? color : "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleSaveChild}
          disabled={isLoading}
          className="w-full py-4 rounded-full transition-transform active:scale-95 mt-4 mb-4 disabled:opacity-70 disabled:scale-100"
          style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", color: "white", fontSize: "16px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(244,123,32,0.35)" }}
        >
          {isLoading ? "Saving Profile..." : "Let's Go! 🚀"}
        </button>
      </div>
    </div>
  );
}