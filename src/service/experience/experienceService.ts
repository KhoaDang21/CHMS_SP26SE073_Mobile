import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";
import type { Experience } from "@/types";

const mapExperience = (item: any): Experience => {
  const statusRaw = String(item?.status ?? item?.Status ?? "").toUpperCase();
  const isActiveByStatus = statusRaw ? statusRaw === "ACTIVE" : undefined;

  return {
    id: String(item?.id ?? item?.Id ?? ""),
    homestayId: String(item?.homestayId ?? item?.HomestayId ?? ""),
    name: String(item?.name ?? item?.Name ?? ""),
    description: item?.description ?? item?.Description ?? "",
    price: Number(item?.price ?? item?.Price ?? 0),
    unit: item?.unit ?? item?.Unit ?? "",
    category:
      item?.categoryName ??
      item?.CategoryName ??
      item?.category ??
      item?.Category ??
      "",
    categoryId: String(item?.categoryId ?? item?.CategoryId ?? ""),
    image: item?.imageUrl ?? item?.ImageUrl ?? item?.image ?? item?.Image ?? "",
    isActive:
      (item?.isActive ?? item?.IsActive ?? isActiveByStatus ?? true) === true,
  };
};

/**
 * Experience/Local Experiences Service
 * Handles fetching available experiences/services that customers can add to bookings
 */
export const experienceService = {
  /**
   * GET /api/experiences?homestayId={id} — Get experiences by homestay
   * BE DAL chưa filter theo homestayId nên filter thêm ở client
   */
  async getByHomestay(homestayId: string): Promise<Experience[]> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.experiences.listByHomestay(homestayId),
      );
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res)
            ? res
            : [];
      return list
        .map(mapExperience)
        .filter(
          (e: Experience) =>
            e.isActive !== false && String(e.homestayId) === String(homestayId),
        );
    } catch (error) {
      console.warn("[experienceService.getByHomestay] Error:", error);
      return [];
    }
  },

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
    } catch (error) {
      console.warn("[experienceService.getAll] Error:", error);
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
    } catch (error) {
      console.warn("[experienceService.getByCategory] Error:", error);
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
