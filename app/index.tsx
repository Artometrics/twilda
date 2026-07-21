import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";

export default function Index() {
  const { user, loading, configured } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.accentDark} />
      </View>
    );
  }

  if (!configured || !user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/novels" />;
}
