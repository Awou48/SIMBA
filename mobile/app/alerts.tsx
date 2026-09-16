import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type AlertItem } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Card, Empty, ErrorBox, Header, Loading, Pill, Screen } from "../src/components/ui";
import { fmtDate } from "../src/lib/format";
import { CATEGORY_EMOJI } from "../src/lib/friendly";
import { colors, font, spacing, tones, type Tone } from "../src/lib/theme";

const SEVERITY: Record<AlertItem["severity"], Tone> = { high: "bad", medium: "warn", low: "teal" };
const SEVERITY_LABEL: Record<AlertItem["severity"], string> = { high: "Important", medium: "Worth a look", low: "Tip" };
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
        setError(errorMessage(err, "Could not load alerts."));
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
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Reminders" emoji="🔔" subtitle="Small things that keep growth on track" onBack={() => router.back()} />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <Empty emoji="🎉" title="All clear!" body="Nothing needs your attention right now. Keep logging meals and measurements." />
        </Card>
      ) : (
        rows.map((a) => (
          <Card key={a.id} onPress={() => router.push(ROUTE[a.category])} style={styles.alert}>
            <View style={[styles.icon, { backgroundColor: tones[SEVERITY[a.severity]].bg }]}>
              <Text style={{ fontSize: 22 }}>{CATEGORY_EMOJI[a.category]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Pill tone={SEVERITY[a.severity]} small>{SEVERITY_LABEL[a.severity]}</Pill>
                <Text style={styles.meta}>{fmtDate(a.date)}</Text>
              </View>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.body}>{a.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.extra, fontSize: 15, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  meta: { fontFamily: font.regular, fontSize: 11, color: colors.muted },
});
