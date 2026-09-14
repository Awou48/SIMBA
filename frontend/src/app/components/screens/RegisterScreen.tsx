import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from "lucide-react";
// Ensure this path matches the exact casing of your file!
import logo2 from "../../../imports/logo_2.png";
import { api, errorMessage as toMessage } from "../../../lib/api";

export function RegisterScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  
  // API connection states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  const handleRegister = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      if (!form.email || !form.password) {
        throw new Error("Email and password are required.");
      }

      await api.parent.register(form.email.trim(), form.password);

      // If successful, navigate directly to the login screen
      navigate("/login");
      
    } catch (err) {
      setErrorMessage(toMessage(err, "Failed to create account. Email might already exist."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center pt-6 pb-8"
        style={{ background: "linear-gradient(160deg, #FFF8EF 0%, #E8F9F8 100%)" }}
      >
        <div
          className="rounded-3xl flex items-center justify-center mb-4"
          style={{ width: 90, height: 90, background: "white", boxShadow: "0 6px 24px rgba(92,200,194,0.25)" }}
        >
          <img src={logo2} alt="SIMBA" className="w-16 h-16 object-contain" />
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
          Join SIMBA! 🦁
        </h1>
        <p style={{ fontSize: "13px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
          Create your free parenting account
        </p>
      </div>

      {/* Card */}
      <div
        className="flex-1 mx-4 px-6 py-6"
        style={{ background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", borderRadius: "28px", marginTop: "-16px" }}
      >
        <div className="flex flex-col gap-4">
          
          {/* Error Message Display */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-xs font-semibold text-red-600 font-['Nunito']">{errorMessage}</p>
            </div>
          )}

          {[
            { label: "Full Name", field: "name", icon: <User size={18} style={{ color: "#5CC8C2" }} />, type: "text", placeholder: "Sarah Johnson" },
            { label: "Email Address", field: "email", icon: <Mail size={18} style={{ color: "#5CC8C2" }} />, type: "email", placeholder: "sarah@email.com" },
          ].map(({ label, field, icon, type, placeholder }) => (
            <div key={field} className="flex flex-col gap-1.5">
              <label style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{label}</label>
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
                {icon}
                <input
                  type={type}
                  placeholder={placeholder}
                  value={form[field as keyof typeof form]}
                  onChange={handleChange(field)}
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: "14px", color: "#2D3047", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}
                />
              </div>
            </div>
          ))}

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Password</label>
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl" style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}>
              <Lock size={18} style={{ color: "#5CC8C2" }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange("password")}
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: "14px", color: "#2D3047", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}
              />
              <button onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={18} style={{ color: "#9BA3B8" }} /> : <Eye size={18} style={{ color: "#9BA3B8" }} />}
              </button>
            </div>
          </div>

          {/* Password strength */}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{
                  height: 4,
                  background: form.password.length > i * 2
                    ? i <= 1 ? "#F47B20" : i <= 2 ? "#FFC72C" : "#5CC8C2"
                    : "#F0F1F5",
                }}
              />
            ))}
          </div>

          {/* Terms */}
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600, textAlign: "center" }}>
            By registering, you agree to our{" "}
            <span style={{ color: "#F47B20" }}>Terms of Service</span> and{" "}
            <span style={{ color: "#F47B20" }}>Privacy Policy</span>
          </p>

          {/* Register button */}
          <button
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full py-4 rounded-full transition-transform active:scale-95 disabled:opacity-70 disabled:scale-100"
            style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", color: "white", fontSize: "16px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(244,123,32,0.35)" }}
          >
            {isLoading ? "Creating Account..." : "Create Account 🌟"}
          </button>

          {/* Login link */}
          <p className="text-center" style={{ fontSize: "13px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} style={{ color: "#F47B20", fontWeight: 800 }}>Log In</button>
          </p>
        </div>
      </div>
      <div className="h-6" />
    </div>
  );
}