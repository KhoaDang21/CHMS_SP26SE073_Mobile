import { apiClient } from "@/service/api/apiClient";
import { tokenStorage } from "@/service/auth/tokenStorage";
import { apiConfig } from "@/service/constants/apiConfig";
import type { User } from "@/types";

export const authService = {
  async login(email: string, password: string) {
    const res = await apiClient.post<any>(apiConfig.endpoints.auth.login, {
      email,
      password,
    });
    const token =
      res?.data?.accessToken ||
      res?.data?.token ||
      res?.accessToken ||
      res?.token;
    const refreshToken = res?.data?.refreshToken || res?.refreshToken || null;
    const sourceUser = res?.data?.user || res?.data?.User || res?.user || res?.data;
    const user: User = {
      id: sourceUser?.id || sourceUser?.email || "",
      email: sourceUser?.email || "",
      name: sourceUser?.fullName || sourceUser?.name || "",
      role: (sourceUser?.role || "customer").toLowerCase(),
    };

    if (!token) throw new Error("Không lấy được access token");
    await tokenStorage.setSession(token, refreshToken, user);
    return user;
  },

  /** POST /api/Auth/register — same body as FE */
  async register(data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }) {
    await apiClient.post<any>(apiConfig.endpoints.auth.register, {
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      phoneNumber: data.phone,
    });
  },

  /** POST /api/Auth/forgot-password — FE: { email } */
  async forgotPassword(email: string) {
    await apiClient.post(apiConfig.endpoints.auth.forgotPassword, { email });
  },

  /** POST /api/Auth/verify-otp — FE: { email, otpCode } */
  async verifyOtp(email: string, otpCode: string) {
    await apiClient.post(apiConfig.endpoints.auth.verifyOtp, {
      email,
      otpCode,
    });
  },

  /** POST /api/Auth/reset-password — FE: { email, otpCode, newPassword } */
  async resetPassword(data: {
    email: string;
    otpCode: string;
    newPassword: string;
  }) {
    await apiClient.post(apiConfig.endpoints.auth.resetPassword, {
      email: data.email,
      otpCode: data.otpCode,
      newPassword: data.newPassword,
    });
  },

  async googleLogin(googleToken: string) {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.auth.googleLogin,
      {
        idToken: googleToken,
      },
    );
    const token =
      res?.data?.accessToken || res?.data?.token || res?.accessToken || res?.token;
    const refreshToken = res?.data?.refreshToken || res?.refreshToken || null;
    const sourceUser = res?.data?.user || res?.data?.User || res?.user || res?.data;
    const user: User = {
      id: sourceUser?.id || sourceUser?.email || "",
      email: sourceUser?.email || "",
      name: sourceUser?.fullName || sourceUser?.name || "",
      role: (sourceUser?.role || "customer").toLowerCase(),
    };

    if (!token) throw new Error("Không lấy được access token từ Google");
    await tokenStorage.setSession(token, refreshToken, user);
    return user;
  },

  async logout() {
    try {
      const token = await tokenStorage.getToken();
      const refreshToken = await tokenStorage.getRefreshToken();
      if (token && refreshToken) {
        await apiClient.post(apiConfig.endpoints.auth.logout, {
          accessToken: token,
          refreshToken,
        });
      }
    } finally {
      await tokenStorage.clear();
    }
  },

  async getCurrentUser() {
    return tokenStorage.getUser();
  },

  async refreshToken() {
    const oldRefreshToken = await tokenStorage.getRefreshToken();
    if (!oldRefreshToken) throw new Error("Không có refresh token");

    const res = await apiClient.post<any>(
      apiConfig.endpoints.auth.refreshToken,
      {
        refreshToken: oldRefreshToken,
      },
    );
    const token = res?.data?.accessToken || res?.data?.token;
    const refreshToken = res?.data?.refreshToken;
    const user = await tokenStorage.getUser();

    if (!token) throw new Error("Không thể refresh token");
    if (user) {
      await tokenStorage.setSession(token, refreshToken, user);
    }
    return token;
  },
};
