import { logger } from "@/utils/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client ID - Replace with your actual client ID from Google Cloud Console
// Get this from Google Cloud Console:
// https://console.cloud.google.com/
const GOOGLE_CLIENT_ID =
  "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com";

export const googleAuthService = {
  /**
   * Initialize Google OAuth Request configuration
   * Use with expo-auth-session hook: const [request, response, promptAsync] = Google.useAuthRequest({...})
   */
  getGoogleAuthConfig() {
    return {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ["profile", "email"],
    };
  },

  /**
   * Handle Google OAuth response from expo-auth-session
   * @param response - Response from Google.useAuthRequest promptAsync
   * @returns idToken if successful, null otherwise
   */
  async handleGoogleResponse(response: any): Promise<string | null> {
    try {
      if (response?.type === "success") {
        const { id_token } = response.params;
        if (id_token) {
          // Store the token temporarily for debugging if needed
          await AsyncStorage.setItem("google_id_token_temp", id_token);
          return id_token;
        }
      }
      return null;
    } catch (error) {
      logger.error("Google auth response handling failed", error);
      return null;
    }
  },

  /**
   * Clear any stored Google tokens
   */
  async clearGoogleTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem("google_id_token_temp");
    } catch (error) {
      logger.error("Failed to clear Google tokens", error);
    }
  },
};
