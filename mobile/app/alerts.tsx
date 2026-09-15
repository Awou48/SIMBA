import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type AlertItem } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { ChildSwitcher } from "../src/components/ChildSwitcher";
import { Card, Empty, ErrorBox, Header, Loading, Pill, Screen } from "../src/components/ui";
import { fmtDate } from "../src/lib/format";
import { colors, spacing, tones, type Tone } from "../src/lib/theme";

const SEVERITY: Record<AlertItem["severity"], Tone> = { high: "bad", medium: "warn", low: "primary" };
const ICON: Record<AlertItem["category"], keyof typeof Ionicons.glyphMap> = { Growth: "trending-up", Nutrition: "restaurant", Development: "sparkles", Immunization: "shield-checkmark" };
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
      <Header title="Alerts" subtitle="Derived from measurements, meals, KPSP and the immunization schedule" onBack={() => router.back()} />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card>
          <Empty title="All clear 🎉" body="No growth, nutrition, development or immunization issues right now." />
        </Card>
      ) : (
        rows.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(ROUTE[a.category])}>
            <Card style={styles.alert}>
              <View style={[styles.icon, { backgroundColor: tones[SEVERITY[a.severity]].bg }]}>
                <Ionicons name={ICON[a.category]} size={20} color={tones[SEVERITY[a.severity]].fg} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Pill tone={SEVERITY[a.severity]} small>{a.severity}</Pill>
                  <Text style={styles.meta}>{a.category} · {fmtDate(a.date)}</Text>
                </View>
                <Text style={styles.title}>{a.title}</Text>
                <Text style={styles.body}>{a.description}</Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: "row", gap: spacing.md, padding: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "800", color: colors.text },
  body: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  meta: { fontSize: 11, color: colors.muted },
});
