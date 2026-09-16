import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type ArticleView } from "../src/lib/api";
import { Bounce, Card, Empty, ErrorBox, Header, Loading, Pill, Screen } from "../src/components/ui";
import { CATEGORY_EMOJI } from "../src/lib/friendly";
import { colors, font, radius, spacing, type Tone } from "../src/lib/theme";

const CATEGORIES = ["All", "Growth", "Nutrition", "Development", "Immunization"];
const TONE: Record<string, Tone> = { Growth: "orange", Nutrition: "teal", Development: "lavender", Immunization: "yellow" };

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
    <Screen>
      <Header title="Tips & articles" emoji="📚" subtitle="Short reads from the SIMBA health team" onBack={() => router.back()} />
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search…" placeholderTextColor="#C4C9D6" style={styles.searchInput} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((c) => (
          <Bounce key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
            <Text style={[styles.chipText, category === c && { color: colors.white }]}>
              {c === "All" ? "✨" : CATEGORY_EMOJI[c]} {c}
            </Text>
          </Bounce>
        ))}
      </ScrollView>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Card>
          <Empty emoji="📭" title="Nothing here yet" body="Try another topic or clear the search." />
        </Card>
      ) : (
        filtered.map((a) => (
          <Card key={a.id} onPress={() => router.push(`/article/${a.id}`)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Pill tone={TONE[a.category] ?? "muted"} small>
                {CATEGORY_EMOJI[a.category]} {a.category}
              </Pill>
              <Text style={styles.meta}>{a.read_time_min} min read</Text>
            </View>
            <Text style={styles.title}>{a.title}</Text>
            <Text style={styles.summary} numberOfLines={2}>
              {a.summary}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, fontFamily: font.bold },
  chips: { gap: 8, paddingVertical: spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.orange },
  chipText: { fontSize: 13, fontFamily: font.extra, color: colors.text },
  title: { fontSize: 17, fontFamily: font.black, color: colors.text, lineHeight: 23 },
  summary: { fontSize: 13, fontFamily: font.regular, color: colors.muted, marginTop: 4, lineHeight: 18 },
  meta: { fontSize: 11, fontFamily: font.regular, color: colors.muted },
});
