import { Redirect } from "expo-router";
import { Loading } from "../components/shared/StatusLayar";
import { useAuth } from "../context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IndexScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Loading label="Memuat..." />
      </SafeAreaView>
    );
  }

  return <Redirect href={user ? (user.role === "ASISTEN" ? "/asisten" : "/praktikan") : "./login"} />;
}
