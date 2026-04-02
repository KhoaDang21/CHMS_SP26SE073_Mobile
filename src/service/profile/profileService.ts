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
  async updateProfile(payload: { fullName: string; phoneNumber: string }) {
    return apiClient.put(apiConfig.endpoints.profile.update, payload);
  },
};
