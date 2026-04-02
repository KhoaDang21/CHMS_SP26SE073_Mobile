import RootNavigator from "@/navigation/RootNavigator";
import { ToastProvider } from "@/utils/toast";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
