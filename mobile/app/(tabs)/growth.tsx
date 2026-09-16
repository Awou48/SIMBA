import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type GrowthStandardPoint, type Measurement } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { GrowthChart, type ChartPoint } from "../../src/components/GrowthChart";
import { Bounce, Button, Card, Chips, Empty, ErrorBox, Header, Loading, Pill, Row, Screen, SectionTitle, VerdictCard } from "../../src/components/ui";
import { fmtDate, fmtZ, statusTone } from "../../src/lib/format";
import { growthVerdict, zPlain } from "../../src/lib/friendly";
import { colors, font, spacing } from "../../src/lib/theme";

type Metric = "wfa" | "lhfa" | "bfa";
const METRICS: { value: Metric; label: string; emoji: string }[] = [
  { value: "wfa", label: "Weight", emoji: "⚖️" },
  { value: "lhfa", label: "Height", emoji: "📏" },
  { value: "bfa", label: "BMI", emoji: "🧮" },
];

export default function Growth() {
  const { active } = useChildren();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("wfa");
  const [rows, setRows] = useState<Measurement[]>([]);
  const [standards, setStandards] = useState<Record<Metric, GrowthStandardPoint[]>>({ wfa: [], lhfa: [], bfa: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  const load = useCallback(
    async (soft = false) => {
      if (!active) return;
      soft ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        const [m, wfa, lhfa, bfa] = await Promise.all([
          api.listMeasurements(active.id),
          api.growthStandards("wfa", active.gender),
          api.growthStandards("lhfa", active.gender),
          api.growthStandards("bfa", active.gender),
        ]);
        setRows(m);
        setStandards({ wfa, lhfa, bfa });
      } catch (err) {
        setError(errorMessage(err, "Could not load growth data."));
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

  const points = useMemo<ChartPoint[]>(
    () =>
      rows
        .map((r) => ({
          ageMonths: r.age_in_days / 30.4375,
          value: metric === "wfa" ? r.weight_kg : metric === "lhfa" ? r.height_cm : (r.bmi ?? NaN),
          label: fmtDate(r.date_logged),
        }))
        .filter((p) => Number.isFinite(p.value)),
    [rows, metric],
  );

  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const unit = metric === "wfa" ? "kg" : metric === "lhfa" ? "cm" : "kg/m²";
  const verdict = growthVerdict(active?.name ?? "Your child", latest?.stunting_status, latest?.weight_status, latest?.wasting_status);

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Growth" emoji="📏" subtitle="Compared with WHO growth standards" />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <Empty emoji="📏" title="No measurements yet" body="Add today's weight and height and we'll show how your child compares with other children the same age." action={<Button title="Measure now" emoji="⚖️" onPress={() => router.push("/measurement")} />} />
        </Card>
      ) : (
        <>
          <VerdictCard {...verdict} />

          {latest ? (
            <Row style={{ gap: spacing.md }}>
              <Delta emoji="⚖️" label="Weight" value={`${latest.weight_kg} kg`} delta={previous ? latest.weight_kg - previous.weight_kg : null} unit="kg" />
              <Delta emoji="📏" label="Height" value={`${latest.height_cm} cm`} delta={previous ? latest.height_cm - previous.height_cm : null} unit="cm" />
            </Row>
          ) : null}

          <Card>
            <Chips options={METRICS} value={metric} onChange={setMetric} />
            <GrowthChart standards={standards[metric]} points={points} unit={unit} />
            <Text style={styles.chartHint}>The green band is where most healthy children are. {active?.name}'s dots should stay inside it as they grow.</Text>
          </Card>

          <Button title="Add a new measurement" emoji="➕" onPress={() => router.push("/measurement")} />

          {latest ? (
            <>
              <Bounce onPress={() => setShowDetails((s) => !s)} style={styles.detailsToggle} haptic={false}>
                <Text style={styles.detailsText}>{showDetails ? "Hide" : "Show"} the numbers (z-scores)</Text>
                <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={18} color={colors.orange} />
              </Bounce>
              {showDetails ? (
                <Card>
                  <ZRow label="Weight for age" z={latest.wfa_zscore} status={latest.weight_status} />
                  <ZRow label="Height for age" z={latest.lhfa_zscore} status={latest.stunting_status} />
                  <ZRow label="Weight for height" z={latest.wfh_zscore} status={latest.wasting_status} />
                  <ZRow label="BMI for age" z={latest.bfa_zscore} status={latest.bmi_status} last />
                  <Text style={styles.zNote}>A z-score between −2 and +2 is the normal range. These follow WHO standards and Permenkes 2/2020.</Text>
                </Card>
              ) : null}
            </>
          ) : null}

          <SectionTitle title="Past measurements" emoji="🗓️" />
          <Card style={{ paddingVertical: spacing.xs }}>
            {[...rows].reverse().map((r, i) => (
              <View key={r.id} style={[styles.historyRow, i > 0 && styles.historyDivider]}>
                <View style={styles.historyDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>{fmtDate(r.date_logged)}</Text>
                  <Text style={styles.meta}>
                    {Math.floor(r.age_in_days / 30.4375)} months · {r.weight_kg} kg · {r.height_cm} cm
                  </Text>
                </View>
                <Pill tone={statusTone(r.stunting_status)} small>
                  {r.stunting_status}
                </Pill>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Delta({ emoji, label, value, delta, unit }: { emoji: string; label: string; value: string; delta: number | null; unit: string }) {
  return (
    <Card style={styles.delta}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={styles.deltaValue}>{value}</Text>
      <Text style={styles.meta}>{label}</Text>
      {delta !== null ? (
        <Text style={[styles.deltaChange, { color: delta >= 0 ? "#2E9F6A" : "#D6414E" }]}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)} {unit} since last time
        </Text>
      ) : null}
    </Card>
  );
}

function ZRow({ label, z, status, last }: { label: string; z: number | null; status: string | null; last?: boolean }) {
  return (
    <View style={[styles.zRow, !last && styles.historyDivider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.zLabel}>{label}</Text>
        <Text style={styles.meta}>{zPlain(z)}</Text>
      </View>
      {z === null ? (
        <Text style={styles.meta}>—</Text>
      ) : (
        <>
          <Text style={styles.zValue}>{fmtZ(z)}</Text>
          <Pill tone={statusTone(status)} small>
            {status ?? "—"}
          </Pill>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  delta: { flex: 1, alignItems: "flex-start", gap: 2 },
  deltaValue: { fontFamily: font.black, fontSize: 24, color: colors.text },
  deltaChange: { fontFamily: font.extra, fontSize: 11, marginTop: 4 },
  chartHint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: spacing.sm, lineHeight: 17 },
  detailsToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.md },
  detailsText: { fontFamily: font.extra, fontSize: 13, color: colors.orange },
  zRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  zLabel: { fontFamily: font.extra, fontSize: 14, color: colors.text },
  zValue: { fontFamily: font.black, fontSize: 14, color: colors.text, width: 52, textAlign: "right" },
  zNote: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: spacing.sm, lineHeight: 16 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12 },
  historyDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.orange },
  historyDate: { fontFamily: font.extra, fontSize: 14, color: colors.text },
});
