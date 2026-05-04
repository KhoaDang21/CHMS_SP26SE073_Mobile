import AiFloatingButton from "@/components/ai/AiFloatingButton";
import {
    AboutScreen,
    BicycleGamificationScreen,
    BookingDetailScreen,
    BookingDiningScreen,
    BookingEditScreen,
    BookingsScreen,
    ChatScreen,
    ContactScreen,
    CreateReviewScreen,
    EquipmentScreen,
    ForgotPasswordScreen,
    HomeScreen,
    HomestayDetailScreen,
    LandingScreen,
    LocalExperiencesScreen,
    LoginScreen,
    NotificationPreferencesScreen,
    NotificationsScreen,
    PaymentInitiationScreen,
    PaymentResultScreen,
    ProfileScreen,
    PublicExploreScreen,
    RegisterScreen,
    ResetPasswordScreen,
    ReviewsScreen,
    SupportScreen,
    TravelGuidesScreen,
    WishlistScreen,
} from "@/screens";
import { tokenStorage } from "@/service/auth/tokenStorage";
import { colors } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export type RootStackParamList = {
  AuthStack: undefined;
  MainTabs: undefined;
  HomestayDetail: { id: string };
  BookingDetail: { bookingId: string };
  BookingEdit: { bookingId: string };
  BookingDining: { bookingId: string };
  Equipment: { booking: any };
  PaymentInitiation: { bookingId: string; booking?: any };
  LocalExperiences: undefined;
  Reviews: undefined;
  Notifications: undefined;
  NotificationPreferences: undefined;
  Support: undefined;
  Chat: undefined;
  Contact: undefined;
  PaymentResult: { paymentId?: string; bookingId: string };
  CreateReview: { bookingId: string; homestayName?: string };
  TravelGuides: undefined;
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
  Contact: undefined;
};

const prefix = Linking.createURL("/");

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [prefix, "chmssp26se073mobile://"],
  config: {
    screens: {
      AuthStack: "auth",
      MainTabs: "main",
      HomestayDetail: {
        path: "homestay/:id",
        parse: {
          id: (id) => id,
        },
      },
      BookingDetail: {
        path: "booking/:bookingId",
        parse: {
          bookingId: (bookingId) => bookingId,
        },
      },
      BookingEdit: {
        path: "booking/:bookingId/edit",
        parse: {
          bookingId: (bookingId) => bookingId,
        },
      },
      PaymentInitiation: {
        path: "payment-initiation/:bookingId",
        parse: {
          bookingId: (bookingId) => bookingId,
        },
      },
      PaymentResult: {
        path: "payment-result",
      },
      Reviews: "reviews",
      LocalExperiences: "experiences",
      Notifications: "notifications",
      NotificationPreferences: "notification-preferences",
      Support: "support",
      TravelGuides: "travel-guides",
      Chat: "chat",
      Contact: "contact",
      CreateReview: {
        path: "review/create/:bookingId",
        parse: {
          bookingId: (bookingId) => bookingId,
        },
      },
    },
  },
  async getInitialURL() {
    // Handle deep link from cold start (app not running)
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
    return undefined;
  },
  subscribe(listener) {
    // Listen to incoming links from deep linking
    const onReceiveURL = ({ url }: { url: string }) => {
      listener(url);
    };

    const subscription = Linking.addEventListener("url", onReceiveURL);

    return () => {
      subscription.remove();
    };
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNavigator = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();

function AuthStackScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  return (
    <AuthStackNavigator.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNavigator.Screen name="Landing" component={LandingScreen} />
      <AuthStackNavigator.Screen
        name="Explore"
        component={PublicExploreScreen}
      />
      <AuthStackNavigator.Screen
        name="HomestayDetail"
        component={HomestayDetailScreen}
      />
      <AuthStackNavigator.Screen name="Login">
        {() => <LoginScreen onLoginSuccess={onLoginSuccess} />}
      </AuthStackNavigator.Screen>
      <AuthStackNavigator.Screen name="Register" component={RegisterScreen} />
      <AuthStackNavigator.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
      />
      <AuthStackNavigator.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
      />
      <AuthStackNavigator.Screen name="About" component={AboutScreen} />
      <AuthStackNavigator.Screen name="Contact" component={ContactScreen} />
    </AuthStackNavigator.Navigator>
  );
}

function MainTabs({ onLogout }: { onLogout?: () => void }) {
  return (
    <View style={{ flex: 1 }}>
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
              <MaterialCommunityIcons
                name="home-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Bookings"
          component={BookingsScreen}
          options={{
            tabBarLabel: "Đặt phòng",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="calendar-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Bicycles"
          component={BicycleGamificationScreen}
          options={{
            tabBarLabel: "Xe đạp",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="bike" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="TravelGuides"
          component={TravelGuidesScreen}
          options={{
            tabBarLabel: "Cẩm nang",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="book-open-variant"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Wishlist"
          component={WishlistScreen}
          options={{
            tabBarLabel: "Yêu thích",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="heart-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          options={{
            tabBarLabel: "Cài đặt",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="cog-outline"
                color={color}
                size={size}
              />
            ),
          }}
        >
          {() => <ProfileScreen onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
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
    <NavigationContainer linking={linking} fallback={null}>
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
                name="BookingDetail"
                component={BookingDetailScreen}
              />
              <Stack.Screen name="BookingEdit" component={BookingEditScreen} />
              <Stack.Screen
                name="BookingDining"
                component={BookingDiningScreen}
              />
              <Stack.Screen name="Equipment" component={EquipmentScreen} />
              <Stack.Screen
                name="PaymentInitiation"
                component={PaymentInitiationScreen}
              />
              <Stack.Screen
                name="PaymentResult"
                component={PaymentResultScreen}
              />
              <Stack.Screen
                name="LocalExperiences"
                component={LocalExperiencesScreen}
              />
              <Stack.Screen name="Reviews" component={ReviewsScreen} />
              <Stack.Screen name="Support" component={SupportScreen} />
            </Stack.Group>

            <Stack.Group
              screenOptions={{
                presentation: "modal",
              }}
            >
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
              />
              <Stack.Screen
                name="NotificationPreferences"
                component={NotificationPreferencesScreen}
              />
              <Stack.Screen name="Chat" component={ChatScreen} />
              <Stack.Screen
                name="CreateReview"
                component={CreateReviewScreen}
              />
            </Stack.Group>
          </Stack.Group>
        )}
      </Stack.Navigator>
      {/* Floating AI chat button — overlay trên tất cả screens */}
      {authenticated && <AiFloatingButton />}
    </NavigationContainer>
  );
}
