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
  city: String(it.city ?? it.City ?? ""),
  country: String(it.country ?? it.Country ?? ""),
  latitude: Number(it.latitude ?? it.Latitude ?? 0) || undefined,
  longitude: Number(it.longitude ?? it.Longitude ?? 0) || undefined,
  pricePerNight: Number(
    it.pricePerNight ?? it.PricePerNight ?? it.price ?? it.Price ?? 0,
  ),
  maxGuests: Number(it.maxGuests ?? it.MaxGuests ?? 1),
  bedrooms: Number(it.bedrooms ?? it.Bedrooms ?? 0),
  bathrooms: Number(it.bathrooms ?? it.Bathrooms ?? 0),
  area: Number(it.area ?? it.Area ?? 0) || undefined,
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
  amenityIds: (it.amenityIds ?? it.AmenityIds ?? []) as string[],
  averageRating: Number(
    it.averageRating ?? it.AverageRating ?? it.rating ?? it.Rating ?? 0,
  ),
  reviewCount: Number(
    it.reviewCount ?? it.ReviewCount ?? it.totalReviews ?? it.TotalReviews ?? 0,
  ),
  ownerId: String(it.ownerId ?? it.OwnerId ?? ""),
  ownerName: String(it.ownerName ?? it.OwnerName ?? ""),
  status: String(it.status ?? it.Status ?? "ACTIVE"),
  depositPercentage: Number(it.depositPercentage ?? it.DepositPercentage ?? 20),
  cancellationPolicy: String(
    it.cancellationPolicy ?? it.CancellationPolicy ?? "",
  ),
  houseRules: String(it.houseRules ?? it.HouseRules ?? ""),
  createdAt: String(it.createdAt ?? it.CreatedAt ?? ""),
  updatedAt: String(it.updatedAt ?? it.UpdatedAt ?? ""),
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
              city: full.city ?? h.city,
              country: full.country ?? h.country,
              latitude: full.latitude ?? h.latitude,
              longitude: full.longitude ?? h.longitude,
              pricePerNight: full.pricePerNight ?? h.pricePerNight,
              maxGuests: full.maxGuests ?? h.maxGuests,
              bedrooms: full.bedrooms ?? h.bedrooms,
              bathrooms: full.bathrooms ?? h.bathrooms,
              area: full.area ?? h.area,
              images:
                full.images && full.images.length > 0
                  ? full.images
                  : (h.images ?? []),
              amenities:
                full.amenities && full.amenities.length > 0
                  ? full.amenities
                  : (h.amenities ?? []),
              amenityIds: full.amenityIds ?? h.amenityIds,
              ownerId: full.ownerId ?? h.ownerId,
              ownerName: full.ownerName ?? h.ownerName,
              status: full.status ?? h.status,
              depositPercentage: full.depositPercentage ?? h.depositPercentage,
              cancellationPolicy:
                full.cancellationPolicy ?? h.cancellationPolicy,
              houseRules: full.houseRules ?? h.houseRules,
              averageRating: full.averageRating ?? h.averageRating ?? 0,
              reviewCount: full.reviewCount ?? h.reviewCount ?? 0,
              seasonalPricings: full.seasonalPricings ?? h.seasonalPricings,
              createdAt: full.createdAt ?? h.createdAt,
              updatedAt: full.updatedAt ?? h.updatedAt,
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
    // Filter and prepare payload (align with web)
    const payload = {
      homestayIds: homestayIds.filter((id) => id?.trim()),
      customerPreferences: customerPreferences?.trim() || undefined,
    };

    const res = await apiClient.post<any>(
      apiConfig.endpoints.compare.homestays,
      payload,
    );
    const data = res?.data ?? res;

    // Handle multiple response shapes (align with web)
    const rawList: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.homestaysData ?? data?.HomestaysData)
        ? (data?.homestaysData ?? data?.HomestaysData)
        : Array.isArray(data?.items ?? data?.Items)
          ? (data?.items ?? data?.Items)
          : [];

    const aiAnalysisMarkdown =
      data?.aiAnalysisMarkdown ?? data?.AiAnalysisMarkdown ?? "";

    const rawScores: any[] = Array.isArray(data?.scores ?? data?.Scores)
      ? (data?.scores ?? data?.Scores)
      : [];

    return {
      homestaysData: rawList.map(mapHomestay),
      aiAnalysisMarkdown: String(aiAnalysisMarkdown),
      scores: rawScores.map((s: any) => ({
        homestayId: String(s?.homestayId ?? s?.HomestayId ?? ""),
        homestayName: String(s?.homestayName ?? s?.HomestayName ?? ""),
        matchScore: Number(s?.matchScore ?? s?.MatchScore ?? 0),
        priceScore: Number(s?.priceScore ?? s?.PriceScore ?? 0),
        amenityScore: Number(s?.amenityScore ?? s?.AmenityScore ?? 0),
        locationScore: Number(s?.locationScore ?? s?.LocationScore ?? 0),
      })),
    };
  },
};
