import { useEffect } from "react";
import { Text, TextInput } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { Fredoka_600SemiBold, Fredoka_700Bold } from "@expo-google-fonts/fredoka";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "../src/state/auth";
import { ChildProvider } from "../src/state/child";
import { colors, font } from "../src/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const applyDefaultFont = () => {
  const T = Text as unknown as { defaultProps?: { style?: unknown } };
  const I = TextInput as unknown as { defaultProps?: { style?: unknown } };
  T.defaultProps = { ...(T.defaultProps ?? {}), style: [{ fontFamily: font.regular, color: colors.ink }, T.defaultProps?.style] };
  I.defaultProps = { ...(I.defaultProps ?? {}), style: [{ fontFamily: font.regular }, I.defaultProps?.style] };
};

export default function RootLayout() {
  const [loaded] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Fredoka_600SemiBold, Fredoka_700Bold });

  useEffect(() => {
    if (loaded) {
      applyDefaultFont();
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ChildProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream }, animation: "slide_from_right" }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-child" options={{ presentation: "modal" }} />
            <Stack.Screen name="measurement" options={{ presentation: "modal" }} />
            <Stack.Screen name="meal" options={{ presentation: "modal" }} />
          </Stack>
        </ChildProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
