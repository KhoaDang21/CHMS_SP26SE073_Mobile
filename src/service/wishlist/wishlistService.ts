import { apiClient } from "@/service/api/apiClient";
import { extractArray } from "@/service/api/responseHelpers";
import { apiConfig } from "@/service/constants/apiConfig";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import type { Homestay } from "@/types";

const mapHomestay = (it: Record<string, unknown>): Homestay => ({
  id: String(it.id ?? it.Id ?? ""),
  name: String(it.name ?? it.Name ?? ""),
  description: String(it.description ?? it.Description ?? ""),
  address: String(it.address ?? it.Address ?? ""),
  districtName: String(it.districtName ?? it.DistrictName ?? ""),
  provinceName: String(it.provinceName ?? it.ProvinceName ?? ""),
  pricePerNight: Number(it.pricePerNight ?? it.PricePerNight ?? 0),
  maxGuests: Number(it.maxGuests ?? it.MaxGuests ?? 1),
  bedrooms: Number(it.bedrooms ?? it.Bedrooms ?? 0),
  bathrooms: Number(it.bathrooms ?? it.Bathrooms ?? 0),
  images: (it.images ?? it.ImageUrls ?? it.imageUrls ?? []) as string[],
  amenities: (it.amenities ?? it.AmenityNames ?? []) as string[],
});

export const wishlistService = {
  async getMyWishlist(): Promise<Homestay[]> {
    try {
      const res = await apiClient.get<unknown>(apiConfig.endpoints.wishlist.list);
      const list = extractArray<Record<string, unknown>>(res);
      const mapped = list.map(mapHomestay);
      const enriched = await Promise.all(
        mapped.map(async (h) => (await publicHomestayService.getById(h.id)) || h),
      );
      return enriched;
    } catch {
      return [];
    }
  },

  async add(homestayId: string) {
    await apiClient.post(apiConfig.endpoints.wishlist.add(homestayId));
  },

  async remove(homestayId: string) {
    await apiClient.delete(apiConfig.endpoints.wishlist.remove(homestayId));
  },

  /** GET /api/recently-viewed */
  async getRecentlyViewed(): Promise<Homestay[]> {
    try {
      const res = await apiClient.get<unknown>(apiConfig.endpoints.wishlist.recentlyViewed);
      const list = extractArray<Record<string, unknown>>(res);
      return list.map(mapHomestay);
    } catch {
      return [];
    }
  },
};
