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
});

export const publicHomestayService = {
  async list(): Promise<Homestay[]> {
    const res = await apiClient.get<any>(apiConfig.endpoints.homestays.list);
    const raw = res?.data?.items ?? res?.data?.Items ?? res?.items ?? res?.Items ?? [];
    return (Array.isArray(raw) ? raw : []).map(mapHomestay);
  },
  async getById(id: string): Promise<Homestay | null> {
    const res = await apiClient.get<any>(apiConfig.endpoints.homestays.detail(id));
    const item = res?.data ?? res;
    if (!item) return null;
    return mapHomestay(item);
  },
};
