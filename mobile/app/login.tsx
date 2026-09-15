import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../src/state/auth";
import { errorMessage } from "../src/lib/api";
import { Button, ErrorBox, Field, Screen } from "../src/components/ui";
import { colors, radius, spacing } from "../src/lib/theme";

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(errorMessage(err, "Could not sign in."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll={false} padded={false} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Image source={require("../assets/logo_mark.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.brand}>SIMBA</Text>
          <Text style={styles.tagline}>Sistem Informasi Monitoring Balita</Text>
        </View>
        <View style={styles.sheet}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to follow your child's growth, nutrition and development.</Text>
          <ErrorBox message={error} />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={submit} returnKeyType="go" />
          <Button title="Sign In" onPress={submit} loading={busy} style={{ marginTop: spacing.xs }} />
          <View style={styles.footer}>
            <Text style={styles.footerText}>New to SIMBA? </Text>
            <Link href="/register" asChild>
              <Pressable hitSlop={6}>
                <Text style={styles.footerLink}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingTop: spacing.xxl, paddingBottom: spacing.xxl + radius.xl, backgroundColor: colors.primary, flex: 1, justifyContent: "center" },
  logoBox: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  logo: { width: 82, height: 82 },
  brand: { color: colors.white, fontSize: 30, fontWeight: "800", letterSpacing: 1 },
  tagline: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, marginTop: -radius.xl },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: spacing.lg, lineHeight: 19 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  footerText: { color: colors.muted, fontSize: 13 },
  footerLink: { color: colors.primary, fontSize: 13, fontWeight: "700" },
});
