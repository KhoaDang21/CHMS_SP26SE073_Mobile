import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";
import type { Experience } from "@/types";

const mapExperience = (item: any): Experience => ({
  id: String(item.id ?? item.Id ?? ""),
  name: item.name ?? item.Name ?? "",
  description: item.description ?? item.Description,
  price: Number(item.price ?? item.Price ?? 0),
  category: item.category ?? item.Category,
  image: item.image ?? item.Image,
});

/**
 * Experience/Local Experiences Service
 * Handles fetching available experiences/services that customers can add to bookings
 */
export const experienceService = {
  /**
   * GET /api/experiences — Get all available experiences
   */
  async getAll(): Promise<Experience[]> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.experiences.list,
      );
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res)
            ? res
            : [];
      return list.map(mapExperience);
    } catch (e) {
      console.warn("[experienceService.getAll] Error:", e);
      return [];
    }
  },

  /**
   * GET /api/experiences?category={category} — Get experiences by category
   */
  async getByCategory(category: string): Promise<Experience[]> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.experiences.listByCategory(category),
      );
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res)
            ? res
            : [];
      return list.map(mapExperience);
    } catch (e) {
      console.warn("[experienceService.getByCategory] Error:", e);
      return [];
    }
  },

  /**
   * GET /api/experiences/{id} — Get experience detail
   */
  async getById(id: string): Promise<Experience | null> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.experiences.detail(id),
      );
      const raw = res?.data ?? res;
      if (!raw?.id && !raw?.Id) return null;
      return mapExperience(raw);
    } catch (e) {
      console.warn("[experienceService.getById] Error:", e);
      return null;
    }
  },
};
