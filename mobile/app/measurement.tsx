import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { api, errorMessage, type Measurement } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { fmtZ, isValidDate, statusTone, toDateString } from "../src/lib/format";
import { growthVerdict, zPlain } from "../src/lib/friendly";
import { Button, Card, Celebrate, Chips, ErrorBox, Field, Header, Pill, Screen, Stepper, VerdictCard } from "../src/components/ui";
import { colors, font, spacing } from "../src/lib/theme";

type When = "today" | "yesterday" | "other";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

export default function NewMeasurement() {
  const { active } = useChildren();
  const router = useRouter();
  const [weight, setWeight] = useState(9);
  const [height, setHeight] = useState(75);
  const [when, setWhen] = useState<When>("today");
  const [otherDate, setOtherDate] = useState(daysAgo(2));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Measurement | null>(null);

  useEffect(() => {
    if (!active) return;
    api
      .listMeasurements(active.id)
      .then((rows) => {
        const last = rows[rows.length - 1];
        if (last) {
          setWeight(last.weight_kg);
          setHeight(last.height_cm);
        }
      })
      .catch(() => undefined);
  }, [active]);

  const date = when === "today" ? daysAgo(0) : when === "yesterday" ? daysAgo(1) : otherDate;

  const submit = async () => {
    if (!active) return;
    if (!isValidDate(date)) return setError("Please enter the date as YYYY-MM-DD.");
    setBusy(true);
    setError("");
    try {
      setResult(await api.logMeasurement(active.id, { weight_kg: +weight.toFixed(1), height_cm: +height.toFixed(1), date_logged: date }));
    } catch (err) {
      setError(errorMessage(err, "Could not save the measurement."));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const v = growthVerdict(active?.name ?? "Your child", result.stunting_status, result.weight_status, result.wasting_status);
    return (
      <Screen edges={["top", "bottom"]}>
        <Celebrate emoji={v.emoji} title="Saved!" body={`${active?.name} · ${result.weight_kg} kg · ${result.height_cm} cm`} />
        <VerdictCard {...v} />
        <Card>
          <Text style={styles.cardTitle}>Compared with children the same age</Text>
          <Plain label="Weight" z={result.wfa_zscore} status={result.weight_status} />
          <Plain label="Height" z={result.lhfa_zscore} status={result.stunting_status} />
          {result.wfh_zscore !== null ? <Plain label="Weight for height" z={result.wfh_zscore} status={result.wasting_status} /> : null}
        </Card>
        <Button title="Done" onPress={() => router.back()} />
        <Button
          title="Add another"
          variant="ghost"
          onPress={() => {
            setResult(null);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="New measurement" emoji="⚖️" subtitle={active ? `For ${active.name}` : undefined} onBack={() => router.back()} />
      <ErrorBox message={error} />

      <Card>
        <Text style={styles.cardTitle}>Weight</Text>
        <Stepper value={weight} onChange={setWeight} step={0.1} min={1} max={40} unit="kilograms" big />
        <Slider style={styles.slider} minimumValue={1} maximumValue={40} step={0.1} value={weight} onValueChange={(v: number) => setWeight(+v.toFixed(1))} minimumTrackTintColor={colors.orange} maximumTrackTintColor="#F1EDE6" thumbTintColor={colors.orange} />
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Height</Text>
        <Stepper value={height} onChange={setHeight} step={0.5} min={30} max={130} unit="centimetres" big />
        <Slider style={styles.slider} minimumValue={30} maximumValue={130} step={0.5} value={height} onValueChange={(v: number) => setHeight(+v.toFixed(1))} minimumTrackTintColor={colors.teal} maximumTrackTintColor="#F1EDE6" thumbTintColor={colors.teal} />
        <Text style={styles.hint}>Under 2 years: measure lying down. Over 2: standing against a wall.</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>When was this measured?</Text>
        <Chips
          options={[
            { value: "today", label: "Today", emoji: "📍" },
            { value: "yesterday", label: "Yesterday", emoji: "⏪" },
            { value: "other", label: "Another day", emoji: "🗓️" },
          ]}
          value={when}
          onChange={setWhen}
        />
        {when === "other" ? <Field label="Date" value={otherDate} onChangeText={setOtherDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" /> : null}
      </Card>

      <Button title="Save measurement" emoji="✅" onPress={submit} loading={busy} />
    </Screen>
  );
}

function Plain({ label, z, status }: { label: string; z: number | null; status: string | null }) {
  return (
    <View style={styles.plainRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.plainLabel}>{label}</Text>
        <Text style={styles.hint}>{zPlain(z)}</Text>
      </View>
      <Text style={styles.z}>{fmtZ(z)}</Text>
      <Pill tone={statusTone(status)} small>
        {status ?? "—"}
      </Pill>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontFamily: font.extra, fontSize: 15, color: colors.text, marginBottom: spacing.sm },
  slider: { width: "100%", height: 40, marginTop: spacing.xs },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  plainRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  plainLabel: { fontFamily: font.extra, fontSize: 14, color: colors.text },
  z: { fontFamily: font.black, fontSize: 13, color: colors.muted, width: 48, textAlign: "right" },
});
