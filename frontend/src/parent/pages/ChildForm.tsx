import { useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Smile } from "lucide-react";
import { api, errorMessage, type Child } from "../../lib/api";
import { useChildren } from "../../app/ChildContext";
import { formatAgeId, toDateString } from "../../lib/id";
import { cn } from "../../app/components/ui/utils";
import { Body, Button, Card, DateField, Empty, ErrorBox, Field, YellowBar } from "../components/ui";

interface Form {
  name: string;
  gender: Child["gender"];
  birth_date: string;
  region: string;
}

function Fields({ value, onChange }: { value: Form; onChange: (v: Form) => void }) {
  return (
    <>
      <Card>
        <Field label="Nama anak" icon="smile" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Contoh: Sari" />
        <p className="text-[14px] font-extrabold mb-1.5">Jenis kelamin</p>
        <div className="grid grid-cols-2 gap-3">
          {(["male", "female"] as const).map((g) => {
            const on = value.gender === g;
            return (
              <button key={g} type="button" onClick={() => onChange({ ...value, gender: g })} className={cn("rounded-[20px] sb-outline sb-press flex flex-col items-center gap-1.5 py-4", on ? (g === "male" ? "bg-[var(--teal)] text-white sb-hard" : "bg-[var(--coral)] text-white sb-hard") : "bg-white")}>
                <Smile size={40} />
                <span className="text-[15px] font-extrabold">{g === "male" ? "Laki-laki" : "Perempuan"}</span>
              </button>
            );
          })}
        </div>
      </Card>
      <Card>
        <DateField label="Tanggal lahir" value={value.birth_date} onChange={(v) => onChange({ ...value, birth_date: v })} max={toDateString(new Date())} hint="Grafik pertumbuhan dihitung dari tanggal lahir yang tepat." />
        <Field label="Kecamatan (boleh dikosongkan)" icon="map-pin" value={value.region} onChange={(e) => onChange({ ...value, region: e.target.value })} placeholder="Contoh: Depok" hint="Hanya dipakai untuk statistik wilayah tanpa nama." className="mb-0" />
      </Card>
    </>
  );
}

function validate(f: Form): string {
  if (f.name.trim().length < 1) return "Siapa nama anak Anda?";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.birth_date)) return "Pilih tanggal lahir dulu, ya.";
  if (f.birth_date > toDateString(new Date())) return "Tanggal lahir tidak boleh di masa depan.";
  return "";
}

export function AddChild() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const first = params.get("first") === "1";
  const { children, refresh, setActiveChild } = useChildren();
  const [form, setForm] = useState<Form>({ name: "", gender: "male", birth_date: "", region: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate(form);
    if (v) return setError(v);
    setBusy(true);
    setError("");
    try {
      const created = await api.parent.createChild({ name: form.name.trim(), gender: form.gender, birth_date: form.birth_date, region: form.region.trim() || null });
      await refresh();
      setActiveChild(created.id);
      navigate("/beranda", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Belum bisa disimpan. Coba lagi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sb min-h-screen">
      <YellowBar title={first || children.length === 0 ? "Ceritakan tentang anak Anda" : "Tambah anak"} subtitle={first ? "Hanya butuh 30 detik" : undefined} onBack={children.length ? () => navigate(-1) : undefined} />
      <Body>
        <form onSubmit={submit}>
          <ErrorBox message={error} />
          <Fields value={form} onChange={setForm} />
          <Button title="Simpan" icon="check" type="submit" loading={busy} />
        </form>
      </Body>
    </div>
  );
}

export function EditChild() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { children, refresh, setActiveChild } = useChildren();
  const child = children.find((c) => c.id === Number(id));
  const [form, setForm] = useState<Form>({ name: child?.name ?? "", gender: child?.gender ?? "male", birth_date: child?.birth_date ?? "", region: child?.region ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!child)
    return (
      <>
        <YellowBar title="Anak" onBack={() => navigate(-1)} />
        <Body>
          <Empty icon="search" title="Tidak ditemukan" />
        </Body>
      </>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validate(form);
    if (v) return setError(v);
    setBusy(true);
    setError("");
    try {
      await api.parent.updateChild(child.id, { name: form.name.trim(), gender: form.gender, birth_date: form.birth_date, region: form.region.trim() || null });
      await refresh();
      navigate(-1);
    } catch (err) {
      setError(errorMessage(err, "Belum bisa disimpan."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <YellowBar title={child.name} subtitle={formatAgeId(child.birth_date)} onBack={() => navigate(-1)} />
      <Body>
        <form onSubmit={submit}>
          <ErrorBox message={error} />
          <Fields value={form} onChange={setForm} />
          <Button title="Simpan perubahan" icon="check" type="submit" loading={busy} />
          <Button
            title={`Lihat data ${child.name}`}
            variant="ghost"
            onClick={() => {
              setActiveChild(child.id);
              navigate("/beranda");
            }}
          />
        </form>
      </Body>
    </>
  );
}
