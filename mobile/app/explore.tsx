import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { api, errorMessage, type ArticleView } from "../src/lib/api";
import { Bounce, Card, Empty, ErrorBox, Hard, Icon, Loading, Pill, Row, Screen, YellowBar } from "../src/components/ui";
import { CATEGORY_ICON, CATEGORY_LABEL } from "../src/lib/friendly";
import { colors, font, INK_BORDER, spacing, type Tone } from "../src/lib/theme";

const CATEGORIES = ["All", "Growth", "Nutrition", "Development", "Immunization"];
const TONE: Record<string, Tone> = { Growth: "coral", Nutrition: "teal", Development: "violet", Immunization: "yellow" };

export default function Explore() {
  const router = useRouter();
  const [rows, setRows] = useState<ArticleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .listArticles()
      .then(setRows)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => rows.filter((a) => (category === "All" || a.category === category) && (!q.trim() || `${a.title} ${a.summary}`.toLowerCase().includes(q.trim().toLowerCase()))), [rows, category, q]);

  return (
    <Screen padded={false}>
      <YellowBar title="Tips & artikel" subtitle="Bacaan singkat dari tim kesehatan SIMBA" onBack={() => router.back()} />
      <View style={styles.body}>
        <Hard r={999} offset={3} style={{ marginBottom: spacing.md }}>
          <Row style={styles.search}>
            <Icon name="search" size={22} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Cari…" placeholderTextColor="#B9AE9E" style={styles.searchInput} />
          </Row>
        </Hard>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CATEGORIES.map((c) => (
            <Bounce key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
              <Text style={[styles.chipText, category === c && { color: colors.yellow }]}>{c === "All" ? "Semua" : CATEGORY_LABEL[c]}</Text>
            </Bounce>
          ))}
        </ScrollView>
        <ErrorBox message={error} />
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Card>
            <Empty icon="book-outline" title="Belum ada artikel" body="Coba topik lain atau kosongkan pencarian." />
          </Card>
        ) : (
          filtered.map((a) => (
            <Card key={a.id} onPress={() => router.push(`/article/${a.id}`)}>
              <Row>
                <Pill tone={TONE[a.category] ?? "muted"}>{CATEGORY_LABEL[a.category] ?? a.category}</Pill>
                <Text style={styles.meta}>{a.read_time_min} menit baca</Text>
              </Row>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.summary} numberOfLines={2}>
                {a.summary}
              </Text>
              <Row style={{ gap: 4 }}>
                <Icon name={CATEGORY_ICON[a.category] ?? "book-outline"} size={16} color={colors.coral} />
                <Text style={styles.read}>Baca ›</Text>
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
  search: { gap: 10, paddingHorizontal: 16, minHeight: 54 },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, fontFamily: font.bold, paddingVertical: 12 },
  chips: { gap: 8, paddingBottom: spacing.md },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.white, borderWidth: INK_BORDER, borderColor: colors.ink },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontSize: 14, fontFamily: font.extra, color: colors.ink },
  title: { fontSize: 18, fontFamily: font.display, color: colors.ink, lineHeight: 24 },
  summary: { fontSize: 14, fontFamily: font.regular, color: colors.muted, lineHeight: 20 },
  read: { fontSize: 14, fontFamily: font.extra, color: colors.coral },
  meta: { fontSize: 13, fontFamily: font.regular, color: colors.muted },
});
