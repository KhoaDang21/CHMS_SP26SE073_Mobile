import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";
import { tokenStorage } from "@/service/auth/tokenStorage";
import type { User } from "@/types";

export const authService = {
  async login(email: string, password: string) {
    const res = await apiClient.post<any>(apiConfig.endpoints.auth.login, { email, password });
    const token = res?.data?.accessToken || res?.data?.token || res?.token;
    const refreshToken = res?.data?.refreshToken || null;
    const sourceUser = res?.data?.user || res?.data;
    const user: User = {
      id: sourceUser?.id || sourceUser?.email || "",
      email: sourceUser?.email || "",
      name: sourceUser?.fullName || sourceUser?.name || "",
      role: (sourceUser?.role || "customer").toLowerCase(),
    };

    if (!token) throw new Error("Khong lay duoc access token");
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
};
