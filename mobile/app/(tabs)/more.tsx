import { Alert, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "../../src/lib/api";
import { useAuth } from "../../src/state/auth";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Button, Card, Header, ListItem, Screen, SectionTitle } from "../../src/components/ui";
import { colors, spacing } from "../../src/lib/theme";

export default function More() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { children } = useChildren();

  const confirmSignOut = () =>
    Alert.alert("Sign out", "You will need your email and password to sign back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut().then(() => router.replace("/login")) },
    ]);

  return (
    <Screen>
      <Header title="More" />
      <ChildSwitcher />

      <SectionTitle title="Health" />
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListItem icon="shield-checkmark" iconTone="teal" title="Immunization" subtitle="Kemenkes schedule, mark doses given" onPress={() => router.push("/immunization")} />
        <ListItem icon="calendar" iconTone="primary" title="Calendar" subtitle="Doctor visits, checkups, reminders" onPress={() => router.push("/calendar")} />
        <ListItem icon="notifications" iconTone="warn" title="Alerts" subtitle="Everything that needs attention" onPress={() => router.push("/alerts")} />
        <ListItem icon="document-text" iconTone="orange" title="Growth report" subtitle="Summary and shareable PDF" onPress={() => router.push("/reports")} />
      </Card>

      <SectionTitle title="Learn" />
      <Card style={{ paddingVertical: spacing.xs }}>
        <ListItem icon="book" iconTone="good" title="Explore articles" subtitle="Growth, nutrition, development, immunization" onPress={() => router.push("/explore")} />
      </Card>

      <SectionTitle title="Family" />
      <Card style={{ paddingVertical: spacing.xs }}>
        {children.map((c) => (
          <ListItem key={c.id} icon="person" iconTone={c.gender === "female" ? "bad" : "primary"} title={c.name} subtitle={`Born ${c.birth_date}${c.region ? ` · ${c.region}` : ""}`} onPress={() => router.push(`/child/${c.id}`)} />
        ))}
        <ListItem icon="add-circle" iconTone="muted" title="Add a child" onPress={() => router.push("/add-child")} />
      </Card>

      <Button title="Sign out" variant="secondary" icon="log-out-outline" onPress={confirmSignOut} style={{ marginTop: spacing.sm }} />
      <Text style={styles.footer}>SIMBA mobile · API {API_URL}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { textAlign: "center", color: colors.muted, fontSize: 11, marginTop: spacing.lg },
});
