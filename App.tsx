import RootNavigator from "@/navigation/RootNavigator";
import { ToastProvider } from "@/utils/toast";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
    useEffect(() => {
        SplashScreen.hideAsync().catch(() => {});
    }, []);

    return (
        <GestureHandlerRootView style={styles.root}>
            <SafeAreaProvider>
                <ToastProvider>
                    <RootNavigator />
                    <StatusBar style="dark" />
                </ToastProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});
