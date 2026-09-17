import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { api, errorMessage, type AlertItem, type GrowthReport } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Bounce, Card, ErrorBox, Hard, Icon, Loading, Ring, Row, Screen, SectionTitle, VerdictCard } from "../../src/components/ui";
import { fmtDate, num } from "../../src/lib/format";
import { CATEGORY_ICON, growthVerdict, immunizationVerdict, kpspVerdict, nutritionVerdict } from "../../src/lib/friendly";
import { colors, font, INK_BORDER, spacing, tones, type Tone } from "../../src/lib/theme";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
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
        setError(errorMessage(err, "Data belum bisa dimuat."));
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

  const name = active?.name ?? "si kecil";
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
      <View style={styles.header}>
        <Row style={{ justifyContent: "space-between", marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>{greeting()}</Text>
            <Text style={styles.title}>Bagaimana {name} hari ini?</Text>
          </View>
          <Bounce onPress={() => router.push("/alerts")} accessibilityLabel="Pengingat">
            <View style={styles.bell}>
              <Icon name="notifications" size={22} color={colors.yellow} />
              {alerts.length > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{alerts.length}</Text>
                </View>
              ) : null}
            </View>
          </Bounce>
        </Row>
        <ChildSwitcher />
        <Row style={{ gap: spacing.sm }}>
          <Stat label="Berat" value={latest ? `${num(latest.weight_kg)} kg` : "—"} />
          <Stat label="Tinggi" value={latest ? `${num(latest.height_cm)} cm` : "—"} />
          <Stat label="Diukur" value={latest ? fmtDate(latest.date, "dayMonth") : "belum"} />
        </Row>
      </View>

      <View style={styles.body}>
        <ErrorBox message={error} onRetry={() => load()} />
        {loading ? (
          <Loading />
        ) : (
          <>
            <VerdictCard {...growth} onPress={() => router.push(latest ? "/(tabs)/growth" : "/measurement")} action={latest ? "Lihat grafik pertumbuhan" : "Ukur sekarang"} />

            <View style={styles.quick}>
              <Quick icon="resize-outline" label="Ukur" tone="coral" onPress={() => router.push("/measurement")} />
              <Quick icon="restaurant-outline" label="Catat makan" tone="teal" onPress={() => router.push("/meal")} />
              <Quick icon="medical-outline" label="Imunisasi" tone="yellow" onPress={() => router.push("/immunization")} />
              <Quick icon="document-text-outline" label="Laporan" tone="violet" onPress={() => router.push("/reports")} />
            </View>

            <SectionTitle title="Makan hari ini" action="Lihat" onAction={() => router.push("/(tabs)/nutrition")} />
            <Card onPress={() => router.push("/(tabs)/nutrition")}>
              <Row style={{ gap: spacing.xl, justifyContent: "center" }}>
                <Ring value={energyPct} color={colors.coral} label={`${Math.round(energyPct)}%`} sub="ENERGI" />
                <Ring value={proteinPct} color={colors.teal} label={`${Math.round(proteinPct)}%`} sub="PROTEIN" />
              </Row>
              <Text style={styles.plateHeadline}>{nutrition?.headline}</Text>
              <Text style={styles.plateDetail}>{nutrition?.detail}</Text>
            </Card>

            <SectionTitle title="Perlu diperhatikan" />
            {immun ? <VerdictCard {...immun} onPress={() => router.push("/immunization")} action="Buka jadwal imunisasi" /> : null}
            {kpsp ? <VerdictCard {...kpsp} onPress={() => router.push("/(tabs)/development")} action="Buka perkembangan" /> : null}

            {alerts.length > 0 ? (
              <>
                <SectionTitle title="Pengingat" action="Semua" onAction={() => router.push("/alerts")} />
                {alerts.slice(0, 3).map((a) => (
                  <Card key={a.id} onPress={() => router.push(ALERT_ROUTE[a.category])} pad={spacing.md}>
                    <Row style={{ gap: spacing.md }}>
                      <View style={[styles.alertIcon, { backgroundColor: tones[SEVERITY[a.severity]].bg }]}>
                        <Icon name={CATEGORY_ICON[a.category]} size={22} color={tones[SEVERITY[a.severity]].fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertTitle}>{a.title}</Text>
                        <Text style={styles.alertBody} numberOfLines={2}>
                          {a.description}
                        </Text>
                      </View>
                      <Icon name="chevron-forward" size={20} color={colors.muted} />
                    </Row>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Quick({ icon, label, tone, onPress }: { icon: string; label: string; tone: Tone; onPress: () => void }) {
  return (
    <Bounce onPress={onPress} style={styles.quickItem} scale={0.92}>
      <Hard r={20} offset={3} bg={tones[tone].bg}>
        <View style={styles.quickIcon}>
          <Icon name={icon} size={28} color={tones[tone].fg} />
        </View>
      </Hard>
      <Text style={styles.quickLabel}>{label}</Text>
    </Bounce>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.yellow, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl + 8, borderBottomWidth: INK_BORDER, borderColor: colors.ink },
  greet: { fontFamily: font.bold, fontSize: 14, color: colors.headerSub },
  title: { fontFamily: font.display, fontSize: 25, color: colors.ink, marginTop: 2, lineHeight: 30 },
  bell: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, right: -4, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.coral, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderWidth: INK_BORDER, borderColor: colors.ink },
  badgeText: { color: colors.white, fontSize: 12, fontFamily: font.extra },
  stat: { flex: 1, backgroundColor: colors.ink, borderRadius: 16, paddingVertical: 12, alignItems: "center", gap: 2 },
  statValue: { fontFamily: font.display, fontSize: 18, color: colors.white },
  statLabel: { fontFamily: font.bold, fontSize: 13, color: "rgba(255,255,255,0.8)" },
  body: { paddingHorizontal: spacing.lg, marginTop: -spacing.lg, paddingTop: spacing.xs },
  quick: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm, marginTop: spacing.xs },
  quickItem: { flex: 1, alignItems: "center", gap: 8 },
  quickIcon: { width: 62, height: 62, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontFamily: font.extra, fontSize: 13, color: colors.ink, textAlign: "center" },
  plateHeadline: { fontFamily: font.display, fontSize: 17, color: colors.ink, textAlign: "center", marginTop: spacing.sm },
  plateDetail: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
  alertIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  alertTitle: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  alertBody: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
});
