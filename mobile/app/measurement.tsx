import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { api, errorMessage, type Measurement } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { num, statusTone, toDateString } from "../src/lib/format";
import { growthVerdict, zPlain } from "../src/lib/friendly";
import { Button, Card, Celebrate, Chips, DateField, ErrorBox, Pill, Screen, Stepper, VerdictCard, YellowBar } from "../src/components/ui";
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
    setBusy(true);
    setError("");
    try {
      setResult(await api.logMeasurement(active.id, { weight_kg: +weight.toFixed(1), height_cm: +height.toFixed(1), date_logged: date }));
    } catch (err) {
      setError(errorMessage(err, "Pengukuran belum bisa disimpan."));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    const v = growthVerdict(active?.name ?? "Si kecil", result.stunting_status, result.weight_status, result.wasting_status);
    return (
      <Screen edges={["top", "bottom"]}>
        <Celebrate title="Tersimpan!" body={`${active?.name} · ${num(result.weight_kg)} kg · ${num(result.height_cm)} cm`} />
        <VerdictCard {...v} />
        <Card>
          <Text style={styles.cardTitle}>Dibanding anak seusianya</Text>
          <Plain label="Berat badan" z={result.wfa_zscore} status={result.weight_status} />
          <Plain label="Tinggi badan" z={result.lhfa_zscore} status={result.stunting_status} />
          {result.wfh_zscore !== null ? <Plain label="Berat menurut tinggi" z={result.wfh_zscore} status={result.wasting_status} /> : null}
        </Card>
        <Button title="Selesai" icon="checkmark" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <YellowBar title={`Ukur ${active?.name ?? ""}`} subtitle="Masukkan berat dan tinggi hari ini" onBack={() => router.back()} />
      <View style={styles.body}>
        <ErrorBox message={error} />
        <Card>
          <Text style={styles.cardTitle}>Berat badan</Text>
          <Stepper value={weight} onChange={setWeight} step={0.1} min={1} max={40} unit="kilogram" color={colors.coral} />
          <Slider style={styles.slider} minimumValue={1} maximumValue={40} step={0.1} value={weight} onValueChange={(v: number) => setWeight(+v.toFixed(1))} minimumTrackTintColor={colors.coral} maximumTrackTintColor={colors.track} thumbTintColor={colors.coral} />
        </Card>
        <Card>
          <Text style={styles.cardTitle}>Tinggi badan</Text>
          <Stepper value={height} onChange={setHeight} step={0.5} min={30} max={130} unit="sentimeter" color={colors.teal} />
          <Slider style={styles.slider} minimumValue={30} maximumValue={130} step={0.5} value={height} onValueChange={(v: number) => setHeight(+v.toFixed(1))} minimumTrackTintColor={colors.teal} maximumTrackTintColor={colors.track} thumbTintColor={colors.teal} />
          <Text style={styles.hint}>Di bawah 2 tahun: ukur sambil berbaring. Di atas 2 tahun: berdiri tegak.</Text>
        </Card>
        <Card>
          <Text style={styles.cardTitle}>Kapan diukur?</Text>
          <Chips
            options={[
              { value: "today", label: "Hari ini", icon: "location-outline" },
              { value: "yesterday", label: "Kemarin", icon: "time-outline" },
              { value: "other", label: "Tanggal lain", icon: "calendar-outline" },
            ]}
            value={when}
            onChange={setWhen}
          />
          {when === "other" ? <DateField label="Tanggal pengukuran" value={otherDate} onChange={setOtherDate} /> : null}
        </Card>
        <Button title="Simpan" icon="checkmark" onPress={submit} loading={busy} />
      </View>
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
      <Pill tone={statusTone(status)}>{status ?? "—"}</Pill>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg },
  cardTitle: { fontFamily: font.extra, fontSize: 16, color: colors.ink, marginBottom: spacing.xs },
  slider: { width: "100%", height: 40, marginTop: spacing.xs },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  plainRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10, borderTopWidth: 2, borderStyle: "dashed", borderColor: colors.track },
  plainLabel: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
});
