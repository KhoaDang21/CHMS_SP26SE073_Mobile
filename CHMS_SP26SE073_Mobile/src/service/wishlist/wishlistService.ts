import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";
import type { Homestay } from "@/types";
import { publicHomestayService } from "@/service/homestay/publicHomestayService";

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
});

export const wishlistService = {
  async getMyWishlist(): Promise<Homestay[]> {
    const res = await apiClient.get<any>(apiConfig.endpoints.wishlist.list);
    const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    const mapped = list.map(mapHomestay);
    const enriched = await Promise.all(
      mapped.map(async (h) => (await publicHomestayService.getById(h.id)) || h),
    );
    return enriched;
  },
  async add(homestayId: string) {
    await apiClient.post(apiConfig.endpoints.wishlist.add(homestayId));
  },
  async remove(homestayId: string) {
    await apiClient.delete(apiConfig.endpoints.wishlist.remove(homestayId));
  },
};
