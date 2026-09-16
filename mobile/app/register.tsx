import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/state/auth";
import { errorMessage } from "../src/lib/api";
import { Button, Card, ErrorBox, Field, Header, Screen } from "../src/components/ui";
import { colors, font, spacing } from "../src/lib/theme";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("That email doesn't look right.");
    if (password.length < 6) return setError("Password needs at least 6 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setBusy(true);
    setError("");
    try {
      await register(email, password);
      router.replace("/add-child?first=1");
    } catch (err) {
      setError(errorMessage(err, "Could not create the account."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Header title="Create account" emoji="🌟" subtitle="One account can follow all your children." onBack={() => router.back()} />
        <ErrorBox message={error} />
        <Card>
          <Field label="Email" emoji="✉️" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Field label="Password" emoji="🔒" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />
          <Field label="Repeat password" emoji="🔁" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Same password again" onSubmitEditing={submit} returnKeyType="go" />
        </Card>
        <Button title="Create my account" emoji="🎉" onPress={submit} loading={busy} />
        <Text style={styles.terms}>Your child's data is only visible to you. Health workers see anonymous, region-level numbers only.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  terms: { fontSize: 12, fontFamily: font.regular, color: colors.muted, textAlign: "center", marginTop: spacing.lg, lineHeight: 18 },
});
