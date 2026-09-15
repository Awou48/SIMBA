import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type DoseStatus, type ImmunizationSummary, type VaccineDose } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Card, ErrorBox, Header, Loading, Pill, Row, Screen, Stat } from "../src/components/ui";
import { fmtDate } from "../src/lib/format";
import { colors, radius, spacing, tones, type Tone } from "../src/lib/theme";

const STATUS_TONE: Record<DoseStatus, Tone> = { given: "good", due: "warn", overdue: "bad", upcoming: "muted" };
const STATUS_LABEL: Record<DoseStatus, string> = { given: "Given", due: "Due now", overdue: "Overdue", upcoming: "Upcoming" };

export default function Immunization() {
  const { active } = useChildren();
  const router = useRouter();
  const [data, setData] = useState<ImmunizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const load = useCallback(
    async (soft = false) => {
      if (!active) return;
      soft ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        setData(await api.immunizations(active.id));
      } catch (err) {
        setError(errorMessage(err, "Could not load the schedule."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [active],
  );

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (dose: VaccineDose) => {
    if (!active) return;
    const run = async () => {
      setBusyCode(dose.code);
      try {
        setData(dose.status === "given" ? await api.unmarkDoseGiven(active.id, dose.code) : await api.markDoseGiven(active.id, dose.code));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusyCode(null);
      }
    };
    if (dose.status === "given") Alert.alert("Undo", `Mark ${dose.name} as not given?`, [{ text: "Cancel", style: "cancel" }, { text: "Undo", style: "destructive", onPress: run }]);
    else run();
  };

  const groups = data
    ? Array.from(new Set(data.schedule.map((d) => d.due_age_months))).map((m) => ({ months: m, doses: data.schedule.filter((d) => d.due_age_months === m) }))
    : [];

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Immunization" subtitle="Kemenkes routine schedule (0–24 months)" onBack={() => router.back()} />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading || !data ? (
        <Loading />
      ) : (
        <>
          <Row style={{ gap: spacing.sm }}>
            <Stat label="Given" value={data.given} tone="good" icon="checkmark-circle" />
            <Stat label="Due" value={data.due} tone="warn" icon="time" />
            <Stat label="Overdue" value={data.overdue} tone="bad" icon="alert-circle" />
          </Row>
          {data.next_dose ? (
            <Card tone="primary">
              <Text style={styles.nextLabel}>Next dose</Text>
              <Text style={styles.nextName}>{data.next_dose.name}</Text>
              <Text style={styles.meta}>Due {fmtDate(data.next_dose.due_date)} · {data.next_dose.note}</Text>
            </Card>
          ) : null}

          {groups.map((g) => (
            <View key={g.months}>
              <Text style={styles.groupTitle}>{g.months === 0 ? "At birth" : `${g.months} month${g.months === 1 ? "" : "s"}`}</Text>
              <Card style={{ paddingVertical: spacing.xs }}>
                {g.doses.map((d, i) => (
                  <Pressable key={d.code} onPress={() => toggle(d)} disabled={busyCode === d.code} style={[styles.dose, i > 0 && styles.divider, busyCode === d.code && { opacity: 0.5 }]}>
                    <View style={[styles.check, d.status === "given" && { backgroundColor: colors.good, borderColor: colors.good }]}>
                      {d.status === "given" ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.doseName}>{d.name}</Text>
                      <Text style={styles.meta}>
                        {d.status === "given" && d.given_on ? `Given ${fmtDate(d.given_on)}` : `Due ${fmtDate(d.due_date)}`}
                        {d.note ? ` · ${d.note}` : ""}
                      </Text>
                    </View>
                    <Pill tone={STATUS_TONE[d.status]} small>{STATUS_LABEL[d.status]}</Pill>
                  </Pressable>
                ))}
              </Card>
            </View>
          ))}
          <Text style={styles.footnote}>Tap a dose to mark it as given today; tap again to undo. Marked doses also appear in the calendar.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nextLabel: { fontSize: 11, fontWeight: "800", color: tones.primary.fg, textTransform: "uppercase", letterSpacing: 0.5 },
  nextName: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 4 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  groupTitle: { fontSize: 13, fontWeight: "800", color: colors.muted, marginTop: spacing.sm, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  dose: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  check: { width: 26, height: 26, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  doseName: { fontSize: 14, fontWeight: "700", color: colors.text },
  footnote: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing.sm, lineHeight: 17 },
});
