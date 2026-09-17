import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChildren } from "../../src/state/child";
import { errorMessage } from "../../src/lib/api";
import { formatAge, isValidDate, toDateString } from "../../src/lib/format";
import { ChildForm, type ChildFormValue } from "../../src/components/ChildForm";
import { Button, Empty, ErrorBox, Screen, YellowBar } from "../../src/components/ui";
import { spacing } from "../../src/lib/theme";

export default function EditChild() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { children, update, select } = useChildren();
  const child = children.find((c) => c.id === Number(id));
  const [form, setForm] = useState<ChildFormValue>({ name: child?.name ?? "", gender: child?.gender ?? "male", birth_date: child?.birth_date ?? "", region: child?.region ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!child) {
    return (
      <Screen padded={false}>
        <YellowBar title="Anak" onBack={() => router.back()} />
        <Empty icon="search-outline" title="Tidak ditemukan" />
      </Screen>
    );
  }

  const save = async () => {
    if (form.name.trim().length < 1) return setError("Siapa nama anak Anda?");
    if (!isValidDate(form.birth_date)) return setError("Pilih tanggal lahir dulu, ya.");
    if (form.birth_date > toDateString(new Date())) return setError("Tanggal lahir tidak boleh di masa depan.");
    setBusy(true);
    setError("");
    try {
      await update(child.id, { name: form.name.trim(), gender: form.gender, birth_date: form.birth_date, region: form.region.trim() || null });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Belum bisa disimpan."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <YellowBar title={child.name} subtitle={formatAge(child.birth_date)} onBack={() => router.back()} />
      <View style={{ padding: spacing.lg }}>
        <ErrorBox message={error} />
        <ChildForm value={form} onChange={setForm} />
        <Button title="Simpan perubahan" icon="checkmark" onPress={save} loading={busy} />
        <Button
          title={`Lihat data ${child.name}`}
          variant="ghost"
          onPress={() => {
            select(child.id);
            router.replace("/(tabs)");
          }}
        />
      </View>
    </Screen>
  );
}
