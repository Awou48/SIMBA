import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api, errorMessage, session } from "../../lib/api";
import { Body, Button, Card, ErrorBox, Field, YellowBar } from "../components/ui";

export function ParentRegister() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Alamat email belum benar.");
    if (password.length < 6) return setError("Kata sandi minimal 6 huruf atau angka.");
    if (password !== confirm) return setError("Kata sandi yang diulang belum sama.");
    setBusy(true);
    setError("");
    try {
      await api.parent.register(email.trim().toLowerCase(), password);
      const res = await api.parent.login(email.trim().toLowerCase(), password);
      session.set(res.access_token, "Parent");
      navigate("/tambah-anak?first=1", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Akun belum bisa dibuat. Coba lagi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sb min-h-screen">
      <YellowBar title="Buat akun" subtitle="Satu akun bisa untuk semua anak Anda" onBack={() => navigate(-1)} />
      <Body>
        <form onSubmit={submit}>
          <ErrorBox message={error} />
          <Card>
            <Field label="Email" icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
            <Field label="Kata sandi" icon="lock" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 huruf atau angka" />
            <Field label="Ulangi kata sandi" icon="repeat" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ketik sekali lagi" className="mb-0" />
          </Card>
          <Button title="Buat akun" icon="check" type="submit" loading={busy} />
          <p className="text-center text-[13px] text-[var(--muted)] mt-5 leading-5">Data anak hanya bisa dilihat oleh Anda. Petugas kesehatan hanya melihat angka per wilayah tanpa nama.</p>
        </form>
      </Body>
    </div>
  );
}
