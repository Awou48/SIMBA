import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { Loader2, Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";
import logoMark from "../../imports/logo_mark.png";
import { api, errorMessage as toMessage, session } from "../../lib/api";
import { Button } from "../../app/components/ui/button";
import { Input } from "../../app/components/ui/input";
import { ErrorBanner } from "../components/ui";
import "../../styles/portal.css";

export function HMLogin() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (session.isLoggedInAs("Health Manager")) return <Navigate to="/hm/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const data = await api.admin.login(email.trim(), password);
      session.set(data.access_token, "Health Manager");
      navigate(location.state?.from?.startsWith("/hm") ? location.state.from : "/hm/dashboard", { replace: true });
    } catch (err) {
      setError(toMessage(err, "Sign-in failed. Check your email and password."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hm-portal min-h-screen grid lg:grid-cols-2 bg-background text-foreground">
      <div className="hm-login-hero hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="hm-login-orb hm-login-orb-1" />
        <div className="hm-login-orb hm-login-orb-2" />
        <div className="hm-login-orb hm-login-orb-3" />
        <div className="hm-login-grid" />
        <div className="flex items-center gap-3 relative">
          <div className="size-14 rounded-2xl bg-white flex items-center justify-center shadow-lg"><img src={logoMark} alt="SIMBA" className="size-12 object-contain" /></div>
          <div>
            <p className="text-xl font-extrabold leading-tight">SIMBA</p>
            <p className="text-xs opacity-80">Sistem Informasi Monitoring Balita</p>
          </div>
        </div>
        <div className="max-w-md relative">
          <img src={logoMark} alt="" aria-hidden className="hm-login-mascot" />
          <h1 className="text-4xl font-extrabold leading-tight">Monitor child growth across your region.</h1>
          <p className="mt-4 text-white/85">
            Stunting prevalence per kecamatan, WHO z-scores for every child, AKG nutrition targets, KPSP screening and
            immunization coverage — all from data parents log in the SIMBA app.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/90">
            <li className="flex items-center gap-2"><ShieldCheck size={16} /> Role-based access; parents only ever see their own children</li>
            <li className="flex items-center gap-2"><Smartphone size={16} /> Parents use the mobile app — this portal is for Health Managers</li>
          </ul>
        </div>
        <p className="text-xs text-white/60 relative">WHO Child Growth Standards · Permenkes 2/2020 · AKG 2019 · Kemenkes immunization schedule</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <form onSubmit={submit} className="w-full max-w-sm hm-fade-up">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-12 rounded-xl bg-white shadow flex items-center justify-center"><img src={logoMark} alt="SIMBA" className="size-10 object-contain" /></div>
            <p className="text-lg font-extrabold">SIMBA Health Manager Portal</p>
          </div>
          <h2 className="text-2xl font-extrabold">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Use your Health Manager account. Accounts are created by a superadmin in <em>System</em>.</p>

          <ErrorBanner message={error} />

          <label className="block text-xs font-bold text-muted-foreground mb-1">Official email</label>
          <div className="relative mb-4">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="manager@simba.id" className="pl-9 h-11 bg-white" />
          </div>
          <label className="block text-xs font-bold text-muted-foreground mb-1">Password</label>
          <div className="relative mb-6">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 h-11 bg-white" />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full h-11 text-base font-bold">
            {isLoading ? <Loader2 className="animate-spin" /> : null} {isLoading ? "Signing in…" : "Sign In"}
          </Button>

          <p className="mt-8 text-xs text-muted-foreground">
            Are you a parent? Open the <a href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">SIMBA app</a> instead.
          </p>
        </form>
      </div>
    </div>
  );
}
