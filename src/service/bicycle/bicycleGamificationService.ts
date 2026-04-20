import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

type AnyRecord = Record<string, any>;

const unwrapData = <T>(raw: unknown): T => {
  const response = raw as AnyRecord;
  return (response?.data ?? response?.Data ?? response) as T;
};

const unwrapArray = <T>(raw: unknown): T[] => {
  const payload = unwrapData<any>(raw);
  if (Array.isArray(payload)) return payload as T[];
  if (Array.isArray(payload?.items)) return payload.items as T[];
  if (Array.isArray(payload?.Items)) return payload.Items as T[];
  return [];
};

export type BicycleRoute = {
  id: string;
  routeName: string;
  description?: string;
  totalDistanceKm?: number;
  estimatedMinutes?: number;
  hiddenGems: {
    id: string;
    name: string;
    description?: string;
    latitude: number;
    longitude: number;
    rewardPoints: number;
  }[];
};

export type GameStatus = {
  totalPoints: number;
  checkedInGemIds: string[];
  history: { hiddenGemId: string; checkInTime: string; pointsEarned: number }[];
};

export type CurrentRental = {
  id: string;
  startTime: string;
  bicycleCode: string;
  bicycleType: string;
  pricePerDay: number;
};

export const bicycleGamificationService = {
  async getRoutes(homestayId: string): Promise<BicycleRoute[]> {
    if (!homestayId) return [];
    try {
      const res = await apiClient.get(apiConfig.endpoints.gamificationBicycles.routes(homestayId));
      return unwrapArray<BicycleRoute>(res);
    } catch {
      return [];
    }
  },

  async getStatus(bookingId: string): Promise<GameStatus | null> {
    if (!bookingId) return null;
    try {
      const res = await apiClient.get(apiConfig.endpoints.gamificationBicycles.status(bookingId));
      const data = unwrapData<GameStatus | null>(res);
      return data ?? null;
    } catch {
      return null;
    }
  },

  async getMyRental(bookingId: string): Promise<CurrentRental | null> {
    if (!bookingId) return null;
    try {
      const res = await apiClient.get(apiConfig.endpoints.gamificationBicycles.myRental(bookingId));
      const data = unwrapData<CurrentRental | null>(res);
      return data ?? null;
    } catch {
      return null;
    }
  },

  async checkIn(payload: {
    bookingId: string;
    hiddenGemId: string;
    currentLatitude: number;
    currentLongitude: number;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post<AnyRecord>(apiConfig.endpoints.gamificationBicycles.checkIn, payload);
      const msg =
        res?.data?.message ??
        res?.data?.Message ??
        res?.message ??
        res?.Message ??
        "Check-in thành công!";
      return { success: true, message: String(msg) };
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Không thể check-in. Vui lòng thử lại.";
      return { success: false, message: msg };
    }
  },
};

