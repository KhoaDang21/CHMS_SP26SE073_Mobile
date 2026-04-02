import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";
import type { Homestay } from "@/types";

const mapHomestay = (it: any): Homestay => ({
  id: String(it.id ?? it.Id ?? ""),
  name: it.name ?? it.Name ?? "",
  description: it.description ?? it.Description ?? "",
  address: it.address ?? it.Address ?? "",
  districtName: it.districtName ?? it.DistrictName ?? "",
  provinceName: it.provinceName ?? it.ProvinceName ?? "",
  pricePerNight: Number(it.pricePerNight ?? it.PricePerNight ?? 0),
  maxGuests: Number(it.maxGuests ?? it.MaxGuests ?? 1),
  bedrooms: Number(it.bedrooms ?? it.Bedrooms ?? 0),
  bathrooms: Number(it.bathrooms ?? it.Bathrooms ?? 0),
  images: it.images ?? it.ImageUrls ?? it.imageUrls ?? [],
  amenities: it.amenities ?? it.AmenityNames ?? [],
  ownerName: it.ownerName ?? it.OwnerName ?? "",
  depositPercentage: it.depositPercentage ?? it.DepositPercentage ?? 50,
  averageRating: it.averageRating ?? it.AverageRating ?? undefined,
  reviewCount: it.reviewCount ?? it.ReviewCount ?? undefined,
});

export interface HomestayFilters {
  province?: string;
  district?: string;
  checkIn?: string;
  checkOut?: string;
  guestsCount?: number;
  minPrice?: number;
  maxPrice?: number;
}

export const publicHomestayService = {
  async list(filters?: HomestayFilters): Promise<Homestay[]> {
    const params = new URLSearchParams();
    if (filters?.province) params.append("province", filters.province);
    if (filters?.district) params.append("district", filters.district);
    if (filters?.checkIn) params.append("checkIn", filters.checkIn);
    if (filters?.checkOut) params.append("checkOut", filters.checkOut);
    if (filters?.guestsCount)
      params.append("guestsCount", String(filters.guestsCount));
    if (filters?.minPrice) params.append("minPrice", String(filters.minPrice));
    if (filters?.maxPrice) params.append("maxPrice", String(filters.maxPrice));

    const url = params.toString()
      ? `${apiConfig.endpoints.homestays.list}?${params.toString()}`
      : apiConfig.endpoints.homestays.list;
    const res = await apiClient.get<any>(url);
    const raw =
      res?.data?.items ?? res?.data?.Items ?? res?.items ?? res?.Items ?? [];
    return (Array.isArray(raw) ? raw : []).map(mapHomestay);
  },
  async getById(id: string): Promise<Homestay | null> {
    const res = await apiClient.get<any>(
      apiConfig.endpoints.homestays.detail(id),
    );
    const item = res?.data ?? res;
    if (!item) return null;
    return mapHomestay(item);
  },
  async getPublicReviews(homestayId: string): Promise<any[]> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.publicHomestays.reviews(homestayId),
      );
      const reviews = res?.data ?? res?.data?.reviews ?? res?.reviews ?? [];
      return Array.isArray(reviews) ? reviews : [];
    } catch {
      return [];
    }
  },
};
