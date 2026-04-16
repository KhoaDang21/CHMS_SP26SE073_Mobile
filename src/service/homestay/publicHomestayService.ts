import { apiClient } from "@/service/api/apiClient";
import { extractPagedItems } from "@/service/api/responseHelpers";
import { apiConfig } from "@/service/constants/apiConfig";
import type { Homestay } from "@/types";

const mapHomestay = (it: Record<string, unknown>): Homestay => ({
  id: String(it.id ?? it.Id ?? ""),
  name: String(it.name ?? it.Name ?? ""),
  description: String(it.description ?? it.Description ?? ""),
  address: String(it.address ?? it.Address ?? ""),
  districtName: String(it.districtName ?? it.DistrictName ?? ""),
  provinceName: String(it.provinceName ?? it.ProvinceName ?? ""),
  pricePerNight: Number(it.pricePerNight ?? it.PricePerNight ?? it.price ?? 0),
  maxGuests: Number(it.maxGuests ?? it.MaxGuests ?? 1),
  bedrooms: Number(it.bedrooms ?? it.Bedrooms ?? 0),
  bathrooms: Number(it.bathrooms ?? it.Bathrooms ?? 0),
  images: (it.images ?? it.ImageUrls ?? it.imageUrls ?? []) as string[],
  amenities: (it.amenities ??
    it.AmenityNames ??
    it.amenityNames ??
    []) as string[],
  ownerName: String(it.ownerName ?? it.OwnerName ?? ""),
  depositPercentage: Number(it.depositPercentage ?? it.DepositPercentage ?? 20),
  averageRating:
    it.averageRating != null || it.AverageRating != null
      ? Number(it.averageRating ?? it.AverageRating)
      : it.rating != null || it.Rating != null
        ? Number(it.rating ?? it.Rating)
        : undefined,
  reviewCount:
    it.reviewCount != null || it.ReviewCount != null
      ? Number(it.reviewCount ?? it.ReviewCount)
      : undefined,
  seasonalPricings: Array.isArray(it.seasonalPricings ?? it.SeasonalPricings)
    ? (it.seasonalPricings ?? it.SeasonalPricings).map((sp: any) => ({
        id: String(sp?.id ?? sp?.Id ?? ""),
        name: String(sp?.name ?? sp?.Name ?? ""),
        startDate: String(sp?.startDate ?? sp?.StartDate ?? ""),
        endDate: String(sp?.endDate ?? sp?.EndDate ?? ""),
        price: Number(sp?.price ?? sp?.Price ?? 0),
        description: String(sp?.description ?? sp?.Description ?? ""),
        status: String(sp?.status ?? sp?.Status ?? "ACTIVE"),
      }))
    : undefined,
});

export interface HomestayFilters {
  province?: string;
  district?: string;
  checkIn?: string;
  checkOut?: string;
  guestsCount?: number;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

const reviewSummaryCache = new Map<string, { avg: number; count: number }>();

/** Align with FE HomestayCard.fetchReviewSummary */
export async function fetchReviewSummary(
  homestayId: string,
): Promise<{ avg: number; count: number }> {
  if (reviewSummaryCache.has(homestayId))
    return reviewSummaryCache.get(homestayId)!;
  try {
    const res = await apiClient.get<unknown>(
      apiConfig.endpoints.publicHomestays.reviews(homestayId),
    );
    const list = Array.isArray((res as any)?.data)
      ? (res as any).data
      : Array.isArray(res)
        ? res
        : [];
    if (!list.length) {
      const empty = { avg: 0, count: 0 };
      reviewSummaryCache.set(homestayId, empty);
      return empty;
    }
    const avg =
      list.reduce(
        (s: number, r: { rating?: number }) => s + (Number(r?.rating) || 0),
        0,
      ) / list.length;
    const summary = { avg: Math.round(avg * 10) / 10, count: list.length };
    reviewSummaryCache.set(homestayId, summary);
    return summary;
  } catch {
    return { avg: 0, count: 0 };
  }
}

export const publicHomestayService = {
  /**
   * GET /api/homestays — paged list (FE passes page, pageSize).
   */
  async list(filters?: HomestayFilters): Promise<Homestay[]> {
    const params: Record<string, string | number> = {
      page: filters?.page ?? 1,
      pageSize: filters?.pageSize ?? 100,
    };
    if (filters?.province) params.province = filters.province;
    if (filters?.district) params.district = filters.district;
    if (filters?.checkIn) params.checkIn = filters.checkIn;
    if (filters?.checkOut) params.checkOut = filters.checkOut;
    if (filters?.guestsCount != null) params.guestsCount = filters.guestsCount;
    if (filters?.minPrice != null) params.minPrice = filters.minPrice;
    if (filters?.maxPrice != null) params.maxPrice = filters.maxPrice;

    const res = await apiClient.get<unknown>(
      apiConfig.endpoints.homestays.list,
      params,
    );
    const raw = extractPagedItems(res);
    return raw.map((it) => mapHomestay(it as Record<string, unknown>));
  },

  async getById(id: string): Promise<Homestay | null> {
    const res = await apiClient.get<unknown>(
      apiConfig.endpoints.homestays.detail(id),
    );
    const r = res as Record<string, unknown>;
    const payload = (r?.data ?? r) as Record<string, unknown> | undefined;
    if (!payload || typeof payload !== "object") return null;
    const it = (payload.item ??
      payload.Item ??
      payload.data ??
      payload) as Record<string, unknown>;
    if (!it || (it.id == null && it.Id == null)) return null;
    return mapHomestay(it);
  },

  async getPublicReviews(homestayId: string): Promise<unknown[]> {
    try {
      const res = await apiClient.get<unknown>(
        apiConfig.endpoints.publicHomestays.reviews(homestayId),
      );
      const reviews = (res as any)?.data ?? (res as any)?.reviews ?? [];
      return Array.isArray(reviews) ? reviews : [];
    } catch {
      return [];
    }
  },
};
