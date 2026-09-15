import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type AlertItem, type GrowthReport } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Button, Card, ErrorBox, Loading, Pill, Progress, Row, Screen, SectionTitle } from "../../src/components/ui";
import { fmtDate, fmtZ, statusTone, zTone } from "../../src/lib/format";
import { colors, radius, spacing, tones, type Tone } from "../../src/lib/theme";

const SEVERITY: Record<AlertItem["severity"], Tone> = { high: "bad", medium: "warn", low: "primary" };
const CATEGORY_ICON: Record<AlertItem["category"], keyof typeof Ionicons.glyphMap> = { Growth: "trending-up", Nutrition: "restaurant", Development: "sparkles", Immunization: "shield-checkmark" };

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
}

export default function Home() {
  const { active } = useChildren();
  const router = useRouter();
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (soft = false) => {
      if (!active) return;
      soft ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        setReport(await api.report(active.id));
      } catch (err) {
        setError(errorMessage(err, "Could not load the overview."));
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

  const latest = report?.latest;
  const status = report?.status;
  const alerts = report?.alerts ?? [];
  const nutrition = report?.nutrition_7d;
  const energyPct = nutrition?.fulfillment_percent?.energy ?? null;

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greet}>{greeting()} 👋</Text>
          <Text style={styles.title}>How is {active?.name ?? "your child"} doing?</Text>
        </View>
        <Pressable onPress={() => router.push("/alerts")} style={styles.bell} accessibilityLabel="Alerts">
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {alerts.length > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{alerts.length}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <Card style={styles.hero}>
            {latest && status ? (
              <>
                <Row style={{ justifyContent: "space-between" }}>
                  <Text style={styles.heroLabel}>Latest measurement · {fmtDate(latest.date)}</Text>
                  <Pill tone={statusTone(status.stunting)}>{status.stunting}</Pill>
                </Row>
                <Row style={{ marginTop: spacing.md, gap: spacing.lg }}>
                  <Metric label="Weight" value={`${latest.weight_kg} kg`} z={latest.wfa_zscore} zLabel="WFA" />
                  <Metric label="Height" value={`${latest.height_cm} cm`} z={latest.lhfa_zscore} zLabel="HFA" />
                  <Metric label="BMI" value={latest.bmi.toFixed(1)} z={latest.bfa_zscore} zLabel="BFA" />
                </Row>
                <Row style={{ marginTop: spacing.md, flexWrap: "wrap" }}>
                  <Pill tone={statusTone(status.weight)} small>Weight: {status.weight}</Pill>
                  {status.wasting ? <Pill tone={statusTone(status.wasting)} small>Wasting: {status.wasting}</Pill> : null}
                </Row>
              </>
            ) : (
              <>
                <Text style={styles.heroLabel}>No measurements yet</Text>
                <Text style={styles.heroBody}>Log the first weight and height to see WHO z-scores and the growth curve.</Text>
              </>
            )}
            <Button title={latest ? "Log new measurement" : "Log first measurement"} icon="add" onPress={() => router.push("/measurement")} style={{ marginTop: spacing.lg }} />
          </Card>

          <View style={styles.quick}>
            <Quick icon="restaurant" label="Log a meal" tone="orange" onPress={() => router.push("/meal")} />
            <Quick icon="shield-checkmark" label="Immunization" tone="teal" onPress={() => router.push("/immunization")} />
            <Quick icon="document-text" label="Report" tone="primary" onPress={() => router.push("/reports")} />
            <Quick icon="book" label="Explore" tone="good" onPress={() => router.push("/explore")} />
          </View>

          {alerts.length > 0 ? (
            <>
              <SectionTitle title="Needs attention" action="All alerts" onAction={() => router.push("/alerts")} />
              {alerts.slice(0, 3).map((a) => (
                <Pressable key={a.id} onPress={() => router.push(alertRoute(a))}>
                  <Card style={styles.alert}>
                    <View style={[styles.alertIcon, { backgroundColor: tones[SEVERITY[a.severity]].bg }]}>
                      <Ionicons name={CATEGORY_ICON[a.category]} size={18} color={tones[SEVERITY[a.severity]].fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertTitle}>{a.title}</Text>
                      <Text style={styles.alertBody} numberOfLines={2}>{a.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Card>
                </Pressable>
              ))}
            </>
          ) : null}

          <SectionTitle title="This week" />
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>Nutrition · last 7 days</Text>
              <Text style={styles.cardMeta}>{nutrition?.days_logged ?? 0}/7 days logged</Text>
            </Row>
            {energyPct !== null && nutrition?.targets ? (
              <>
                <Row style={{ justifyContent: "space-between", marginTop: spacing.sm }}>
                  <Text style={styles.cardMeta}>Energy {Math.round(nutrition.average.energy)} / {Math.round(nutrition.targets.energy)} kcal</Text>
                  <Text style={[styles.cardMeta, { fontWeight: "800", color: colors.text }]}>{Math.round(energyPct)}%</Text>
                </Row>
                <View style={{ marginTop: 6 }}>
                  <Progress value={energyPct} tone={energyPct < 70 ? "warn" : energyPct > 130 ? "bad" : "good"} />
                </View>
                <Row style={{ justifyContent: "space-between", marginTop: spacing.sm }}>
                  <Text style={styles.cardMeta}>Protein {Math.round(nutrition.average.protein)} / {Math.round(nutrition.targets.protein)} g</Text>
                  <Text style={[styles.cardMeta, { fontWeight: "800", color: colors.text }]}>{Math.round(nutrition.fulfillment_percent?.protein ?? 0)}%</Text>
                </Row>
                <View style={{ marginTop: 6 }}>
                  <Progress value={nutrition.fulfillment_percent?.protein ?? 0} tone="orange" />
                </View>
              </>
            ) : (
              <Text style={[styles.cardMeta, { marginTop: spacing.sm }]}>Log today's meals to compare intake with the AKG 2019 target.</Text>
            )}
          </Card>

          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>Immunization</Text>
              <Pill tone={report && report.immunization.overdue > 0 ? "bad" : "good"} small>
                {report ? (report.immunization.overdue > 0 ? `${report.immunization.overdue} overdue` : "On schedule") : "—"}
              </Pill>
            </Row>
            <Text style={[styles.cardMeta, { marginTop: 6 }]}>
              {report ? `${report.immunization.given} of ${report.immunization.total} doses given` : ""}
              {report?.immunization.next_dose ? ` · next: ${report.immunization.next_dose.name} (${fmtDate(report.immunization.next_dose.due_date)})` : ""}
            </Text>
          </Card>

          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>Development (KPSP)</Text>
              {report?.milestones.interpretation ? <Pill tone={statusTone(report.milestones.interpretation)} small>{report.milestones.interpretation}</Pill> : null}
            </Row>
            <Text style={[styles.cardMeta, { marginTop: 6 }]}>
              {report ? `${report.milestones.answered}/${report.milestones.total} answered · ${report.milestones.achieved} achieved${report.milestones.age_label ? ` · ${report.milestones.age_label}` : ""}` : ""}
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

function alertRoute(a: AlertItem): Href {
  switch (a.category) {
    case "Growth":
      return "/(tabs)/growth";
    case "Nutrition":
      return "/(tabs)/nutrition";
    case "Development":
      return "/(tabs)/development";
    default:
      return "/immunization";
  }
}

function Metric({ label, value, z, zLabel }: { label: string; value: string; z: number | null; zLabel: string }) {
  const tone = zTone(z);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={[styles.metricZ, { color: tones[tone].fg }]}>
        {zLabel} {fmtZ(z)}
      </Text>
    </View>
  );
}

function Quick({ icon, label, tone, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; tone: Tone; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.8 }]}>
      <View style={[styles.quickIcon, { backgroundColor: tones[tone].bg }]}>
        <Ionicons name={icon} size={20} color={tones[tone].fg} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, gap: spacing.sm },
  greet: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  title: { fontSize: 21, fontWeight: "800", color: colors.text, marginTop: 2 },
  bell: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.bad, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: "800" },
  hero: { backgroundColor: colors.navy, borderColor: "transparent" },
  heroLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700" },
  heroBody: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 6, lineHeight: 20 },
  metricLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700" },
  metricValue: { color: colors.white, fontSize: 20, fontWeight: "800", marginTop: 2 },
  metricZ: { fontSize: 11, fontWeight: "800", marginTop: 2, backgroundColor: "rgba(255,255,255,0.92)", alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  quick: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  quickItem: { flex: 1, alignItems: "center", gap: 6 },
  quickIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, fontWeight: "700", color: colors.text, textAlign: "center" },
  alert: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  alertIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  alertTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  alertBody: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  cardMeta: { fontSize: 12, color: colors.muted },
});
