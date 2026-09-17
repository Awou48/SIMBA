import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { api, errorMessage, session } from "../../lib/api";
import logoMark from "../../imports/logo_mark.png";
import { Button, Card, ErrorBox, Field } from "../components/ui";

export function ParentLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session.isLoggedInAs("Parent")) return <Navigate to="/beranda" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Isi email dan kata sandi dulu, ya.");
    setBusy(true);
    setError("");
    try {
      const res = await api.parent.login(email.trim().toLowerCase(), password);
      session.set(res.access_token, "Parent");
      navigate("/beranda", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Tidak bisa masuk. Periksa email dan kata sandi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sb min-h-screen md:grid md:grid-cols-2">
      <div className="bg-[var(--yellow)] border-b-2 md:border-b-0 md:border-r-2 border-[var(--ink)] flex flex-col items-center justify-center text-center px-6 py-14 md:py-0">
        <div className="size-[108px] rounded-[34px] bg-white sb-hard grid place-items-center">
          <img src={logoMark} alt="SIMBA" className="size-[92px] object-contain" />
        </div>
        <p className="sb-display text-[40px] mt-4">SIMBA</p>
        <p className="text-[15px] font-bold text-[var(--header-sub)] max-w-xs">Pantau tumbuh kembang si kecil dengan tenang</p>
        <ul className="hidden md:block mt-10 text-left text-[15px] font-bold space-y-2 max-w-sm text-[var(--ink)]/85">
          <li>• Grafik pertumbuhan sesuai standar WHO</li>
          <li>• Catatan makan dan kebutuhan gizi harian</li>
          <li>• Jadwal imunisasi dan perkembangan anak</li>
        </ul>
      </div>
      <div className="flex items-center justify-center px-5 py-8 md:px-12">
        <form onSubmit={submit} className="w-full max-w-[440px]">
          <h1 className="sb-display text-[26px]">Selamat datang kembali</h1>
          <p className="text-[15px] text-[var(--muted)] mt-1 mb-5">Masuk untuk melihat kabar si kecil hari ini.</p>
          <ErrorBox message={error} />
          <Card>
            <Field label="Email" icon="mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
            <Field label="Kata sandi" icon="lock" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="mb-0" />
          </Card>
          <Button title="Masuk" type="submit" loading={busy} />
          <p className="text-center text-[15px] font-bold text-[var(--muted)] mt-5">
            Belum punya akun?{" "}
            <Link to="/daftar" className="text-[var(--coral)] font-extrabold">
              Daftar di sini
            </Link>
          </p>
          <p className="text-center text-[13px] text-[var(--muted)] mt-8">
            Petugas kesehatan?{" "}
            <a href="/hm/login" className="font-extrabold underline">
              Masuk ke portal
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
