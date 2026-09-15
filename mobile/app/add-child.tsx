import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChildren } from "../src/state/child";
import { errorMessage } from "../src/lib/api";
import { isValidDate, toDateString } from "../src/lib/format";
import { Button, ErrorBox, Field, Header, Screen, Segmented } from "../src/components/ui";
import { colors, spacing } from "../src/lib/theme";

export default function AddChild() {
  const { add } = useChildren();
  const router = useRouter();
  const { first } = useLocalSearchParams<{ first?: string }>();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [birth, setBirth] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (name.trim().length < 1) return setError("Enter the child's name.");
    if (!isValidDate(birth)) return setError("Birth date must be YYYY-MM-DD.");
    if (birth > toDateString(new Date())) return setError("Birth date cannot be in the future.");
    setBusy(true);
    setError("");
    try {
      await add({ name: name.trim(), gender, birth_date: birth, region: region.trim() || null });
      router.replace("/(tabs)");
    } catch (err) {
      setError(errorMessage(err, "Could not save the child."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title={first ? "Add your child" : "Add a child"} subtitle="Growth standards depend on sex and exact birth date." onBack={first ? undefined : () => router.back()} />
      <ErrorBox message={error} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Sari" />
      <Text style={styles.label}>Sex</Text>
      <Segmented options={[{ value: "male", label: "Boy" }, { value: "female", label: "Girl" }]} value={gender} onChange={setGender} />
      <Field label="Birth date" value={birth} onChangeText={setBirth} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="Example: 2025-03-14" />
      <Field label="Region / kecamatan (optional)" value={region} onChangeText={setRegion} placeholder="e.g. Kecamatan Depok" hint="Used only for anonymous regional statistics." />
      <Button title="Save child" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
});
