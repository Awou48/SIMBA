import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChildren } from "../../src/state/child";
import { errorMessage } from "../../src/lib/api";
import { formatAge, isValidDate, toDateString } from "../../src/lib/format";
import { ChildForm, type ChildFormValue } from "../../src/components/ChildForm";
import { Button, Empty, ErrorBox, Header, Screen } from "../../src/components/ui";
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
      <Screen>
        <Header title="Child" onBack={() => router.back()} />
        <Empty emoji="🔍" title="Not found" />
      </Screen>
    );
  }

  const save = async () => {
    if (form.name.trim().length < 1) return setError("What is your child's name?");
    if (!isValidDate(form.birth_date)) return setError("Please enter the birth date as YYYY-MM-DD.");
    if (form.birth_date > toDateString(new Date())) return setError("The birth date can't be in the future.");
    setBusy(true);
    setError("");
    try {
      await update(child.id, { name: form.name.trim(), gender: form.gender, birth_date: form.birth_date, region: form.region.trim() || null });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title={child.name} emoji={child.gender === "female" ? "👧" : "👦"} subtitle={formatAge(child.birth_date)} onBack={() => router.back()} />
      <ErrorBox message={error} />
      <ChildForm value={form} onChange={setForm} />
      <Button title="Save changes" emoji="✅" onPress={save} loading={busy} />
      <Button
        title={`Switch to ${child.name}`}
        variant="ghost"
        onPress={() => {
          select(child.id);
          router.back();
        }}
        style={{ marginTop: spacing.sm }}
      />
    </Screen>
  );
}
