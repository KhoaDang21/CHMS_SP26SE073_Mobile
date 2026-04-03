import {
  AboutScreen,
  BookingEditScreen,
  BookingsScreen,
  ChatScreen,
  ContactPage,
  ForgotPasswordScreen,
  HomeScreen,
  HomestayDetailScreen,
  LandingScreen,
  LoginScreen,
  PublicExploreScreen,
  NotificationPreferencesScreen,
  NotificationsScreen,
  PaymentInitiationScreen,
  PaymentResultScreen,
  ProfileScreen,
  RegisterScreen,
  ResetPasswordScreen,
  ReviewsScreen,
  SupportScreen,
  WishlistScreen,
} from "@/screens";
import { tokenStorage } from "@/service/auth/tokenStorage";
import { colors } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export type RootStackParamList = {
  AuthStack: undefined;
  MainTabs: undefined;
  HomestayDetail: { id: string };
  BookingEdit: { bookingId: string };
  PaymentInitiation: { bookingId: string };
  Reviews: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  Support: undefined;
  Chat: undefined;
  Contact: undefined;
  PaymentResult: { paymentId?: string; bookingId: string };
};

export type AuthStackParamList = {
  Landing: undefined;
  Explore: undefined;
  HomestayDetail: { id: string };
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email: string };
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNavigator = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();

function AuthStackScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  return (
    <AuthStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNavigator.Screen name="Landing" component={LandingScreen} />
      <AuthStackNavigator.Screen name="Explore" component={PublicExploreScreen} />
      <AuthStackNavigator.Screen name="HomestayDetail" component={HomestayDetailScreen} />
      <AuthStackNavigator.Screen name="Login">
        {() => <LoginScreen onLoginSuccess={onLoginSuccess} />}
      </AuthStackNavigator.Screen>
      <AuthStackNavigator.Screen name="Register" component={RegisterScreen} />
      <AuthStackNavigator.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStackNavigator.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <AuthStackNavigator.Screen name="About" component={AboutScreen} />
    </AuthStackNavigator.Navigator>
  );
}

function MainTabs({ onLogout }: { onLogout?: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: -4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Trang chủ",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarLabel: "Yêu thích",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: "AI Chat",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarLabel: "Đặt phòng",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        options={{
          tabBarLabel: "Hồ sơ",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-outline" color={color} size={size} />
          ),
        }}
      >
        {() => <ProfileScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkAuth = async () => {
      try {
        const token = await tokenStorage.getToken();
        if (isMounted) {
          setAuthenticated(Boolean(token));
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setAuthenticated(false);
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Safety timeout - ensure loading state is cleared after 3 seconds
    timeoutId = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary[500]} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!authenticated ? (
          <Stack.Screen name="AuthStack">
            {() => (
              <AuthStackScreen onLoginSuccess={() => setAuthenticated(true)} />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Group>
            <Stack.Screen name="MainTabs">
              {() => <MainTabs onLogout={() => setAuthenticated(false)} />}
            </Stack.Screen>

            <Stack.Group
              screenOptions={{
                presentation: "card",
              }}
            >
              <Stack.Screen
                name="HomestayDetail"
                component={HomestayDetailScreen}
              />
              <Stack.Screen
                name="BookingEdit"
                component={BookingEditScreen}
              />
              <Stack.Screen
                name="PaymentInitiation"
                component={PaymentInitiationScreen}
              />
              <Stack.Screen name="Contact" component={ContactPage} />
              <Stack.Screen
                name="PaymentResult"
                component={PaymentResultScreen}
              />
            </Stack.Group>

            <Stack.Group
              screenOptions={{
                presentation: "modal",
              }}
            >
              <Stack.Screen name="Reviews" component={ReviewsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen
                name="NotificationPreferences"
                component={NotificationPreferencesScreen}
              />
              <Stack.Screen name="Support" component={SupportScreen} />
            </Stack.Group>
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
