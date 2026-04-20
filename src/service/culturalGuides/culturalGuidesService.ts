import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface CulturalGuide {
  id: string;
  title: string;
  description: string;
  content?: string;
  location?: string;
  locationId?: string;
  homestayId?: string;
  type?: string;
  author?: string;
  rating?: number;
  views?: number;
  status?: string;
  image?: string;
  imageUrls?: string[];
  createdAt?: string;
}

export interface CreateGuidePayload {
  homestayId?: string;
  title: string;
  content?: string;
  type?: string;
  imageUris?: string[];
}

const splitImageUrls = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map((i) => String(i || "").trim()).filter(Boolean);
  const value = String(raw || "").trim();
  if (!value) return [];
  return value.split("|").map((u) => u.trim()).filter(Boolean);
};

const mapGuide = (item: any): CulturalGuide => {
  const imageUrls = splitImageUrls(
    item?.imageUrls ?? item?.ImageUrls ?? item?.imageUrl ?? item?.ImageUrl ?? item?.image ?? item?.Image,
  );
  const content = item?.content ?? item?.Content ?? item?.description ?? item?.Description ?? "";
  return {
    id: item?.id ?? item?.Id ?? "",
    title: item?.title ?? item?.Title ?? "",
    description: content,
    content,
    location: item?.location ?? item?.Location ?? item?.locationName ?? item?.LocationName ?? "",
    locationId: item?.locationId ?? item?.LocationId,
    homestayId: item?.homestayId ?? item?.HomestayId,
    type: item?.type ?? item?.Type ?? "",
    author: item?.author ?? item?.authorName ?? item?.customerName ?? item?.AuthorName ?? "",
    rating: Number(item?.rating ?? item?.Rating ?? 0),
    views: Number(item?.views ?? item?.Views ?? 0),
    status: item?.status ?? item?.Status ?? "PUBLISHED",
    image: imageUrls[0] ?? "",
    imageUrls,
    createdAt: item?.createdAt ?? item?.CreatedAt ?? item?.submittedAt ?? "",
  };
};

const unwrapList = (response: any): any[] => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const unwrapItem = (response: any): any =>
  response?.data ?? response?.result ?? response ?? null;

export const culturalGuidesService = {
  async getPublicGuides(type?: string): Promise<CulturalGuide[]> {
    try {
      const params: Record<string, string> = {};
      if (type && type !== "all") params.type = type;
      const response = await apiClient.get<any>(
        apiConfig.endpoints.culturalGuides.publicList,
        params,
      );
      return unwrapList(response).map(mapGuide);
    } catch {
      return [];
    }
  },

  async getGuideDetail(id: string): Promise<CulturalGuide | null> {
    try {
      const response = await apiClient.get<any>(
        apiConfig.endpoints.culturalGuides.publicDetail(id),
      );
      const data = unwrapItem(response);
      return data ? mapGuide(data) : null;
    } catch {
      return null;
    }
  },

  async getMyGuides(): Promise<CulturalGuide[]> {
    try {
      const response = await apiClient.get<any>(
        apiConfig.endpoints.culturalGuides.customerMyGuides,
      );
      return unwrapList(response).map(mapGuide);
    } catch {
      return [];
    }
  },

  async createGuide(
    payload: CreateGuidePayload,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const formData = new FormData();
      if (payload.homestayId) formData.append("homestayId", payload.homestayId);
      formData.append("title", payload.title);
      formData.append("content", payload.content ?? "");
      if (payload.type) formData.append("type", payload.type);
      if (payload.imageUris?.length) {
        payload.imageUris.forEach((uri, idx) => {
          const ext = uri.split(".").pop() ?? "jpg";
          formData.append("imageFiles", {
            uri,
            name: `image_${idx}.${ext}`,
            type: `image/${ext === "jpg" ? "jpeg" : ext}`,
          } as any);
        });
      }

      const token = await import("@/service/auth/tokenStorage").then((m) =>
        m.tokenStorage.getToken(),
      );
      const url = `${apiConfig.baseURL}${apiConfig.endpoints.culturalGuides.customerCreate}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: data?.message ?? `HTTP ${res.status}` };
      }
      return { success: true, message: data?.message ?? "Đăng bài thành công!" };
    } catch (e: any) {
      return { success: false, message: e?.message ?? "Lỗi khi đăng bài" };
    }
  },
};
