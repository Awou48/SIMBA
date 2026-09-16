import { Alert, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "../../src/lib/api";
import { useAuth } from "../../src/state/auth";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Button, Card, Header, ListItem, Screen, SectionTitle } from "../../src/components/ui";
import { childEmoji } from "../../src/lib/friendly";
import { colors, font, spacing } from "../../src/lib/theme";

export default function More() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { children } = useChildren();

  const confirmSignOut = () =>
    Alert.alert("Sign out?", "You'll need your email and password to sign back in.", [
      { text: "Stay", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut().then(() => router.replace("/login")) },
    ]);

  return (
    <Screen>
      <Header title="More" emoji="✨" />
      <ChildSwitcher />

      <SectionTitle title="Health" />
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListItem emoji="💉" tone="yellow" title="Vaccines" subtitle="Schedule and doses given" onPress={() => router.push("/immunization")} />
        <ListItem emoji="🗓️" tone="teal" title="Calendar" subtitle="Doctor visits, Posyandu, reminders" onPress={() => router.push("/calendar")} />
        <ListItem emoji="🔔" tone="orange" title="Reminders" subtitle="Everything worth a look" onPress={() => router.push("/alerts")} />
        <ListItem emoji="📄" tone="lavender" title="Growth report" subtitle="Share a PDF with your doctor" onPress={() => router.push("/reports")} last />
      </Card>

      <SectionTitle title="Learn" />
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListItem emoji="📚" tone="pink" title="Tips & articles" subtitle="Food, growth, play and vaccines" onPress={() => router.push("/explore")} last />
      </Card>

      <SectionTitle title="Family" />
      <Card style={{ paddingVertical: spacing.xs }}>
        {children.map((c) => (
          <ListItem key={c.id} emoji={childEmoji(c.gender)} tone={c.gender === "female" ? "pink" : "teal"} title={c.name} subtitle={`Born ${c.birth_date}${c.region ? ` · ${c.region}` : ""}`} onPress={() => router.push(`/child/${c.id}`)} />
        ))}
        <ListItem emoji="➕" tone="muted" title="Add a child" onPress={() => router.push("/add-child")} last />
      </Card>

      <Button title="Sign out" variant="secondary" icon="log-out-outline" onPress={confirmSignOut} style={{ marginTop: spacing.sm }} />
      <Text style={styles.footer}>SIMBA · connected to {API_URL}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: "center", color: colors.muted, fontSize: 11, marginTop: spacing.lg, fontFamily: font.regular },
});
