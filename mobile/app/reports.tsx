import { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, ApiError, errorMessage, session, type GrowthReport } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Button, Card, Empty, ErrorBox, Icon, Loading, Pill, Row, Screen, SectionTitle, YellowBar } from "../src/components/ui";
import { fmtDate, num, statusTone } from "../src/lib/format";
import { growthVerdict, immunizationVerdict, kpspVerdict, zPlain } from "../src/lib/friendly";
import { colors, font, spacing, tones } from "../src/lib/theme";

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
        setError(errorMessage(err, "Laporan belum bisa dibuat."));
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
      if (!res.ok) throw new ApiError(res.status, `PDF belum bisa dibuat (${res.status}).`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const filename = `SIMBA-${active.name.replace(/\s+/g, "_")}-${report?.generated_on?.slice(0, 10) ?? "laporan"}.pdf`;
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        window.open(url, "_blank");
        return;
      }
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(bytes);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: "Bagikan laporan" });
      else setError("Fitur berbagi tidak tersedia di perangkat ini.");
    } catch (err) {
      setError(errorMessage(err, "PDF belum bisa dibagikan."));
    } finally {
      setSharing(false);
    }
  };

  const latest = report?.latest;
  const name = active?.name ?? "Si kecil";
  const growth = report ? growthVerdict(name, report.status?.stunting, report.status?.weight, report.status?.wasting) : null;
  const kpsp = report ? kpspVerdict(report.milestones.interpretation, report.milestones.answered, report.milestones.total) : null;
  const immun = report ? immunizationVerdict(report.immunization.overdue, report.immunization.due, report.immunization.next_dose?.name ?? null) : null;
  const n7 = report?.nutrition_7d;

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)}>
      <YellowBar title="Laporan" subtitle={report ? `Diperbarui ${fmtDate(report.generated_on)}` : undefined} onBack={() => router.back()} />
      <View style={styles.body}>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={() => load()} />
        {loading || !report ? (
          <Loading />
        ) : (
          <>
            <Card tone="violet">
              <Text style={styles.shareTitle}>Bawa saat ke Posyandu atau dokter</Text>
              <Text style={styles.shareBody}>PDF berisi grafik pertumbuhan, catatan makan, perkembangan, dan imunisasi {name}.</Text>
              <Button title="Bagikan PDF" icon="share-outline" variant="ink" onPress={sharePdf} loading={sharing} style={{ marginTop: spacing.sm }} />
            </Card>

            <SectionTitle title="Pertumbuhan" />
            {latest && growth ? (
              <Card>
                <Row style={{ gap: spacing.md }}>
                  <Icon name={growth.icon} size={30} color={tones[growth.tone].fg} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.headline}>{growth.headline}</Text>
                    <Text style={styles.meta}>Diukur {fmtDate(latest.date)}</Text>
                  </View>
                </Row>
                <Line label={`Berat · ${num(latest.weight_kg)} kg`} plain={zPlain(latest.wfa_zscore)} status={report.status?.weight ?? null} />
                <Line label={`Tinggi · ${num(latest.height_cm)} cm`} plain={zPlain(latest.lhfa_zscore)} status={report.status?.stunting ?? null} />
                {report.change_since_first ? (
                  <Text style={[styles.meta, { marginTop: spacing.sm }]}>
                    Sejak pengukuran pertama ({report.change_since_first.days} hari lalu): {report.change_since_first.weight_kg >= 0 ? "naik" : "turun"} {num(Math.abs(report.change_since_first.weight_kg))} kg dan {report.change_since_first.height_cm >= 0 ? "naik" : "turun"} {num(Math.abs(report.change_since_first.height_cm))} cm.
                  </Text>
                ) : null}
              </Card>
            ) : (
              <Card>
                <Empty icon="resize-outline" title="Belum ada pengukuran" body="Ukur berat dan tinggi untuk mengisi bagian ini." />
              </Card>
            )}

            <SectionTitle title="Makan minggu ini" />
            <Card>
              <Text style={styles.meta}>Tercatat {n7?.days_logged ?? 0} dari 7 hari</Text>
              {n7?.targets ? (
                <View style={{ gap: 8, marginTop: spacing.xs }}>
                  {(["energy", "protein"] as const).map((k) => (
                    <Row key={k} style={{ justifyContent: "space-between" }}>
                      <Text style={styles.line}>{k === "energy" ? "Energi" : "Protein"}</Text>
                      <Text style={styles.meta}>
                        <Text style={{ fontFamily: font.display, color: colors.ink, fontSize: 15 }}>{Math.round(n7.fulfillment_percent?.[k] ?? 0)}%</Text> dari kebutuhan
                      </Text>
                    </Row>
                  ))}
                </View>
              ) : (
                <Text style={styles.meta}>Belum ada target harian untuk usia ini.</Text>
              )}
            </Card>

            <SectionTitle title="Perkembangan & imunisasi" />
            <Card>
              {kpsp ? (
                <Row style={styles.mini}>
                  <Icon name={kpsp.icon} size={26} color={tones[kpsp.tone].fg} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.line}>{kpsp.headline}</Text>
                    <Text style={styles.meta}>
                      {report.milestones.achieved} dari {report.milestones.total} kemampuan{report.milestones.age_label ? ` · usia ${report.milestones.age_label}` : ""}
                    </Text>
                  </View>
                </Row>
              ) : null}
              {immun ? (
                <Row style={[styles.mini, styles.divider]}>
                  <Icon name={immun.icon} size={26} color={tones[immun.tone].fg} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.line}>{immun.headline}</Text>
                    <Text style={styles.meta}>
                      {report.immunization.given} dari {report.immunization.total} dosis selesai
                    </Text>
                  </View>
                </Row>
              ) : null}
            </Card>
          </>
        )}
      </View>
    </Screen>
  );
}

function Line({ label, plain, status }: { label: string; plain: string; status: string | null }) {
  return (
    <Row style={[styles.row, styles.divider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.line}>{label}</Text>
        <Text style={styles.meta}>{plain}</Text>
      </View>
      <Pill tone={statusTone(status)}>{status ?? "—"}</Pill>
    </Row>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  shareTitle: { fontFamily: font.display, fontSize: 20, color: colors.ink },
  shareBody: { fontFamily: font.regular, fontSize: 14, color: colors.ink, opacity: 0.85, lineHeight: 20 },
  headline: { fontFamily: font.extra, fontSize: 16, color: colors.ink, lineHeight: 21 },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  row: { paddingVertical: 10, gap: spacing.sm },
  divider: { borderTopWidth: 2, borderStyle: "dashed", borderColor: colors.track },
  line: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  mini: { paddingVertical: 8, gap: spacing.md },
});
