import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, errorMessage, type ArticleView } from "../../src/lib/api";
import { ErrorBox, Header, Loading, Pill, Screen } from "../../src/components/ui";
import { fmtDate } from "../../src/lib/format";
import { colors, spacing } from "../../src/lib/theme";

export default function Article() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.article(Number(id)).then(setArticle).catch((err) => setError(errorMessage(err, "Article not found.")));
  }, [id]);

  return (
    <Screen edges={["top", "bottom"]}>
      <Header title="" onBack={() => router.back()} />
      <ErrorBox message={error} />
      {!article && !error ? (
        <Loading />
      ) : article ? (
        <>
          <Pill tone="primary">{article.category}</Pill>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.meta}>{article.author} · {article.read_time_min} min read · {fmtDate(article.updated_at)}</Text>
          <Text style={styles.summary}>{article.summary}</Text>
          {(article.body ?? "")
            .split(/\n\s*\n/)
            .filter(Boolean)
            .map((p, i) => (
              <Text key={i} style={styles.para}>
                {p.trim()}
              </Text>
            ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: spacing.sm, lineHeight: 31 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 6 },
  summary: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: spacing.lg, lineHeight: 24 },
  para: { fontSize: 15, color: "#2c3150", marginTop: spacing.md, lineHeight: 24 },
});
