import { useNavigate } from "react-router";
import { API_URL, session } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { ChildSwitcher } from "../components/ChildSwitcher";
import logoMark from "../../imports/logo_mark.png";
import { Body, Button, Card, ListItem, Section, YellowBar } from "../components/ui";
import { fmtDate } from "../../lib/id";

export function More() {
  const navigate = useNavigate();
  const { children } = useChildren();

  const signOut = () => {
    if (!window.confirm("Keluar dari akun? Anda perlu email dan kata sandi untuk masuk lagi.")) return;
    session.clear();
    navigate("/masuk", { replace: true });
  };

  return (
    <>
      <YellowBar title="Lainnya" />
      <Body>
        <ChildSwitcher />
        <Section title="Kesehatan" />
        <Card pad="px-4 py-1">
          <ListItem icon="syringe" tone="yellow" title="Imunisasi" subtitle="Jadwal dan yang sudah diberikan" onClick={() => navigate("/imunisasi")} />
          <ListItem icon="calendar" tone="teal" title="Kalender" subtitle="Posyandu, dokter, pengingat" onClick={() => navigate("/kalender")} />
          <ListItem icon="bell" tone="coral" title="Pengingat" subtitle="Hal yang perlu diperhatikan" onClick={() => navigate("/pengingat")} />
          <ListItem icon="file-text" tone="violet" title="Laporan" subtitle="Unduh PDF untuk dokter atau Posyandu" onClick={() => navigate("/laporan")} last />
        </Card>
        <Section title="Belajar" />
        <Card pad="px-4 py-1">
          <ListItem icon="book-open" tone="good" title="Tips & artikel" subtitle="Makanan, tumbuh kembang, imunisasi" onClick={() => navigate("/artikel")} last />
        </Card>
        <Section title="Keluarga" />
        <Card pad="px-4 py-1">
          {children.map((c) => (
            <ListItem key={c.id} icon="smile" tone={c.gender === "female" ? "coral" : "teal"} title={c.name} subtitle={`Lahir ${fmtDate(c.birth_date)}${c.region ? ` · ${c.region}` : ""}`} onClick={() => navigate(`/anak/${c.id}`)} />
          ))}
          <ListItem icon="plus" tone="muted" title="Tambah anak" onClick={() => navigate("/tambah-anak")} last />
        </Card>
        <Button title="Keluar" variant="white" icon="log-out" onClick={signOut} className="mt-2" />
        <p className="flex items-center justify-center gap-2 text-[12px] text-[var(--muted)] mt-5">
          <img src={logoMark} alt="" className="size-7 object-contain" /> SIMBA · {API_URL.replace(/^https?:\/\//, "")}
        </p>
      </Body>
    </>
  );
}
