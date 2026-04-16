import { apiClient } from "@/service/api/apiClient";
import { extractArray } from "@/service/api/responseHelpers";
import { apiConfig } from "@/service/constants/apiConfig";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";
import type { Homestay } from "@/types";

export interface HomestayScore {
  homestayId: string;
  homestayName: string;
  matchScore: number;
  priceScore: number;
  amenityScore: number;
  locationScore: number;
}

export interface CompareResult {
  homestaysData: Homestay[];
  aiAnalysisMarkdown: string;
  scores: HomestayScore[];
}

const mapHomestay = (it: Record<string, unknown>): Homestay => ({
  id: String(it.id ?? it.Id ?? it.HomestayId ?? it.homestayId ?? ""),
  name: String(it.name ?? it.Name ?? it.HomestayName ?? it.homestayName ?? ""),
  description: String(it.description ?? it.Description ?? ""),
  address: String(it.address ?? it.Address ?? ""),
  districtName: String(it.districtName ?? it.DistrictName ?? ""),
  provinceName: String(it.provinceName ?? it.ProvinceName ?? ""),
  pricePerNight: Number(
    it.pricePerNight ?? it.PricePerNight ?? it.price ?? it.Price ?? 0,
  ),
  maxGuests: Number(it.maxGuests ?? it.MaxGuests ?? 1),
  bedrooms: Number(it.bedrooms ?? it.Bedrooms ?? 0),
  bathrooms: Number(it.bathrooms ?? it.Bathrooms ?? 0),
  images: (it.images ??
    it.Images ??
    it.ImageUrls ??
    it.imageUrls ??
    it.ImageUrl ??
    []) as string[],
  amenities: (it.amenities ??
    it.Amenities ??
    it.AmenityNames ??
    it.amenityNames ??
    []) as string[],
  averageRating: Number(
    it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
  ),
  reviewCount: Number(it.reviewCount ?? it.ReviewCount ?? 0),
});

export const wishlistService = {
  async getMyWishlist(): Promise<Homestay[]> {
    try {
      const res = await apiClient.get<unknown>(
        apiConfig.endpoints.wishlist.list,
      );

      const list = extractArray<Record<string, unknown>>(res);

      const mapped = list.map(mapHomestay);

      // Enrich with full details - with timeout to avoid hanging
      const enriched = await Promise.allSettled(
        mapped.map(async (h) => {
          try {
            // Set 5 second timeout for enrichment
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Enrichment timeout")), 5000),
            );

            const full = (await Promise.race([
              publicHomestayService.getById(h.id),
              timeoutPromise,
            ])) as Homestay | null;

            if (!full) {
              return h;
            }

            // Merge: start with mapped data, overwrite with enriched data
            const merged: Homestay = {
              ...h,
              id: full.id ?? h.id,
              name: full.name ?? h.name,
              description: full.description ?? h.description,
              address: full.address ?? h.address,
              districtName: full.districtName ?? h.districtName,
              provinceName: full.provinceName ?? h.provinceName,
              pricePerNight: full.pricePerNight ?? h.pricePerNight,
              maxGuests: full.maxGuests ?? h.maxGuests,
              bedrooms: full.bedrooms ?? h.bedrooms,
              bathrooms: full.bathrooms ?? h.bathrooms,
              images:
                full.images && full.images.length > 0
                  ? full.images
                  : (h.images ?? []),
              amenities:
                full.amenities && full.amenities.length > 0
                  ? full.amenities
                  : (h.amenities ?? []),
              averageRating: full.averageRating ?? h.averageRating ?? 0,
              reviewCount: full.reviewCount ?? h.reviewCount ?? 0,
            };

            return merged;
          } catch (err) {
            return h;
          }
        }),
      );

      // Extract results, filtering out rejected promises
      const finalList = enriched.map((result, index) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          return mapped[index]; // Use mapped as fallback
        }
      });

      return finalList;
    } catch (error) {
      return [];
    }
  },

  async add(homestayId: string) {
    try {
      const result = await apiClient.post(
        apiConfig.endpoints.wishlist.add(homestayId),
      );
      return result;
    } catch (error) {
      throw error;
    }
  },

  async remove(homestayId: string) {
    try {
      const result = await apiClient.delete(
        apiConfig.endpoints.wishlist.remove(homestayId),
      );
      return result;
    } catch (error) {
      throw error;
    }
  },

  /** GET /api/recently-viewed */
  async getRecentlyViewed(): Promise<Homestay[]> {
    try {
      const res = await apiClient.get<unknown>(
        apiConfig.endpoints.wishlist.recentlyViewed,
      );
      const list = extractArray<Record<string, unknown>>(res);
      return list.map(mapHomestay);
    } catch (error) {
      return [];
    }
  },

  /**
   * POST /api/public/homestays/compare
   * So sánh 2-4 homestay với AI phân tích
   */
  async compareHomestays(
    homestayIds: string[],
    customerPreferences?: string,
  ): Promise<CompareResult> {
    const res = await apiClient.post<any>(apiConfig.endpoints.compare.homestays, {
      HomestayIds: homestayIds,
      CustomerPreferences: customerPreferences ?? null,
    });
    const data = res?.data ?? res;
    return {
      homestaysData: Array.isArray(data?.homestaysData ?? data?.HomestaysData)
        ? (data?.homestaysData ?? data?.HomestaysData).map(mapHomestay)
        : [],
      aiAnalysisMarkdown: String(data?.aiAnalysisMarkdown ?? data?.AiAnalysisMarkdown ?? ""),
      scores: Array.isArray(data?.scores ?? data?.Scores)
        ? (data?.scores ?? data?.Scores).map((s: any) => ({
            homestayId: String(s?.homestayId ?? s?.HomestayId ?? ""),
            homestayName: String(s?.homestayName ?? s?.HomestayName ?? ""),
            matchScore: Number(s?.matchScore ?? s?.MatchScore ?? 0),
            priceScore: Number(s?.priceScore ?? s?.PriceScore ?? 0),
            amenityScore: Number(s?.amenityScore ?? s?.AmenityScore ?? 0),
            locationScore: Number(s?.locationScore ?? s?.LocationScore ?? 0),
          }))
        : [],
    };
  },
};
