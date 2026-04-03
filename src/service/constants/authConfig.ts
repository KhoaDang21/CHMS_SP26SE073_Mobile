// Mobile Authentication configuration

export const authConfig = {
  // API Configuration
  api: {
    baseUrl: "http://163.227.230.54:8088/api",
    endpoints: {
      login: "/Auth/login",
      googleLogin: "/Auth/google-login",
      register: "/Auth/register",
      verifyOtp: "/Auth/verify-otp",
      logout: "/Auth/logout",
      forgotPassword: "/Auth/forgot-password",
      resetPassword: "/Auth/reset-password",
      refreshToken: "/Auth/refresh-token",
    },
  },

  // Token storage key
  tokenKey: "authToken",

  // Session timeout (in milliseconds)
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours

  // OAuth providers configuration
  oauthProviders: {
    google: {
      enabled: true,
      clientId: "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
      // For Android: Add your Android package name and signing certificate
      // Get it from: android/app/build/outputs/apk/debug/output-metadata.json
      androidPackageName: "com.chms.sp26se073.mobile",
      // For iOS: Add your iOS bundle ID
      iosBundleId: "com.chms.sp26se073.mobile",
    },
  },

  // UI Configuration
  ui: {
    // Full screen scrollable experience
    enableFullScreenUI: true,
    // Remove top whitespace
    removeTopPadding: true,
    // Gradient colors
    primaryGradient: {
      start: "#2563eb",
      end: "#0891b2",
    },
  },

  // Redirect paths after login based on role
  redirectPaths: {
    customer: "Home",
    manager: "Home",
    staff: "Home",
    admin: "Home",
  },
};
