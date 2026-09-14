import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, Stethoscope, Baby, AlertCircle } from "lucide-react";
import logo2 from "../../../imports/logo_2.png";
import { api, errorMessage as toMessage, session, type Role } from "../../../lib/api";

export function LoginScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<Role>("Parent");
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const data = role === "Health Manager"
        ? await api.admin.login(email.trim(), password)
        : await api.parent.login(email.trim(), password);

      session.set(data.access_token, role);
      navigate(role === "Health Manager" ? "/hm/dashboard" : "/home", { replace: true });
    } catch (err) {
      setErrorMessage(toMessage(err, "Failed to log in. Please check your credentials."));
    } finally {
      setIsLoading(false);
    }
  };

  const isHM = role === "Health Manager";

  return (
    <div className="h-full flex flex-col overflow-y-auto" style={{ background: "#FFF8EF" }}>
      {/* Role selector tabs */}
      <div className="px-4 pt-4 pb-0">
        <div
          className="flex rounded-2xl p-1"
          style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
        >
          {(["Parent", "Health Manager"] as Role[]).map(r => (
            <button
              key={r}
              onClick={() => { setRole(r); setErrorMessage(""); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all"
              style={{
                background:
                  role === r
                    ? r === "Parent"
                      ? "linear-gradient(90deg, #F47B20, #FFC72C)"
                      : "linear-gradient(90deg, #1E3A8A, #4F46E5)"
                    : "transparent",
                color: role === r ? "white" : "#9BA3B8",
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 800,
                fontSize: "12px",
                boxShadow: role === r ? (r === "Parent" ? "0 4px 12px rgba(244,123,32,0.3)" : "0 4px 12px rgba(79,70,229,0.3)") : "none",
              }}
            >
              {r === "Parent" ? <Baby size={15} /> : <Stethoscope size={15} />}
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Header gradient */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center pt-5 pb-8"
        style={{
          background: isHM
            ? "linear-gradient(160deg, #EEF2FF 0%, #C7D2FE 100%)"
            : "linear-gradient(160deg, #FFF8EF 0%, #FFE8C8 100%)",
        }}
      >
        <div
          className="rounded-3xl flex items-center justify-center mb-4"
          style={{
            width: 90,
            height: 90,
            background: "white",
            boxShadow: isHM
              ? "0 6px 24px rgba(79,70,229,0.2)"
              : "0 6px 24px rgba(244,123,32,0.2)",
          }}
        >
          {/* Ensure the image path is correct */}
          <img src={logo2} alt="SIMBA" className="w-16 h-16 object-contain" />
        </div>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 900,
            color: "#2D3047",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          {isHM ? "Health Manager Portal 🧑‍⚕️" : "Welcome Back! 👋"}
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "#717182",
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
          }}
        >
          {isHM ? "Sign in to manage SIMBA data" : "Log in to continue to SIMBA"}
        </p>
      </div>

      {/* Card */}
      <div
        className="flex-1 mx-4 rounded-3xl px-6 py-6"
        style={{
          background: "white",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          borderRadius: "28px",
          marginTop: "-16px",
        }}
      >
        <div className="flex flex-col gap-4">
          
          {/* Error Message Display */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle size={16} className="text-red-500" />
              <p className="text-xs font-semibold text-red-600 font-['Nunito']">{errorMessage}</p>
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
              {isHM ? "Official Email" : "Email Address"}
            </label>
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}
            >
              <Mail size={18} style={{ color: isHM ? "#4F46E5" : "#5CC8C2" }} />
              <input
                type="email"
                placeholder={isHM ? "manager@simba.id" : "parent@email.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: "14px", color: "#2D3047", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: "13px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
              Password
            </label>
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{ background: "#F8F9FD", border: "1.5px solid #F0F1F5" }}
            >
              <Lock size={18} style={{ color: isHM ? "#4F46E5" : "#5CC8C2" }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none"
                style={{ fontSize: "14px", color: "#2D3047", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}
              />
              <button onClick={() => setShowPassword(!showPassword)}>
                {showPassword
                  ? <EyeOff size={18} style={{ color: "#9BA3B8" }} />
                  : <Eye size={18} style={{ color: "#9BA3B8" }} />}
              </button>
            </div>
          </div>

          {/* Forgot */}
          <button
            className="text-right"
            style={{ fontSize: "12px", color: isHM ? "#4F46E5" : "#F47B20", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}
          >
            Forgot Password?
          </button>

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-4 rounded-full transition-transform active:scale-95 disabled:opacity-70 disabled:scale-100"
            style={{
              background: isHM
                ? "linear-gradient(90deg, #1E3A8A, #4F46E5)"
                : "linear-gradient(90deg, #F47B20, #FFC72C)",
              color: "white",
              fontSize: "16px",
              fontWeight: 800,
              fontFamily: "'Nunito', sans-serif",
              boxShadow: isHM
                ? "0 4px 16px rgba(79,70,229,0.35)"
                : "0 4px 16px rgba(244,123,32,0.35)",
            }}
          >
            {isLoading 
                ? "Connecting..." 
                : (isHM ? "Sign In to Portal 🚀" : "Log In 👶")}
          </button>

          {!isHM && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "#F0F1F5" }} />
                <span style={{ fontSize: "12px", color: "#9BA3B8", fontWeight: 700, fontFamily: "'Nunito', sans-serif" }}>OR</span>
                <div className="flex-1 h-px" style={{ background: "#F0F1F5" }} />
              </div>

              {/* Google */}
              <button
                className="w-full py-3.5 rounded-full flex items-center justify-center gap-3 transition-transform active:scale-95"
                style={{ border: "1.5px solid #E0E4EE", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>Continue with Google</span>
              </button>

              {/* Register link */}
              <p className="text-center" style={{ fontSize: "13px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                New here?{" "}
                <button onClick={() => navigate("/register")} style={{ color: "#F47B20", fontWeight: 800 }}>
                  Create Account
                </button>
              </p>
            </>
          )}
        </div>
      </div>
      <div className="h-6" />
    </div>
  );
}