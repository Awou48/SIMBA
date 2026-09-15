import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, errorMessage, type GrowthStandardPoint, type Measurement } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { GrowthChart, type ChartPoint } from "../../src/components/GrowthChart";
import { Button, Card, Empty, ErrorBox, Header, Loading, Pill, Row, Screen, SectionTitle, Segmented } from "../../src/components/ui";
import { fmtDate, fmtZ, statusTone, zTone } from "../../src/lib/format";
import { colors, spacing, tones } from "../../src/lib/theme";

type Metric = "wfa" | "lhfa" | "bfa";
const METRICS: { value: Metric; label: string }[] = [
  { value: "wfa", label: "Weight" },
  { value: "lhfa", label: "Height" },
  { value: "bfa", label: "BMI" },
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
  const unit = metric === "wfa" ? "kg" : metric === "lhfa" ? "cm" : "kg/m²";

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Growth" subtitle="WHO Child Growth Standards · Permenkes 2/2020" />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <Empty title="No measurements yet" body="Add weight and height to see z-scores and the growth curve against the WHO median." action={<Button title="Log measurement" icon="add" onPress={() => router.push("/measurement")} />} />
        </Card>
      ) : (
        <>
          <Card>
            <Segmented options={METRICS} value={metric} onChange={setMetric} />
            <GrowthChart standards={standards[metric]} points={points} unit={unit} />
          </Card>

          {latest ? (
            <Card>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.cardTitle}>Latest · {fmtDate(latest.date_logged)}</Text>
                <Text style={styles.meta}>{Math.floor(latest.age_in_days / 30.4375)} months</Text>
              </Row>
              <View style={styles.grid}>
                <ZCell label="Weight-for-age" value={`${latest.weight_kg} kg`} z={latest.wfa_zscore} status={latest.weight_status} />
                <ZCell label="Height-for-age" value={`${latest.height_cm} cm`} z={latest.lhfa_zscore} status={latest.stunting_status} />
                <ZCell label="Weight-for-height" value="" z={latest.wfh_zscore} status={latest.wasting_status ?? "—"} />
                <ZCell label="BMI-for-age" value={latest.bmi ? latest.bmi.toFixed(1) : "—"} z={latest.bfa_zscore} status={latest.bmi_status ?? "—"} />
              </View>
            </Card>
          ) : null}

          <Button title="Log new measurement" icon="add" onPress={() => router.push("/measurement")} />

          <SectionTitle title={`History · ${rows.length} entr${rows.length === 1 ? "y" : "ies"}`} />
          <Card style={{ paddingVertical: spacing.xs }}>
            {[...rows].reverse().map((r, i) => (
              <View key={r.id} style={[styles.historyRow, i > 0 && styles.historyDivider]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>{fmtDate(r.date_logged)}</Text>
                  <Text style={styles.meta}>{Math.floor(r.age_in_days / 30.4375)} mo · {r.weight_kg} kg · {r.height_cm} cm</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[styles.z, { color: tones[zTone(r.lhfa_zscore)].fg }]}>HFA {fmtZ(r.lhfa_zscore)}</Text>
                  <Text style={[styles.z, { color: tones[zTone(r.wfa_zscore)].fg }]}>WFA {fmtZ(r.wfa_zscore)}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function ZCell({ label, value, z, status }: { label: string; value: string; z: number | null; status: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      {z === null ? (
        <Text style={styles.meta}>Not computed for this age</Text>
      ) : (
        <>
          <Row style={{ gap: 6 }}>
            {value ? <Text style={styles.cellValue}>{value}</Text> : null}
            <Text style={[styles.z, { color: tones[zTone(z)].fg }]}>{fmtZ(z)}</Text>
          </Row>
          <Pill tone={statusTone(status)} small>{status}</Pill>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.md, gap: spacing.md },
  cell: { width: "47%", gap: 4 },
  cellLabel: { fontSize: 11, fontWeight: "700", color: colors.muted },
  cellValue: { fontSize: 16, fontWeight: "800", color: colors.text },
  z: { fontSize: 12, fontWeight: "800" },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  historyDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  historyDate: { fontSize: 14, fontWeight: "700", color: colors.text },
});
