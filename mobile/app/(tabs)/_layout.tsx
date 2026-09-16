import { Redirect, Tabs } from "expo-router";
import { Platform, Text } from "react-native";
import { useAuth } from "../../src/state/auth";
import { useChildren } from "../../src/state/child";
import { Loading } from "../../src/components/ui";
import { colors, font } from "../../src/lib/theme";

const TAB_EMOJI: Record<string, string> = { index: "🏠", growth: "📏", nutrition: "🍽️", development: "🧩", more: "✨" };

function Icon({ name, focused }: { name: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.55 }}>{TAB_EMOJI[name]}</Text>;
}

export default function TabsLayout() {
  const { ready, isAuthenticated } = useAuth();
  const { loading, children } = useChildren();

  if (!ready) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (loading) return <Loading label="Getting things ready…" />;
  if (children.length === 0) return <Redirect href="/add-child?first=1" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: font.extra },
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: colors.white,
          height: Platform.OS === "ios" ? 84 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
          shadowColor: "#8A6A3D",
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        },
        tabBarIcon: ({ focused }) => <Icon name={route.name} focused={focused} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="growth" options={{ title: "Growth" }} />
      <Tabs.Screen name="nutrition" options={{ title: "Meals" }} />
      <Tabs.Screen name="development" options={{ title: "Milestones" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
