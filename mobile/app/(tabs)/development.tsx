import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type MilestoneChecklist, type MilestoneItem } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Card, Empty, ErrorBox, Header, Loading, Pill, Progress, Row, Screen, SectionTitle } from "../../src/components/ui";
import { statusTone } from "../../src/lib/format";
import { colors, radius, spacing, tones } from "../../src/lib/theme";

export default function Development() {
  const { active } = useChildren();
  const [data, setData] = useState<MilestoneChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(
    async (soft = false) => {
      if (!active) return;
      soft ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        setData(await api.milestones(active.id));
      } catch (err) {
        setError(errorMessage(err, "Could not load the checklist."));
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

  const answer = async (item: MilestoneItem, achieved: boolean) => {
    if (!active) return;
    setSavingId(item.id);
    try {
      setData(await api.answerMilestone(active.id, item.id, achieved));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const domains = data ? Array.from(new Set(data.items.map((i) => i.domain))) : [];

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Development" subtitle="KPSP screening · Kemenkes" />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <Empty title="No checklist for this age" body="KPSP questions cover 3–72 months. Come back at the next bracket." />
        </Card>
      ) : (
        <>
          <Card style={{ backgroundColor: colors.navy, borderColor: "transparent" }}>
            <Text style={styles.heroLabel}>{data.age_label ?? `${data.age_in_months} months`} · {data.answered}/{data.total} answered</Text>
            <Text style={styles.heroValue}>{data.achieved} of {data.total} achieved</Text>
            {data.interpretation ? (
              <View style={{ marginTop: spacing.sm }}>
                <Pill tone={statusTone(data.interpretation)}>{data.interpretation}</Pill>
              </View>
            ) : null}
            <View style={{ marginTop: spacing.sm }}>
              <Progress value={data.total ? (data.achieved / data.total) * 100 : 0} tone="teal" />
            </View>
            <Text style={styles.heroHint}>
              {data.answered < data.total
                ? `Answer all ${data.total} questions to get the interpretation.`
                : data.interpretation?.startsWith("Sesuai")
                  ? "Development is appropriate for age. Re-screen at the next bracket."
                  : data.interpretation?.startsWith("Meragukan")
                    ? "Doubtful (7–8 yes). Stimulate the missed skills and re-screen in 2 weeks."
                    : "Possible deviation (≤6 yes). Please consult a health worker."}
            </Text>
          </Card>

          {domains.map((domain) => (
            <View key={domain}>
              <SectionTitle title={domain} />
              {data.items
                .filter((i) => i.domain === domain)
                .map((item) => (
                  <Card key={item.id} style={{ padding: spacing.md }}>
                    <Text style={styles.question}>{item.question}</Text>
                    {item.expected ? <Text style={styles.expected}>{item.expected}</Text> : null}
                    <Row style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                      <Choice label="Yes" on={item.achieved === true} tone="good" icon="checkmark" busy={savingId === item.id} onPress={() => answer(item, true)} />
                      <Choice label="Not yet" on={item.achieved === false} tone="warn" icon="close" busy={savingId === item.id} onPress={() => answer(item, false)} />
                    </Row>
                  </Card>
                ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

function Choice({ label, on, tone, icon, busy, onPress }: { label: string; on: boolean; tone: "good" | "warn"; icon: keyof typeof Ionicons.glyphMap; busy: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={busy} style={[styles.choice, on && { backgroundColor: tones[tone].fg, borderColor: tones[tone].fg }, busy && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={16} color={on ? colors.white : tones[tone].fg} />
      <Text style={[styles.choiceText, { color: on ? colors.white : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "700" },
  heroValue: { color: colors.white, fontSize: 22, fontWeight: "800", marginTop: 6 },
  heroHint: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: spacing.sm, lineHeight: 17 },
  question: { fontSize: 14, fontWeight: "700", color: colors.text, lineHeight: 20 },
  expected: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 17 },
  choice: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  choiceText: { fontSize: 13, fontWeight: "700" },
});
