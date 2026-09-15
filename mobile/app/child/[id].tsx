import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useChildren } from "../../src/state/child";
import { errorMessage } from "../../src/lib/api";
import { formatAge, isValidDate, toDateString } from "../../src/lib/format";
import { Button, Empty, ErrorBox, Field, Header, Screen, Segmented } from "../../src/components/ui";
import { colors, spacing } from "../../src/lib/theme";

export default function EditChild() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { children, update, select } = useChildren();
  const child = children.find((c) => c.id === Number(id));
  const [name, setName] = useState(child?.name ?? "");
  const [gender, setGender] = useState<"male" | "female">(child?.gender ?? "male");
  const [birth, setBirth] = useState(child?.birth_date ?? "");
  const [region, setRegion] = useState(child?.region ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!child) {
    return (
      <Screen>
        <Header title="Child" onBack={() => router.back()} />
        <Empty title="Not found" />
      </Screen>
    );
  }

  const save = async () => {
    if (name.trim().length < 1) return setError("Enter the child's name.");
    if (!isValidDate(birth)) return setError("Birth date must be YYYY-MM-DD.");
    if (birth > toDateString(new Date())) return setError("Birth date cannot be in the future.");
    setBusy(true);
    setError("");
    try {
      await update(child.id, { name: name.trim(), gender, birth_date: birth, region: region.trim() || null });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title={child.name} subtitle={formatAge(child.birth_date)} onBack={() => router.back()} />
      <ErrorBox message={error} />
      <Field label="Name" value={name} onChangeText={setName} />
      <Text style={styles.label}>Sex</Text>
      <Segmented options={[{ value: "male", label: "Boy" }, { value: "female", label: "Girl" }]} value={gender} onChange={setGender} />
      <Field label="Birth date" value={birth} onChangeText={setBirth} placeholder="YYYY-MM-DD" hint="Changing sex or birth date recalculates nothing retroactively; z-scores are computed per measurement from these values." />
      <Field label="Region / kecamatan" value={region} onChangeText={setRegion} placeholder="Optional" />
      <Button title="Save changes" onPress={save} loading={busy} />
      <Button
        title="Make active child"
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

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
});
