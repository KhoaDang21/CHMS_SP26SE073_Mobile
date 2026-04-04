import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
}

export const profileService = {
  async getProfile(): Promise<UserProfile | null> {
    const res = await apiClient.get<any>(apiConfig.endpoints.profile.get);
    const data = res?.data ?? res;
    if (!data) return null;
    return {
      fullName: data.fullName ?? data.name ?? "",
      email: data.email ?? "",
      phone: data.phone ?? data.phoneNumber ?? "",
    };
  },

  /** PUT /api/users/profile — BE UpdateUserProfileRequestDTO: { fullName, phoneNumber, avatarUrl } */
  async updateProfile(payload: { fullName: string; phoneNumber: string; avatarUrl?: string }) {
    return apiClient.put(apiConfig.endpoints.profile.update, payload);
  },

  /** PUT /api/users/profile/password — BE ChangePasswordRequestDTO: { currentPassword, newPassword, confirmPassword } */
  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return apiClient.put(apiConfig.endpoints.profile.changePassword, payload);
  },
};
