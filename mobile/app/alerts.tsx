import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { api, errorMessage, type AlertItem } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Card, Empty, ErrorBox, Icon, Loading, Pill, Row, Screen, YellowBar } from "../src/components/ui";
import { fmtDate } from "../src/lib/format";
import { CATEGORY_ICON, SEVERITY_LABEL } from "../src/lib/friendly";
import { colors, font, INK_BORDER, spacing, tones, type Tone } from "../src/lib/theme";

const SEVERITY: Record<AlertItem["severity"], Tone> = { high: "bad", medium: "warn", low: "teal" };
const ROUTE: Record<AlertItem["category"], Href> = { Growth: "/(tabs)/growth", Nutrition: "/(tabs)/nutrition", Development: "/(tabs)/development", Immunization: "/immunization" };

export default function Alerts() {
  const { active } = useChildren();
  const router = useRouter();
  const [rows, setRows] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (soft = false) => {
      if (!active) return;
      soft ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        setRows(await api.alerts(active.id));
      } catch (err) {
        setError(errorMessage(err, "Pengingat belum bisa dimuat."));
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

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)}>
      <YellowBar title="Pengingat" subtitle="Hal kecil yang perlu diperhatikan" onBack={() => router.back()} />
      <View style={styles.body}>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={() => load()} />
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Card>
            <Empty icon="happy-outline" title="Semua aman!" body="Tidak ada yang perlu diperhatikan saat ini. Lanjutkan mencatat makan dan pengukuran." />
          </Card>
        ) : (
          rows.map((a) => (
            <Card key={a.id} onPress={() => router.push(ROUTE[a.category])}>
              <Row style={{ gap: spacing.md, alignItems: "flex-start" }}>
                <View style={[styles.icon, { backgroundColor: tones[SEVERITY[a.severity]].bg }]}>
                  <Icon name={CATEGORY_ICON[a.category]} size={24} color={tones[SEVERITY[a.severity]].fg} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Row>
                    <Pill tone={SEVERITY[a.severity]}>{SEVERITY_LABEL[a.severity]}</Pill>
                    <Text style={styles.meta}>{fmtDate(a.date)}</Text>
                  </Row>
                  <Text style={styles.title}>{a.title}</Text>
                  <Text style={styles.text}>{a.description}</Text>
                </View>
              </Row>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  icon: { width: 48, height: 48, borderRadius: 14, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.extra, fontSize: 16, color: colors.ink },
  text: { fontFamily: font.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
});
