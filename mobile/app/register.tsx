import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/state/auth";
import { errorMessage } from "../src/lib/api";
import { Button, ErrorBox, Field, Header, Screen } from "../src/components/ui";
import { colors, spacing } from "../src/lib/theme";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
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
        <Header title="Create account" subtitle="One account can follow several children." onBack={() => router.back()} />
        <ErrorBox message={error} />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" />
        <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat your password" onSubmitEditing={submit} returnKeyType="go" />
        <Button title="Create account" onPress={submit} loading={busy} />
        <Text style={styles.terms}>Your child's data is only visible to you. Health Managers see anonymised, region-level statistics.</Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  terms: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: spacing.lg, lineHeight: 18 },
});
