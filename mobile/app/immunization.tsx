import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, errorMessage, type DoseStatus, type ImmunizationSummary, type VaccineDose } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Bounce, Card, ErrorBox, Icon, Loading, Pill, Progress, Row, Screen, VerdictCard, YellowBar, success } from "../src/components/ui";
import { fmtDate } from "../src/lib/format";
import { immunizationVerdict } from "../src/lib/friendly";
import { colors, font, INK_BORDER, spacing, type Tone } from "../src/lib/theme";

const STATUS_TONE: Record<DoseStatus, Tone> = { given: "good", due: "warn", overdue: "bad", upcoming: "muted" };
const STATUS_LABEL: Record<DoseStatus, string> = { given: "Selesai", due: "Saatnya", overdue: "Terlambat", upcoming: "Nanti" };

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
        setError(errorMessage(err, "Jadwal imunisasi belum bisa dimuat."));
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
    if (dose.status === "given") Alert.alert("Batalkan tanda?", `${dose.name} akan ditandai belum diberikan.`, [{ text: "Batal", style: "cancel" }, { text: "Ya, batalkan", style: "destructive", onPress: run }]);
    else run();
  };

  const groups = data ? Array.from(new Set(data.schedule.map((d) => d.due_age_months))).map((m) => ({ months: m, doses: data.schedule.filter((d) => d.due_age_months === m) })) : [];
  const total = data?.schedule.length ?? 0;
  const verdict = data ? immunizationVerdict(data.overdue, data.due, data.next_dose?.name ?? null) : null;

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)}>
      <YellowBar title="Imunisasi" subtitle="Ketuk kotak jika sudah diberikan" onBack={() => router.back()} />
      <View style={styles.body}>
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
                  {data.given} dari {total} dosis selesai
                </Text>
                <Text style={styles.progressPct}>{total ? Math.round((data.given / total) * 100) : 0}%</Text>
              </Row>
              <Progress value={total ? (data.given / total) * 100 : 0} color={colors.teal} />
            </Card>

            {groups.map((g) => (
              <View key={g.months}>
                <Text style={styles.groupTitle}>{g.months === 0 ? "Saat lahir" : `Usia ${g.months} bulan`}</Text>
                <Card pad={spacing.md}>
                  {g.doses.map((d, i) => {
                    const done = d.status === "given";
                    return (
                      <Bounce key={d.code} onPress={() => toggle(d)} disabled={busyCode === d.code} style={[styles.dose, i > 0 && styles.divider, busyCode === d.code && { opacity: 0.5 }]} scale={0.98}>
                        <View style={[styles.check, done && styles.checkOn, d.status === "overdue" && !done && { borderColor: colors.coral }]}>{done ? <Icon name="checkmark" size={20} color={colors.white} /> : null}</View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.doseName, done && { color: colors.muted }]}>{d.name}</Text>
                          <Text style={styles.meta}>{done && d.given_on ? `Diberikan ${fmtDate(d.given_on)}` : d.status === "overdue" ? `Seharusnya ${fmtDate(d.due_date)}` : `Jadwal ${fmtDate(d.due_date)}`}</Text>
                        </View>
                        <Pill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Pill>
                      </Bounce>
                    );
                  })}
                </Card>
              </View>
            ))}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  progressLabel: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  progressPct: { fontFamily: font.extra, fontSize: 14, color: "#00777A" },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  groupTitle: { fontFamily: font.extra, fontSize: 15, color: colors.ink, marginTop: spacing.sm, marginBottom: 8 },
  dose: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12 },
  divider: { borderTopWidth: 2, borderStyle: "dashed", borderColor: colors.track },
  check: { width: 34, height: 34, borderRadius: 10, borderWidth: INK_BORDER, borderColor: colors.ink, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.green },
  doseName: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
});
