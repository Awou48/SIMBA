import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, errorMessage, type Measurement } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { fmtZ, isValidDate, statusTone, toDateString, zTone } from "../src/lib/format";
import { Button, Card, ErrorBox, Field, Header, Pill, Row, Screen } from "../src/components/ui";
import { colors, spacing, tones } from "../src/lib/theme";

export default function NewMeasurement() {
  const { active } = useChildren();
  const router = useRouter();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [date, setDate] = useState(toDateString(new Date()));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Measurement | null>(null);

  const submit = async () => {
    if (!active) return;
    const w = parseFloat(weight.replace(",", "."));
    const h = parseFloat(height.replace(",", "."));
    if (!(w > 0 && w < 60)) return setError("Weight must be between 0 and 60 kg.");
    if (!(h > 20 && h < 150)) return setError("Height must be between 20 and 150 cm.");
    if (!isValidDate(date)) return setError("Date must be YYYY-MM-DD.");
    setBusy(true);
    setError("");
    try {
      setResult(await api.logMeasurement(active.id, { weight_kg: w, height_cm: h, date_logged: date }));
    } catch (err) {
      setError(errorMessage(err, "Could not save the measurement."));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Header title="Saved" subtitle={`${active?.name} · ${date}`} />
        <Card tone={statusTone(result.stunting_status) === "good" ? "good" : statusTone(result.stunting_status) === "bad" ? "bad" : "warn"}>
          <Text style={styles.big}>{result.stunting_status}</Text>
          <Text style={styles.meta}>Height-for-age classification (Permenkes 2/2020)</Text>
        </Card>
        <Card>
          <ResultRow label="Weight-for-age" z={result.wfa_zscore} status={result.weight_status} />
          <ResultRow label="Height-for-age" z={result.lhfa_zscore} status={result.stunting_status} />
          <ResultRow label="Weight-for-height" z={result.wfh_zscore} status={result.wasting_status} />
          <ResultRow label="BMI-for-age" z={result.bfa_zscore} status={result.bmi_status} last />
        </Card>
        <Text style={styles.note}>A z-score between −2 and +2 is within the normal range. Values are relative to WHO's reference population for {active?.gender === "female" ? "girls" : "boys"} of the same age.</Text>
        <Button title="Done" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
        <Button
          title="Log another"
          variant="ghost"
          onPress={() => {
            setResult(null);
            setWeight("");
            setHeight("");
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="New measurement" subtitle={active ? `For ${active.name}` : undefined} onBack={() => router.back()} />
      <ErrorBox message={error} />
      <Row style={{ gap: spacing.md, alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Field label="Weight (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" placeholder="e.g. 9.6" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Height (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" placeholder="e.g. 75.7" />
        </View>
      </Row>
      <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="Under 2 years: measure lying down (length). Over 2: standing (height)." />
      <Button title="Calculate & save" onPress={submit} loading={busy} />
    </Screen>
  );
}

function ResultRow({ label, z, status, last }: { label: string; z: number | null; status: string | null; last?: boolean }) {
  return (
    <Row style={[styles.resultRow, !last && styles.resultDivider]}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultZ, { color: tones[zTone(z)].fg }]}>{fmtZ(z)}</Text>
      <Pill tone={statusTone(status)} small>{status ?? "—"}</Pill>
    </Row>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 24, fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  resultRow: { justifyContent: "space-between", paddingVertical: 10 },
  resultDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  resultLabel: { flex: 1, fontSize: 13, fontWeight: "700", color: colors.text },
  resultZ: { fontSize: 13, fontWeight: "800", marginRight: 8, width: 52, textAlign: "right" },
  note: { fontSize: 12, color: colors.muted, lineHeight: 18 },
});
