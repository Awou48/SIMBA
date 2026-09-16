import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type DoseStatus, type ImmunizationSummary, type VaccineDose } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Bounce, Card, ErrorBox, Header, Loading, Pill, Progress, Row, Screen, VerdictCard, success } from "../src/components/ui";
import { fmtDate } from "../src/lib/format";
import { immunizationVerdict } from "../src/lib/friendly";
import { colors, font, radius, spacing, type Tone } from "../src/lib/theme";

const STATUS_TONE: Record<DoseStatus, Tone> = { given: "good", due: "warn", overdue: "bad", upcoming: "muted" };
const STATUS_LABEL: Record<DoseStatus, string> = { given: "Done", due: "Due now", overdue: "Overdue", upcoming: "Later" };

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
        if (dose.status !== "given") success();
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setBusyCode(null);
      }
    };
    if (dose.status === "given") Alert.alert("Undo?", `Mark ${dose.name} as not given yet.`, [{ text: "Keep", style: "cancel" }, { text: "Undo", style: "destructive", onPress: run }]);
    else run();
  };

  const groups = data ? Array.from(new Set(data.schedule.map((d) => d.due_age_months))).map((m) => ({ months: m, doses: data.schedule.filter((d) => d.due_age_months === m) })) : [];
  const total = data?.schedule.length ?? 0;
  const verdict = data ? immunizationVerdict(data.overdue, data.due, data.next_dose?.name ?? null) : null;

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Vaccines" emoji="💉" subtitle="Tap a dose once it has been given" onBack={() => router.back()} />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading || !data ? (
        <Loading />
      ) : (
        <>
          {verdict ? <VerdictCard {...verdict} /> : null}
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.progressLabel}>
                {data.given} of {total} doses done
              </Text>
              <Text style={styles.progressPct}>{total ? Math.round((data.given / total) * 100) : 0}%</Text>
            </Row>
            <View style={{ marginTop: 8 }}>
              <Progress value={total ? (data.given / total) * 100 : 0} color={colors.teal} />
            </View>
          </Card>

          {groups.map((g) => (
            <View key={g.months}>
              <Text style={styles.groupTitle}>{g.months === 0 ? "🐣 At birth" : `🎂 ${g.months} month${g.months === 1 ? "" : "s"}`}</Text>
              <Card style={{ paddingVertical: spacing.xs }}>
                {g.doses.map((d, i) => {
                  const done = d.status === "given";
                  return (
                    <Bounce key={d.code} onPress={() => toggle(d)} disabled={busyCode === d.code} style={[styles.dose, i > 0 && styles.divider, busyCode === d.code && { opacity: 0.5 }]} scale={0.98}>
                      <View style={[styles.check, done && styles.checkOn, d.status === "overdue" && !done && styles.checkOverdue]}>{done ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}</View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.doseName, done && { color: colors.muted }]}>{d.name}</Text>
                        <Text style={styles.meta}>{done && d.given_on ? `Given ${fmtDate(d.given_on)}` : `Due ${fmtDate(d.due_date)}`}</Text>
                      </View>
                      <Pill tone={STATUS_TONE[d.status]} small>
                        {STATUS_LABEL[d.status]}
                      </Pill>
                    </Bounce>
                  );
                })}
              </Card>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressLabel: { fontFamily: font.extra, fontSize: 13, color: colors.text },
  progressPct: { fontFamily: font.black, fontSize: 13, color: colors.teal },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  groupTitle: { fontFamily: font.extra, fontSize: 14, color: colors.text, marginTop: spacing.sm, marginBottom: 8 },
  dose: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  check: { width: 30, height: 30, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  checkOn: { backgroundColor: colors.green, borderColor: colors.green },
  checkOverdue: { borderColor: colors.red },
  doseName: { fontFamily: font.extra, fontSize: 14, color: colors.text },
});
