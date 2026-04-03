import { apiClient } from "@/service/api/apiClient";
import { extractArray } from "@/service/api/responseHelpers";
import { apiConfig } from "@/service/constants/apiConfig";

export interface District {
  id: string;
  name: string;
  provinceName: string;
}

const mapDistrict = (dto: Record<string, unknown>): District => ({
  id: String(dto.id ?? dto.Id ?? ""),
  name: String(dto.name ?? dto.Name ?? ""),
  provinceName: String(dto.provinceName ?? dto.ProvinceName ?? ""),
});

export const districtService = {
  async getAllDistricts(): Promise<District[]> {
    try {
      const res = await apiClient.get<unknown>(apiConfig.endpoints.districts.list);
      const data = extractArray<Record<string, unknown>>(res);
      return data.map(mapDistrict).filter((d) => d.id && d.name);
    } catch {
      return [];
    }
  },
};
