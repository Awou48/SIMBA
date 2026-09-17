import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, errorMessage, type GrowthStandardPoint, type Measurement } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { GrowthChart, type ChartPoint } from "../../src/components/GrowthChart";
import { Bounce, Button, Card, Chips, Empty, ErrorBox, Icon, Loading, Pill, Row, Screen, SectionTitle, VerdictCard, YellowBar } from "../../src/components/ui";
import { fmtDate, fmtZ, num, statusTone } from "../../src/lib/format";
import { growthVerdict, zPlain } from "../../src/lib/friendly";
import { colors, font, spacing } from "../../src/lib/theme";

type Metric = "wfa" | "lhfa";
const METRICS: { value: Metric; label: string; icon: string }[] = [
  { value: "wfa", label: "Berat", icon: "resize-outline" },
  { value: "lhfa", label: "Tinggi", icon: "trending-up-outline" },
];

export default function Growth() {
  const { active } = useChildren();
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("wfa");
  const [rows, setRows] = useState<Measurement[]>([]);
  const [standards, setStandards] = useState<Record<Metric, GrowthStandardPoint[]>>({ wfa: [], lhfa: [] });
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
        const [m, wfa, lhfa] = await Promise.all([api.listMeasurements(active.id), api.growthStandards("wfa", active.gender), api.growthStandards("lhfa", active.gender)]);
        setRows(m);
        setStandards({ wfa, lhfa });
      } catch (err) {
        setError(errorMessage(err, "Data pertumbuhan belum bisa dimuat."));
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

  const points = useMemo<ChartPoint[]>(() => rows.map((r) => ({ ageMonths: r.age_in_days / 30.4375, value: metric === "wfa" ? r.weight_kg : r.height_cm, label: fmtDate(r.date_logged) })), [rows, metric]);
  const latest = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  const verdict = growthVerdict(active?.name ?? "Si kecil", latest?.stunting_status, latest?.weight_status, latest?.wasting_status);

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)}>
      <YellowBar title="Pertumbuhan" subtitle="Dibandingkan standar WHO" />
      <View style={styles.body}>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={() => load()} />
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Card>
            <Empty icon="resize-outline" title="Belum ada pengukuran" body="Masukkan berat dan tinggi hari ini untuk melihat pertumbuhannya dibanding anak seusianya." action={<Button title="Ukur sekarang" icon="add" onPress={() => router.push("/measurement")} />} />
          </Card>
        ) : (
          <>
            <VerdictCard {...verdict} />

            {latest ? (
              <Row style={{ gap: spacing.md, alignItems: "stretch" }}>
                <Delta icon="resize-outline" tone={colors.coral} label="Berat badan" value={`${num(latest.weight_kg)} kg`} delta={previous ? latest.weight_kg - previous.weight_kg : null} unit="kg" />
                <Delta icon="trending-up-outline" tone={colors.teal} label="Tinggi badan" value={`${num(latest.height_cm)} cm`} delta={previous ? latest.height_cm - previous.height_cm : null} unit="cm" />
              </Row>
            ) : null}

            <Card>
              <Chips options={METRICS} value={metric} onChange={setMetric} />
              <GrowthChart standards={standards[metric]} points={points} unit={metric === "wfa" ? "kg" : "cm"} />
              <Text style={styles.chartHint}>Area hijau = rentang sehat. Titik {active?.name} sebaiknya tetap di dalamnya.</Text>
            </Card>

            <Button title="Ukur sekarang" icon="add" onPress={() => router.push("/measurement")} />

            {latest ? (
              <>
                <Bounce onPress={() => setShowDetails((s) => !s)} style={styles.detailsToggle} haptic={false}>
                  <Text style={styles.detailsText}>{showDetails ? "Sembunyikan angka rinci" : "Lihat angka rinci"}</Text>
                  <Icon name={showDetails ? "chevron-up" : "chevron-down"} size={18} color={colors.coral} />
                </Bounce>
                {showDetails ? (
                  <Card>
                    <ZRow label="Berat menurut usia" z={latest.wfa_zscore} status={latest.weight_status} />
                    <ZRow label="Tinggi menurut usia" z={latest.lhfa_zscore} status={latest.stunting_status} />
                    <ZRow label="Berat menurut tinggi" z={latest.wfh_zscore} status={latest.wasting_status} last />
                    <Text style={styles.zNote}>Angka −2 sampai +2 berarti normal. Mengikuti standar WHO dan Permenkes 2/2020.</Text>
                  </Card>
                ) : null}
              </>
            ) : null}

            <SectionTitle title="Riwayat pengukuran" />
            <Card pad={spacing.md}>
              {[...rows].reverse().map((r, i) => (
                <View key={r.id} style={[styles.historyRow, i > 0 && styles.divider]}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyDate}>{fmtDate(r.date_logged)}</Text>
                    <Text style={styles.meta}>
                      {Math.floor(r.age_in_days / 30.4375)} bulan · {num(r.weight_kg)} kg · {num(r.height_cm)} cm
                    </Text>
                  </View>
                  <Pill tone={statusTone(r.stunting_status)}>{r.stunting_status}</Pill>
                </View>
              ))}
            </Card>
          </>
        )}
      </View>
    </Screen>
  );
}

function Delta({ icon, tone, label, value, delta, unit }: { icon: string; tone: string; label: string; value: string; delta: number | null; unit: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <Icon name={icon} size={26} color={tone} />
      <Text style={styles.deltaValue}>{value}</Text>
      <Text style={styles.meta}>{label}</Text>
      {delta !== null && delta !== 0 ? (
        <Text style={[styles.deltaChange, { color: delta > 0 ? colors.green : "#C4302E" }]}>
          {delta > 0 ? "▲ naik" : "▼ turun"} {num(Math.abs(delta))} {unit}
        </Text>
      ) : null}
    </Card>
  );
}

function ZRow({ label, z, status, last }: { label: string; z: number | null; status: string | null; last?: boolean }) {
  return (
    <View style={[styles.zRow, !last && styles.divider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.zLabel}>{label}</Text>
        <Text style={styles.meta}>{zPlain(z)}</Text>
      </View>
      {z === null ? (
        <Text style={styles.meta}>—</Text>
      ) : (
        <>
          <Text style={styles.zValue}>{fmtZ(z)}</Text>
          <Pill tone={statusTone(status)}>{status ?? "—"}</Pill>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  deltaValue: { fontFamily: font.display, fontSize: 26, color: colors.ink },
  deltaChange: { fontFamily: font.extra, fontSize: 13, marginTop: 2 },
  chartHint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: spacing.sm, lineHeight: 19 },
  detailsToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.md },
  detailsText: { fontFamily: font.extra, fontSize: 14, color: colors.coral },
  zRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  zLabel: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  zValue: { fontFamily: font.display, fontSize: 15, color: colors.ink, width: 56, textAlign: "right" },
  zNote: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: spacing.sm, lineHeight: 18 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12 },
  divider: { borderTopWidth: 2, borderStyle: "dashed", borderColor: colors.track },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.ink },
  historyDate: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
});
