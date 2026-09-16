import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type MilestoneChecklist, type MilestoneItem } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Bounce, Card, Empty, ErrorBox, Header, Loading, Progress, Row, Screen, SectionTitle, VerdictCard } from "../../src/components/ui";
import { DOMAIN_EMOJI, kpspVerdict } from "../../src/lib/friendly";
import { colors, font, radius, spacing } from "../../src/lib/theme";

export default function Development() {
  const { active } = useChildren();
  const [data, setData] = useState<MilestoneChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [reviewAll, setReviewAll] = useState(false);

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

  const next = useMemo(() => data?.items.find((i) => i.achieved === null) ?? null, [data]);
  const verdict = data ? kpspVerdict(data.interpretation, data.answered, data.total) : null;
  const domains = data ? Array.from(new Set(data.items.map((i) => i.domain))) : [];

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Milestones" emoji="🧩" subtitle="Little skills that show development is on track" />
      <ChildSwitcher />
      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : !data || data.items.length === 0 ? (
        <Card>
          <Empty emoji="🧸" title="Nothing to check right now" body="Milestone questions start at 3 months and change with age. Come back a little later." />
        </Card>
      ) : (
        <>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.progressLabel}>
                {data.age_label ?? `${data.age_in_months} months`} · {data.answered} of {data.total} answered
              </Text>
              <Text style={styles.progressPct}>{Math.round((data.answered / data.total) * 100)}%</Text>
            </Row>
            <View style={{ marginTop: 8 }}>
              <Progress value={(data.answered / data.total) * 100} color={colors.lavender} />
            </View>
          </Card>

          {verdict && data.answered === data.total ? <VerdictCard {...verdict} /> : null}

          {next && !reviewAll ? (
            <Card style={styles.question}>
              <Text style={styles.qDomain}>
                {DOMAIN_EMOJI[next.domain] ?? "🧩"} {next.domain}
              </Text>
              <Text style={styles.qText}>Can {active?.name} {lowerFirst(next.question)}</Text>
              {next.expected ? <Text style={styles.qHint}>{next.expected}</Text> : null}
              <Row style={{ gap: spacing.md, marginTop: spacing.lg }}>
                <Choice emoji="✅" label="Yes!" bg={colors.greenSoft} fg="#2E9F6A" busy={savingId === next.id} onPress={() => answer(next, true)} />
                <Choice emoji="🕒" label="Not yet" bg={colors.yellowSoft} fg="#C98F00" busy={savingId === next.id} onPress={() => answer(next, false)} />
              </Row>
            </Card>
          ) : null}

          <Bounce onPress={() => setReviewAll((s) => !s)} style={styles.toggle} haptic={false}>
            <Text style={styles.toggleText}>{reviewAll ? "Back to one at a time" : "See all questions"}</Text>
            <Ionicons name={reviewAll ? "chevron-up" : "chevron-down"} size={18} color={colors.orange} />
          </Bounce>

          {reviewAll || !next
            ? domains.map((domain) => (
                <View key={domain}>
                  <SectionTitle title={domain} emoji={DOMAIN_EMOJI[domain] ?? "🧩"} />
                  {data.items
                    .filter((i) => i.domain === domain)
                    .map((item) => (
                      <Card key={item.id} style={{ padding: spacing.md }}>
                        <Text style={styles.listQ}>{item.question}</Text>
                        <Row style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                          <Small label="Yes" on={item.achieved === true} bg={colors.greenSoft} fg="#2E9F6A" busy={savingId === item.id} onPress={() => answer(item, true)} />
                          <Small label="Not yet" on={item.achieved === false} bg={colors.yellowSoft} fg="#C98F00" busy={savingId === item.id} onPress={() => answer(item, false)} />
                        </Row>
                      </Card>
                    ))}
                </View>
              ))
            : null}
        </>
      )}
    </Screen>
  );
}

function lowerFirst(s: string) {
  const t = s.trim().replace(/\?$/, "");
  return `${t.charAt(0).toLowerCase()}${t.slice(1)}?`;
}

function Choice({ emoji, label, bg, fg, busy, onPress }: { emoji: string; label: string; bg: string; fg: string; busy: boolean; onPress: () => void }) {
  return (
    <Bounce onPress={onPress} disabled={busy} style={[styles.choice, { backgroundColor: bg, opacity: busy ? 0.6 : 1 }]} scale={0.93}>
      <Text style={{ fontSize: 30 }}>{emoji}</Text>
      <Text style={[styles.choiceText, { color: fg }]}>{label}</Text>
    </Bounce>
  );
}

function Small({ label, on, bg, fg, busy, onPress }: { label: string; on: boolean; bg: string; fg: string; busy: boolean; onPress: () => void }) {
  return (
    <Bounce onPress={onPress} disabled={busy} style={[styles.small, on ? { backgroundColor: fg } : { backgroundColor: bg }, busy && { opacity: 0.6 }]}>
      <Text style={[styles.smallText, { color: on ? colors.white : fg }]}>{label}</Text>
    </Bounce>
  );
}

const styles = StyleSheet.create({
  progressLabel: { fontFamily: font.extra, fontSize: 13, color: colors.text },
  progressPct: { fontFamily: font.black, fontSize: 13, color: colors.lavender },
  question: { backgroundColor: colors.lavenderSoft },
  qDomain: { fontFamily: font.extra, fontSize: 12, color: "#6F5CE0", textTransform: "uppercase", letterSpacing: 0.5 },
  qText: { fontFamily: font.black, fontSize: 20, color: colors.text, marginTop: 8, lineHeight: 27 },
  qHint: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
  choice: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 18, borderRadius: radius.lg },
  choiceText: { fontFamily: font.black, fontSize: 16 },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.sm },
  toggleText: { fontFamily: font.extra, fontSize: 13, color: colors.orange },
  listQ: { fontFamily: font.extra, fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.pill },
  smallText: { fontFamily: font.extra, fontSize: 13 },
});
