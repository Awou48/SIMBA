import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChildren } from "../src/state/child";
import { errorMessage } from "../src/lib/api";
import { isValidDate, toDateString } from "../src/lib/format";
import { ChildForm, type ChildFormValue } from "../src/components/ChildForm";
import { Button, ErrorBox, Screen, YellowBar } from "../src/components/ui";
import { spacing } from "../src/lib/theme";

export default function AddChild() {
  const { add } = useChildren();
  const router = useRouter();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const [form, setForm] = useState<ChildFormValue>({ name: "", gender: "male", birth_date: "", region: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (form.name.trim().length < 1) return setError("Siapa nama anak Anda?");
    if (!isValidDate(form.birth_date)) return setError("Pilih tanggal lahir dulu, ya.");
    if (form.birth_date > toDateString(new Date())) return setError("Tanggal lahir tidak boleh di masa depan.");
    setBusy(true);
    setError("");
    try {
      await add({ name: form.name.trim(), gender: form.gender, birth_date: form.birth_date, region: form.region.trim() || null });
      router.replace("/(tabs)");
    } catch (err) {
      setError(errorMessage(err, "Belum bisa disimpan. Coba lagi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <YellowBar title={first ? "Ceritakan tentang anak Anda" : "Tambah anak"} subtitle={first ? "Hanya butuh 30 detik" : undefined} onBack={first ? undefined : () => router.back()} />
      <View style={{ padding: spacing.lg }}>
        <ErrorBox message={error} />
        <ChildForm value={form} onChange={setForm} />
        <Button title="Simpan" icon="checkmark" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}
