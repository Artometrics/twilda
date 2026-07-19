import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors, typography } from "@/constants/theme";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: focused ? typography.bodyBold : typography.body,
        fontSize: 12,
        color: focused ? colors.accentDark : colors.muted,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.accentDark} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: typography.display },
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.accentDark,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="novels"
        options={{
          title: "Library",
          tabBarLabel: ({ focused }) => <TabLabel label="Library" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarLabel: ({ focused }) => <TabLabel label="Journal" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarLabel: ({ focused }) => <TabLabel label="Account" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
