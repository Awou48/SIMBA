import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, ApiError, errorMessage, session, type GrowthReport } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Button, Card, Empty, ErrorBox, Header, Loading, Pill, Row, Screen, SectionTitle } from "../src/components/ui";
import { fmtDate, fmtZ, statusTone, zTone } from "../src/lib/format";
import { colors, spacing, tones } from "../src/lib/theme";

export default function Reports() {
  const { active } = useChildren();
  const router = useRouter();
  const [report, setReport] = useState<GrowthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (soft = false) => {
      if (!active) return;
      soft ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        setReport(await api.report(active.id));
      } catch (err) {
        setError(errorMessage(err, "Could not build the report."));
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

  const sharePdf = async () => {
    if (!active) return;
    setSharing(true);
    setError("");
    try {
      const res = await fetch(api.reportPdfUrl(active.id), { headers: { Authorization: `Bearer ${session.getToken() ?? ""}` } });
      if (!res.ok) throw new ApiError(res.status, `Could not generate the PDF (${res.status}).`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const filename = `SIMBA-${active.name.replace(/\s+/g, "_")}-${report?.generated_on?.slice(0, 10) ?? "report"}.pdf`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        window.open(url, "_blank");
        return;
      }
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(bytes);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Share growth report" });
      else setError("Sharing is not available on this device.");
    } catch (err) {
      setError(errorMessage(err, "Could not share the PDF."));
    } finally {
      setSharing(false);
    }
  };

  const latest = report?.latest;
  const change = report?.change_since_first;

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Growth report" subtitle={report ? `Generated ${fmtDate(report.generated_on)}` : undefined} onBack={() => router.back()} />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading || !report ? (
        <Loading />
      ) : (
        <>
          <Button title="Share PDF report" icon="share-outline" onPress={sharePdf} loading={sharing} />
          <Text style={styles.hint}>The PDF includes the growth chart, z-score table, nutrition average, KPSP and immunization status — handy for Posyandu or doctor visits.</Text>

          <SectionTitle title="Growth" />
          {latest && report.status ? (
            <Card>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.cardTitle}>Latest · {fmtDate(latest.date)}</Text>
                <Pill tone={statusTone(report.status.stunting)}>{report.status.stunting}</Pill>
              </Row>
              <Line label="Weight" value={`${latest.weight_kg} kg`} z={latest.wfa_zscore} status={report.status.weight} />
              <Line label="Height" value={`${latest.height_cm} cm`} z={latest.lhfa_zscore} status={report.status.stunting} />
              <Line label="Weight-for-height" value="" z={latest.wfh_zscore} status={report.status.wasting ?? "—"} />
              <Line label="BMI" value={latest.bmi.toFixed(1)} z={latest.bfa_zscore} status={report.status.bmi ?? "—"} />
              {change ? (
                <Text style={styles.meta}>
                  Since first measurement ({change.days} days): {change.weight_kg >= 0 ? "+" : ""}{change.weight_kg.toFixed(1)} kg, {change.height_cm >= 0 ? "+" : ""}{change.height_cm.toFixed(1)} cm · {report.measurements.length} measurements
                </Text>
              ) : null}
            </Card>
          ) : (
            <Card>
              <Empty title="No measurements yet" body="Log weight and height to populate the report." />
            </Card>
          )}

          <SectionTitle title="Nutrition · last 7 days" />
          <Card>
            <Text style={styles.meta}>{report.nutrition_7d.days_logged} of 7 days logged{report.nutrition_7d.logged_today ? " · today included" : ""}</Text>
            {report.nutrition_7d.targets ? (
              <View style={{ marginTop: spacing.sm, gap: 6 }}>
                {(["energy", "protein", "carbs", "fat"] as const).map((k) => (
                  <Row key={k} style={{ justifyContent: "space-between" }}>
                    <Text style={styles.line}>{k === "energy" ? "Energy" : k[0].toUpperCase() + k.slice(1)}</Text>
                    <Text style={styles.meta}>
                      {Math.round(report.nutrition_7d.average[k])} / {Math.round(report.nutrition_7d.targets![k])} {k === "energy" ? "kcal" : "g"} ·{" "}
                      <Text style={{ fontWeight: "800", color: colors.text }}>{Math.round(report.nutrition_7d.fulfillment_percent?.[k] ?? 0)}%</Text>
                    </Text>
                  </Row>
                ))}
              </View>
            ) : (
              <Text style={[styles.meta, { marginTop: 6 }]}>No AKG bracket for this age yet.</Text>
            )}
          </Card>

          <SectionTitle title="Development & immunization" />
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.line}>KPSP {report.milestones.age_label ? `· ${report.milestones.age_label}` : ""}</Text>
              {report.milestones.interpretation ? <Pill tone={statusTone(report.milestones.interpretation)} small>{report.milestones.interpretation}</Pill> : <Text style={styles.meta}>{report.milestones.answered}/{report.milestones.total} answered</Text>}
            </Row>
            <Row style={{ justifyContent: "space-between", marginTop: spacing.sm }}>
              <Text style={styles.line}>Immunization</Text>
              <Text style={styles.meta}>
                {report.immunization.given}/{report.immunization.total} given{report.immunization.overdue > 0 ? ` · ${report.immunization.overdue} overdue` : ""}
              </Text>
            </Row>
            {report.immunization.overdue_names.length > 0 ? <Text style={[styles.meta, { marginTop: 4, color: colors.bad }]}>Overdue: {report.immunization.overdue_names.join(", ")}</Text> : null}
          </Card>

          {report.alerts.length > 0 ? (
            <>
              <SectionTitle title={`Alerts · ${report.alerts.length}`} action="Open" onAction={() => router.push("/alerts")} />
              <Card style={{ gap: 6 }}>
                {report.alerts.map((a) => (
                  <Text key={a.id} style={styles.line}>
                    • {a.title}
                  </Text>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Line({ label, value, z, status }: { label: string; value: string; z: number | null; status: string }) {
  return (
    <Row style={styles.row}>
      <Text style={[styles.line, { flex: 1 }]}>{label}</Text>
      {z === null ? (
        <Text style={styles.na}>Not computed</Text>
      ) : (
        <>
          {value ? <Text style={styles.value}>{value}</Text> : null}
          <Text style={[styles.z, { color: tones[zTone(z)].fg }]}>{fmtZ(z)}</Text>
          <Pill tone={statusTone(status)} small>{status}</Pill>
        </>
      )}
    </Row>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, color: colors.muted, lineHeight: 17, marginTop: spacing.sm, marginBottom: spacing.xs },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: spacing.sm },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  line: { fontSize: 13, fontWeight: "700", color: colors.text },
  value: { fontSize: 13, fontWeight: "700", color: colors.text },
  z: { fontSize: 12, fontWeight: "800", width: 48, textAlign: "right" },
  na: { fontSize: 12, color: colors.muted },
});
