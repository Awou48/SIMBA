import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/state/auth";
import { ChildProvider } from "../src/state/child";
import { colors } from "../src/lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ChildProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
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
