import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChildren } from "../src/state/child";
import { errorMessage } from "../src/lib/api";
import { isValidDate, toDateString } from "../src/lib/format";
import { ChildForm, type ChildFormValue } from "../src/components/ChildForm";
import { Button, ErrorBox, Header, Screen } from "../src/components/ui";
import { spacing } from "../src/lib/theme";

export default function AddChild() {
  const { add } = useChildren();
  const router = useRouter();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const [form, setForm] = useState<ChildFormValue>({ name: "", gender: "male", birth_date: "", region: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (form.name.trim().length < 1) return setError("What is your child's name?");
    if (!isValidDate(form.birth_date)) return setError("Please enter the birth date as YYYY-MM-DD.");
    if (form.birth_date > toDateString(new Date())) return setError("The birth date can't be in the future.");
    setBusy(true);
    setError("");
    try {
      await add({ name: form.name.trim(), gender: form.gender, birth_date: form.birth_date, region: form.region.trim() || null });
      router.replace("/(tabs)");
    } catch (err) {
      setError(errorMessage(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title={first ? "Tell us about your child" : "Add a child"} emoji="👶" subtitle={first ? "This takes 30 seconds." : undefined} onBack={first ? undefined : () => router.back()} />
      <ErrorBox message={error} />
      <ChildForm value={form} onChange={setForm} />
      <Button title="Save" emoji="✅" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}
