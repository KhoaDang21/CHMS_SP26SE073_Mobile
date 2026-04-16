import { useNavigation } from "@react-navigation/native";
import { useRef, useEffect } from "react";
import { Animated, Easing, StyleSheet, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Floating AI chat button — giống FE web (góc dưới phải, có ping animation)
 * Đặt overlay trên MainTabs, navigate sang ChatScreen khi bấm
 */
export default function AiFloatingButton() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const ping = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(ping, {
                    toValue: 1.6,
                    duration: 900,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(ping, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.delay(1500),
            ])
        ).start();
    }, []);

    return (
        <View style={[styles.wrapper, { bottom: insets.bottom + 72 }]}>
            {/* Ping ring */}
            <Animated.View
                style={[
                    styles.ping,
                    { transform: [{ scale: ping }], opacity: ping.interpolate({ inputRange: [1, 1.6], outputRange: [0.35, 0] }) },
                ]}
            />
            <TouchableOpacity
                style={styles.btn}
                onPress={() => navigation.navigate("Chat")}
                activeOpacity={0.85}
            >
                <MaterialCommunityIcons name="robot-outline" size={26} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        right: 20,
        zIndex: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    ping: {
        position: "absolute",
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#0891b2",
    },
    btn: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#0891b2",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#0891b2",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
});
