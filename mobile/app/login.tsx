import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../src/state/auth";
import { errorMessage } from "../src/lib/api";
import { Bounce, Button, ErrorBox, Field, Screen } from "../src/components/ui";
import { colors, font, gradient, radius, spacing } from "../src/lib/theme";

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
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
    <Screen scroll={false} padded={false} edges={["bottom"]} background={colors.orange}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <LinearGradient colors={[gradient.sunrise[0], gradient.sunrise[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.logoBox}>
            <Image source={require("../assets/logo_mark.png")} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.brand}>SIMBA</Text>
          <Text style={styles.tagline}>Watch your little one grow, happy and healthy 🌱</Text>
        </LinearGradient>
        <View style={styles.sheet}>
          <Text style={styles.title}>Welcome back 👋</Text>
          <Text style={styles.subtitle}>Sign in to see how your child is doing.</Text>
          <ErrorBox message={error} />
          <Field label="Email" emoji="✉️" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
          <Field label="Password" emoji="🔒" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={submit} returnKeyType="go" />
          <Button title="Sign In" onPress={submit} loading={busy} style={{ marginTop: spacing.xs }} />
          <Bounce onPress={() => router.push("/register")} style={styles.footer} haptic={false}>
            <Text style={styles.footerText}>
              New here? <Text style={styles.footerLink}>Create an account</Text>
            </Text>
          </Bounce>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", justifyContent: "center", paddingTop: spacing.xxl + 24, paddingBottom: spacing.xxl + radius.xl, paddingHorizontal: spacing.xl },
  logoBox: { width: 108, height: 108, borderRadius: 32, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", marginBottom: spacing.md, shadowColor: "#8A4A10", shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  logo: { width: 92, height: 92 },
  brand: { color: colors.white, fontSize: 34, fontFamily: font.black, letterSpacing: 1 },
  tagline: { color: "rgba(255,255,255,0.92)", fontSize: 14, fontFamily: font.bold, marginTop: 4, textAlign: "center" },
  sheet: { flex: 1, backgroundColor: colors.cream, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: spacing.xxl, marginTop: -radius.xl },
  title: { fontSize: 24, fontFamily: font.black, color: colors.text },
  subtitle: { fontSize: 14, fontFamily: font.regular, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  footer: { alignItems: "center", marginTop: spacing.lg },
  footerText: { color: colors.muted, fontSize: 14, fontFamily: font.bold },
  footerLink: { color: colors.orange, fontFamily: font.extra },
});
