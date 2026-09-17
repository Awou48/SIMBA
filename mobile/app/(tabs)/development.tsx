import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api, errorMessage, type MilestoneChecklist, type MilestoneItem } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Bounce, Card, Empty, ErrorBox, Hard, Icon, Loading, Progress, Row, Screen, SectionTitle, VerdictCard, YellowBar } from "../../src/components/ui";
import { DOMAIN_ICON, DOMAIN_LABEL, kpspVerdict } from "../../src/lib/friendly";
import { colors, font, INK_BORDER, spacing } from "../../src/lib/theme";

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
        setError(errorMessage(err, "Daftar pertanyaan belum bisa dimuat."));
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
  const name = active?.name ?? "si kecil";

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)}>
      <YellowBar title="Perkembangan" subtitle="Jawab satu per satu, sambil bermain" />
      <View style={styles.body}>
        <ChildSwitcher />
        <ErrorBox message={error} onRetry={() => load()} />
        {loading ? (
          <Loading />
        ) : !data || data.items.length === 0 ? (
          <Card>
            <Empty icon="extension-puzzle-outline" title="Belum ada pertanyaan untuk usia ini" body="Pertanyaan perkembangan mulai usia 3 bulan dan berubah sesuai usia. Coba lagi nanti." />
          </Card>
        ) : (
          <>
            <Card>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.progressLabel}>Usia {data.age_label ?? `${data.age_in_months} bulan`}</Text>
                <Text style={styles.progressPct}>
                  {data.answered} dari {data.total} dijawab
                </Text>
              </Row>
              <Progress value={(data.answered / data.total) * 100} color={colors.violet} />
            </Card>

            {verdict && data.answered === data.total ? <VerdictCard {...verdict} /> : null}

            {next && !reviewAll ? (
              <Card tone="violet" pad={spacing.lg}>
                <Row>
                  <Icon name={DOMAIN_ICON[next.domain] ?? "extension-puzzle-outline"} size={20} color="#5A43D6" />
                  <Text style={styles.qDomain}>{(DOMAIN_LABEL[next.domain] ?? next.domain).toUpperCase()}</Text>
                </Row>
                <Text style={styles.qText}>Apakah {name} bisa {lowerFirst(next.question)}</Text>
                {next.expected ? <Text style={styles.qHint}>{next.expected}</Text> : null}
                <Row style={{ gap: spacing.md, marginTop: spacing.sm, alignItems: "stretch" }}>
                  <Choice icon="checkmark" label="Ya, bisa" bg={colors.greenSoft} fg={colors.green} busy={savingId === next.id} onPress={() => answer(next, true)} />
                  <Choice icon="time-outline" label="Belum" bg={colors.yellowSoft} fg="#7A5A00" busy={savingId === next.id} onPress={() => answer(next, false)} />
                </Row>
              </Card>
            ) : null}

            {data.answered > 0 || reviewAll ? (
              <Bounce onPress={() => setReviewAll((s) => !s)} style={styles.toggle} haptic={false}>
                <Text style={styles.toggleText}>{reviewAll ? "Kembali ke satu per satu" : "Lihat semua pertanyaan"}</Text>
                <Icon name={reviewAll ? "chevron-up" : "chevron-down"} size={18} color={colors.coral} />
              </Bounce>
            ) : null}

            {reviewAll || !next
              ? domains.map((domain) => (
                  <View key={domain}>
                    <SectionTitle title={DOMAIN_LABEL[domain] ?? domain} />
                    {data.items
                      .filter((i) => i.domain === domain)
                      .map((item) => (
                        <Card key={item.id} pad={spacing.md}>
                          <Text style={styles.listQ}>{item.question}</Text>
                          <Row style={{ gap: spacing.sm }}>
                            <Small label="Ya, bisa" on={item.achieved === true} fg={colors.green} bg={colors.greenSoft} busy={savingId === item.id} onPress={() => answer(item, true)} />
                            <Small label="Belum" on={item.achieved === false} fg="#7A5A00" bg={colors.yellowSoft} busy={savingId === item.id} onPress={() => answer(item, false)} />
                          </Row>
                        </Card>
                      ))}
                  </View>
                ))
              : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function lowerFirst(s: string) {
  const t = s.trim().replace(/\?$/, "");
  return `${t.charAt(0).toLowerCase()}${t.slice(1)}?`;
}

function Choice({ icon, label, bg, fg, busy, onPress }: { icon: string; label: string; bg: string; fg: string; busy: boolean; onPress: () => void }) {
  return (
    <Bounce onPress={onPress} disabled={busy} style={{ flex: 1, opacity: busy ? 0.6 : 1 }} scale={0.93}>
      <Hard r={20} bg={bg}>
        <View style={styles.choice}>
          <Icon name={icon} size={36} color={fg} />
          <Text style={[styles.choiceText, { color: fg }]}>{label}</Text>
        </View>
      </Hard>
    </Bounce>
  );
}

function Small({ label, on, bg, fg, busy, onPress }: { label: string; on: boolean; bg: string; fg: string; busy: boolean; onPress: () => void }) {
  return (
    <Bounce onPress={onPress} disabled={busy} style={[styles.small, { backgroundColor: on ? fg : bg }, busy && { opacity: 0.6 }]}>
      <Text style={[styles.smallText, { color: on ? colors.white : fg }]}>{label}</Text>
    </Bounce>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  progressLabel: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  progressPct: { fontFamily: font.extra, fontSize: 14, color: "#5A43D6" },
  qDomain: { fontFamily: font.extra, fontSize: 13, color: "#5A43D6", letterSpacing: 0.5 },
  qText: { fontFamily: font.display, fontSize: 24, color: colors.ink, lineHeight: 30, marginTop: 4 },
  qHint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, lineHeight: 20 },
  choice: { alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 20 },
  choiceText: { fontFamily: font.display, fontSize: 19 },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: spacing.sm },
  toggleText: { fontFamily: font.extra, fontSize: 14, color: colors.coral },
  listQ: { fontFamily: font.extra, fontSize: 15, color: colors.ink, lineHeight: 21 },
  small: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 999, borderWidth: INK_BORDER, borderColor: colors.ink },
  smallText: { fontFamily: font.extra, fontSize: 14 },
});
