import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, ApiError, errorMessage, session, type GrowthReport } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Button, Card, Empty, ErrorBox, Header, Loading, Pill, Row, Screen, SectionTitle } from "../src/components/ui";
import { fmtDate, statusTone } from "../src/lib/format";
import { growthVerdict, immunizationVerdict, kpspVerdict, zPlain } from "../src/lib/friendly";
import { colors, font, spacing } from "../src/lib/theme";

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
  const name = active?.name ?? "Your child";
  const growth = report ? growthVerdict(name, report.status?.stunting, report.status?.weight, report.status?.wasting) : null;
  const kpsp = report ? kpspVerdict(report.milestones.interpretation, report.milestones.answered, report.milestones.total) : null;
  const immun = report ? immunizationVerdict(report.immunization.overdue, report.immunization.due, report.immunization.next_dose?.name ?? null) : null;
  const n7 = report?.nutrition_7d;

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Growth report" emoji="📄" subtitle={report ? `Updated ${fmtDate(report.generated_on)}` : undefined} onBack={() => router.back()} />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading || !report ? (
        <Loading />
      ) : (
        <>
          <Card tone="lavender">
            <Text style={styles.shareTitle}>Bring this to your next visit 🩺</Text>
            <Text style={styles.shareBody}>The PDF has the growth chart, measurements, food summary, milestones and vaccines — everything a doctor or Posyandu cadre needs.</Text>
            <Button title="Share PDF" icon="share-outline" onPress={sharePdf} loading={sharing} style={{ marginTop: spacing.md }} />
          </Card>

          <SectionTitle title="Growth" emoji="📏" />
          {latest && growth ? (
            <Card>
              <Row style={{ gap: spacing.md }}>
                <Text style={{ fontSize: 34 }}>{growth.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.headline}>{growth.headline}</Text>
                  <Text style={styles.meta}>Measured {fmtDate(latest.date)}</Text>
                </View>
              </Row>
              <Line label="Weight" value={`${latest.weight_kg} kg`} plain={zPlain(latest.wfa_zscore)} status={report.status?.weight ?? null} />
              <Line label="Height" value={`${latest.height_cm} cm`} plain={zPlain(latest.lhfa_zscore)} status={report.status?.stunting ?? null} />
              {latest.wfh_zscore !== null ? <Line label="Weight for height" value="" plain={zPlain(latest.wfh_zscore)} status={report.status?.wasting ?? null} /> : null}
              {report.change_since_first ? (
                <Text style={[styles.meta, { marginTop: spacing.sm }]}>
                  Since the first measurement ({report.change_since_first.days} days ago): {report.change_since_first.weight_kg >= 0 ? "+" : ""}
                  {report.change_since_first.weight_kg.toFixed(1)} kg and {report.change_since_first.height_cm >= 0 ? "+" : ""}
                  {report.change_since_first.height_cm.toFixed(1)} cm.
                </Text>
              ) : null}
            </Card>
          ) : (
            <Card>
              <Empty emoji="📏" title="No measurements yet" body="Add weight and height to fill in this section." />
            </Card>
          )}

          <SectionTitle title="Food this week" emoji="🍽️" />
          <Card>
            <Text style={styles.meta}>
              Logged on {n7?.days_logged ?? 0} of the last 7 days
            </Text>
            {n7?.targets ? (
              <View style={{ marginTop: spacing.sm, gap: 8 }}>
                {(["energy", "protein", "carbs", "fat"] as const).map((k) => (
                  <Row key={k} style={{ justifyContent: "space-between" }}>
                    <Text style={styles.line}>{k === "energy" ? "🔥 Energy" : k === "protein" ? "🥚 Protein" : k === "carbs" ? "🍚 Carbs" : "🥑 Fat"}</Text>
                    <Text style={styles.meta}>
                      <Text style={{ fontFamily: font.black, color: colors.text }}>{Math.round(n7.fulfillment_percent?.[k] ?? 0)}%</Text> of daily need
                    </Text>
                  </Row>
                ))}
              </View>
            ) : (
              <Text style={[styles.meta, { marginTop: 6 }]}>No daily targets for this age yet.</Text>
            )}
          </Card>

          <SectionTitle title="Milestones & vaccines" emoji="🌈" />
          <Card>
            {kpsp ? (
              <Row style={styles.mini}>
                <Text style={{ fontSize: 24 }}>{kpsp.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.line}>{kpsp.headline}</Text>
                  <Text style={styles.meta}>
                    {report.milestones.achieved} of {report.milestones.total} skills{report.milestones.age_label ? ` · ${report.milestones.age_label}` : ""}
                  </Text>
                </View>
              </Row>
            ) : null}
            {immun ? (
              <Row style={[styles.mini, { borderTopWidth: 1, borderTopColor: colors.line }]}>
                <Text style={{ fontSize: 24 }}>{immun.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.line}>{immun.headline}</Text>
                  <Text style={styles.meta}>
                    {report.immunization.given} of {report.immunization.total} doses done
                  </Text>
                </View>
              </Row>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Line({ label, value, plain, status }: { label: string; value: string; plain: string; status: string | null }) {
  return (
    <Row style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.line}>
          {label}
          {value ? ` · ${value}` : ""}
        </Text>
        <Text style={styles.meta}>{plain}</Text>
      </View>
      <Pill tone={statusTone(status)} small>
        {status ?? "—"}
      </Pill>
    </Row>
  );
}

const styles = StyleSheet.create({
  shareTitle: { fontFamily: font.black, fontSize: 17, color: colors.text },
  shareBody: { fontFamily: font.regular, fontSize: 13, color: colors.text, opacity: 0.8, marginTop: 4, lineHeight: 19 },
  headline: { fontFamily: font.extra, fontSize: 15, color: colors.text, lineHeight: 20 },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, marginTop: 4 },
  line: { fontFamily: font.extra, fontSize: 14, color: colors.text },
  mini: { paddingVertical: 8, gap: spacing.md },
});
