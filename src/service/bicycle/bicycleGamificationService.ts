import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

type AnyRecord = Record<string, any>;

// BE trả PascalCase, unwrap cả hai case
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

// Normalize PascalCase → camelCase cho object từ BE
const normalize = <T>(obj: AnyRecord): T => {
  if (!obj || typeof obj !== "object") return obj as unknown as T;
  const result: AnyRecord = {};
  for (const key of Object.keys(obj)) {
    const camel = key.charAt(0).toLowerCase() + key.slice(1);
    const val = obj[key];
    if (Array.isArray(val)) {
      result[camel] = val.map((item) =>
        typeof item === "object" && item !== null ? normalize(item) : item,
      );
    } else if (val && typeof val === "object") {
      result[camel] = normalize(val);
    } else {
      result[camel] = val;
    }
  }
  return result as T;
};

// ─── Types khớp với BE response ───────────────────────────────────────────────

export type HiddenGem = {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  rewardPoints: number;
};

export type BicycleRoute = {
  id: string;
  routeName: string;
  description?: string;
  totalDistanceKm?: number;
  estimatedMinutes?: number;
  polylineMap?: string;
  hiddenGems: HiddenGem[];
};

export type CheckInHistoryItem = {
  hiddenGemId: string;
  checkInTime: string;
  pointsEarned: number;
};

export type GameStatus = {
  totalPoints: number;
  checkedInGemIds: string[];
  history: CheckInHistoryItem[];
};

export type CurrentRental = {
  id: string;
  startTime: string;
  bicycleCode: string;
  bicycleType: string;
  pricePerDay: number;
};

export type CheckInPayload = {
  bookingId: string;
  hiddenGemId?: string;
  currentLatitude: number;
  currentLongitude: number;
};

export type CheckInResult = {
  success: boolean;
  message: string;
  distance?: number;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const bicycleGamificationService = {
  async getRoutes(homestayId: string): Promise<BicycleRoute[]> {
    if (!homestayId) return [];
    try {
      const res = await apiClient.get(
        apiConfig.endpoints.gamificationBicycles.routes(homestayId),
      );
      const raw = unwrapArray<AnyRecord>(res);
      return raw.map((item) => {
        const r = normalize<AnyRecord>(item);
        return {
          id: r.id,
          routeName: r.routeName,
          description: r.description,
          totalDistanceKm:
            r.totalDistanceKm != null ? Number(r.totalDistanceKm) : undefined,
          estimatedMinutes:
            r.estimatedMinutes != null ? Number(r.estimatedMinutes) : undefined,
          polylineMap: r.polylineMap,
          hiddenGems: Array.isArray(r.hiddenGems)
            ? r.hiddenGems.map((g: AnyRecord) => ({
                id: g.id,
                name: g.name,
                description: g.description,
                latitude: Number(g.latitude),
                longitude: Number(g.longitude),
                rewardPoints: Number(g.rewardPoints ?? 0),
              }))
            : [],
        } satisfies BicycleRoute;
      });
    } catch {
      return [];
    }
  },

  async getStatus(bookingId: string): Promise<GameStatus | null> {
    if (!bookingId) return null;
    try {
      const res = await apiClient.get(
        apiConfig.endpoints.gamificationBicycles.status(bookingId),
      );
      const raw = unwrapData<AnyRecord>(res);
      if (!raw) return null;
      const d = normalize<AnyRecord>(raw);
      return {
        totalPoints: Number(d.totalPoints ?? 0),
        // BE trả mảng Guid objects, lấy value string
        checkedInGemIds: Array.isArray(d.checkedInGemIds)
          ? d.checkedInGemIds.map((id: unknown) => String(id))
          : [],
        history: Array.isArray(d.history)
          ? d.history.map((h: AnyRecord) => ({
              hiddenGemId: String(h.hiddenGemId),
              checkInTime: String(h.checkInTime),
              pointsEarned: Number(h.pointsEarned ?? 0),
            }))
          : [],
      };
    } catch {
      return null;
    }
  },

  async getMyRental(bookingId: string): Promise<CurrentRental | null> {
    if (!bookingId) return null;
    try {
      const res = await apiClient.get(
        apiConfig.endpoints.gamificationBicycles.myRental(bookingId),
      );
      const raw = unwrapData<AnyRecord>(res);
      if (!raw) return null;
      const d = normalize<AnyRecord>(raw);
      return {
        id: String(d.id),
        startTime: String(d.startTime),
        bicycleCode: String(d.bicycleCode ?? ""),
        bicycleType: String(d.bicycleType ?? ""),
        // decimal từ BE có thể về dạng string → ép Number, fallback 0
        pricePerDay: Number(d.pricePerDay ?? 0),
      };
    } catch {
      return null;
    }
  },

  async checkIn(payload: CheckInPayload): Promise<CheckInResult> {
    try {
      // build body but omit hiddenGemId if not provided
      const body: AnyRecord = {
        bookingId: payload.bookingId,
        currentLatitude: payload.currentLatitude,
        currentLongitude: payload.currentLongitude,
      };
      if (payload.hiddenGemId) body.hiddenGemId = payload.hiddenGemId;

      const res = await apiClient.post<AnyRecord>(
        apiConfig.endpoints.gamificationBicycles.checkIn,
        body,
      );
      // BE trả { Success, Message, Distance } (PascalCase)
      const raw = unwrapData<AnyRecord>(res);
      const d = normalize<AnyRecord>(raw ?? (res as AnyRecord));
      const msg =
        d?.message ??
        (res as AnyRecord)?.message ??
        (res as AnyRecord)?.Message ??
        "Check-in thành công!";
      return {
        success: true,
        message: String(msg),
        distance: d?.distance != null ? Number(d.distance) : undefined,
      };
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Không thể check-in. Vui lòng thử lại.";
      return { success: false, message: msg };
    }
  },
};
