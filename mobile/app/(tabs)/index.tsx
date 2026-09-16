import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type AlertItem, type GrowthReport } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Bounce, Card, ErrorBox, GradientHeader, Loading, Ring, Row, Screen, SectionTitle, VerdictCard } from "../../src/components/ui";
import { fmtDate } from "../../src/lib/format";
import { CATEGORY_EMOJI, growthVerdict, immunizationVerdict, kpspVerdict, nutritionVerdict } from "../../src/lib/friendly";
import { colors, font, radius, spacing, tones, type Tone } from "../../src/lib/theme";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return { text: "Selamat pagi", emoji: "🌤️" };
  if (h < 15) return { text: "Selamat siang", emoji: "☀️" };
  if (h < 18) return { text: "Selamat sore", emoji: "🌇" };
  return { text: "Selamat malam", emoji: "🌙" };
}

const ALERT_ROUTE: Record<AlertItem["category"], Href> = { Growth: "/(tabs)/growth", Nutrition: "/(tabs)/nutrition", Development: "/(tabs)/development", Immunization: "/immunization" };
const SEVERITY: Record<AlertItem["severity"], Tone> = { high: "bad", medium: "warn", low: "teal" };

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

  const g = greeting();
  const name = active?.name ?? "your child";
  const latest = report?.latest;
  const growth = growthVerdict(name, report?.status?.stunting, report?.status?.weight, report?.status?.wasting);
  const nutrition = report ? nutritionVerdict(report.nutrition_7d.fulfillment_percent?.energy, report.nutrition_7d.logged_today || report.nutrition_7d.days_logged > 0) : null;
  const kpsp = report ? kpspVerdict(report.milestones.interpretation, report.milestones.answered, report.milestones.total) : null;
  const immun = report ? immunizationVerdict(report.immunization.overdue, report.immunization.due, report.immunization.next_dose?.name ?? null) : null;
  const alerts = report?.alerts ?? [];
  const energyPct = report?.nutrition_7d.fulfillment_percent?.energy ?? 0;
  const proteinPct = report?.nutrition_7d.fulfillment_percent?.protein ?? 0;

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)}>
      <GradientHeader>
        <Row style={{ justifyContent: "space-between", marginBottom: spacing.md }}>
          <View>
            <Text style={styles.greet}>
              {g.text} {g.emoji}
            </Text>
            <Text style={styles.title}>How is {name} today?</Text>
          </View>
          <Bounce onPress={() => router.push("/alerts")} style={styles.bell} accessibilityLabel="Alerts">
            <Ionicons name="notifications" size={22} color={colors.orange} />
            {alerts.length > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{alerts.length}</Text>
              </View>
            ) : null}
          </Bounce>
        </Row>
        <ChildSwitcher light />
        <Row style={{ gap: spacing.md, marginTop: -4 }}>
          <Stat emoji="⚖️" label="Weight" value={latest ? `${latest.weight_kg} kg` : "—"} />
          <Stat emoji="📏" label="Height" value={latest ? `${latest.height_cm} cm` : "—"} />
          <Stat emoji="📅" label="Measured" value={latest ? fmtDate(latest.date, { day: "numeric", month: "short" }) : "never"} />
        </Row>
      </GradientHeader>

      <View style={styles.body}>
        <ErrorBox message={error} onRetry={() => load()} />
        {loading ? (
          <Loading />
        ) : (
          <>
            <VerdictCard {...growth} onPress={() => router.push(latest ? "/(tabs)/growth" : "/measurement")} action={latest ? "See the growth curve" : "Measure now"} />

            <View style={styles.quick}>
              <Quick emoji="⚖️" label="Measure" tone="orange" onPress={() => router.push("/measurement")} />
              <Quick emoji="🍲" label="Log meal" tone="teal" onPress={() => router.push("/meal")} />
              <Quick emoji="💉" label="Vaccines" tone="yellow" onPress={() => router.push("/immunization")} />
              <Quick emoji="📄" label="Report" tone="lavender" onPress={() => router.push("/reports")} />
            </View>

            <SectionTitle title="Today's plate" emoji="🍽️" action="Meals" onAction={() => router.push("/(tabs)/nutrition")} />
            <Card onPress={() => router.push("/(tabs)/nutrition")}>
              <Row style={{ gap: spacing.lg, justifyContent: "center" }}>
                <Ring value={energyPct} color={colors.orange} label={`${Math.round(energyPct)}%`} sub="energy" size={96} />
                <Ring value={proteinPct} color={colors.teal} label={`${Math.round(proteinPct)}%`} sub="protein" size={96} />
              </Row>
              <Text style={styles.plateHeadline}>
                {nutrition?.emoji} {nutrition?.headline}
              </Text>
              <Text style={styles.plateDetail}>{nutrition?.detail}</Text>
            </Card>

            <SectionTitle title="Keeping up" emoji="🌈" />
            {immun ? <VerdictCard {...immun} onPress={() => router.push("/immunization")} action="Open schedule" /> : null}
            {kpsp ? <VerdictCard {...kpsp} onPress={() => router.push("/(tabs)/development")} action="Open milestones" /> : null}

            {alerts.length > 0 ? (
              <>
                <SectionTitle title="Gentle reminders" emoji="🔔" action="All" onAction={() => router.push("/alerts")} />
                {alerts.slice(0, 3).map((a) => (
                  <Card key={a.id} onPress={() => router.push(ALERT_ROUTE[a.category])} style={styles.alert}>
                    <View style={[styles.alertIcon, { backgroundColor: tones[SEVERITY[a.severity]].bg }]}>
                      <Text style={{ fontSize: 20 }}>{CATEGORY_EMOJI[a.category]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.alertTitle}>{a.title}</Text>
                      <Text style={styles.alertBody} numberOfLines={2}>
                        {a.description}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Card>
                ))}
              </>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function Stat({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Quick({ emoji, label, tone, onPress }: { emoji: string; label: string; tone: Tone; onPress: () => void }) {
  return (
    <Bounce onPress={onPress} style={styles.quickItem} scale={0.92}>
      <View style={[styles.quickIcon, { backgroundColor: tones[tone].bg }]}>
        <Text style={{ fontSize: 26 }}>{emoji}</Text>
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Bounce>
  );
}

const styles = StyleSheet.create({
  greet: { fontFamily: font.bold, fontSize: 13, color: "rgba(255,255,255,0.9)" },
  title: { fontFamily: font.black, fontSize: 22, color: colors.white, marginTop: 2 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderWidth: 2, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 10, fontFamily: font.black },
  stat: { flex: 1, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: radius.md, paddingVertical: 10, alignItems: "center", gap: 2 },
  statValue: { fontFamily: font.black, fontSize: 16, color: colors.text },
  statLabel: { fontFamily: font.bold, fontSize: 11, color: colors.muted },
  body: { paddingHorizontal: spacing.lg, marginTop: -spacing.lg },
  quick: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs },
  quickItem: { flex: 1, alignItems: "center", gap: 6 },
  quickIcon: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontFamily: font.extra, fontSize: 12, color: colors.text },
  plateHeadline: { fontFamily: font.extra, fontSize: 15, color: colors.text, lineHeight: 20, marginTop: spacing.md, textAlign: "center" },
  plateDetail: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17, textAlign: "center" },
  alert: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  alertIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  alertTitle: { fontFamily: font.extra, fontSize: 14, color: colors.text },
  alertBody: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
});
