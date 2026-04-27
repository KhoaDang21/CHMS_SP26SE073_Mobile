import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

type AnyRecord = Record<string, any>;

const pick = (obj: AnyRecord, ...keys: string[]) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
};

const asStr = (v: any) => (v === undefined || v === null ? "" : String(v));

const normalizeTime = (v: any): string => {
  const raw = asStr(v).trim();
  if (!raw) return "";
  if (/^\d{1,2}:\d{2}$/.test(raw)) return `${raw}:00`;
  return raw;
};

const unwrapData = (raw: unknown): any => {
  const r = raw as AnyRecord;
  return r?.data ?? r?.Data ?? r;
};

const unwrapArray = (raw: unknown): any[] => {
  const payload = unwrapData(raw);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.Items)) return payload.Items;
  return [];
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type DiningCombo = {
  id: string;
  homestayId: string;
  name: string;
  description: string;
  price: number;
  maxPeople: number;
  imageUrl?: string;
  isActive: boolean;
};

export type AvailableTimeSlot = {
  id: string;
  startTime: string;
  remainingCapacity: number;
  isAvailable: boolean;
  disableReason?: string;
};

export type DiningOrder = {
  id: string;
  comboName: string;
  imageUrl?: string;
  orderDate: string;
  startTime: string;
  endTime?: string;
  serveLocation: string;
  status: string;
  price: number;
  paymentStatus: string;
  note?: string;
};

export type ServeLocation = "ROOM" | "BEACH";

// ─── Mappers ──────────────────────────────────────────────────────────────────

const mapCombo = (item: AnyRecord): DiningCombo => ({
  id: asStr(pick(item, "id", "Id")),
  homestayId: asStr(pick(item, "homestayId", "HomestayId")),
  name: asStr(pick(item, "name", "Name")),
  description: asStr(pick(item, "description", "Description")),
  price: Number(pick(item, "price", "Price") ?? 0),
  maxPeople: Number(pick(item, "maxPeople", "MaxPeople") ?? 0),
  imageUrl: pick(item, "imageUrl", "ImageUrl"),
  isActive: Boolean(pick(item, "isActive", "IsActive") ?? false),
});

const mapSlot = (item: AnyRecord): AvailableTimeSlot => ({
  id: asStr(pick(item, "id", "Id")),
  startTime: normalizeTime(pick(item, "startTime", "StartTime")),
  remainingCapacity: Number(pick(item, "remainingCapacity", "RemainingCapacity") ?? 0),
  isAvailable: Boolean(pick(item, "isAvailable", "IsAvailable") ?? false),
  disableReason: pick(item, "disableReason", "DisableReason"),
});

const mapOrder = (item: AnyRecord): DiningOrder => ({
  id: asStr(pick(item, "id", "Id")),
  comboName: asStr(pick(item, "comboName", "ComboName")),
  imageUrl: pick(item, "imageUrl", "ImageUrl"),
  orderDate: asStr(pick(item, "orderDate", "OrderDate")),
  startTime: normalizeTime(pick(item, "startTime", "StartTime")),
  endTime: normalizeTime(pick(item, "endTime", "EndTime")),
  serveLocation: asStr(pick(item, "serveLocation", "ServeLocation")),
  status: asStr(pick(item, "status", "Status")),
  price: Number(pick(item, "price", "Price") ?? 0),
  paymentStatus: asStr(pick(item, "paymentStatus", "PaymentStatus")),
  note: pick(item, "note", "Note"),
});

// ─── Service ──────────────────────────────────────────────────────────────────

export const diningService = {
  /** GET /api/customer/dining/homestays/:id/combos — AllowAnonymous */
  async getCombos(homestayId: string): Promise<DiningCombo[]> {
    try {
      const res = await apiClient.get(
        apiConfig.endpoints.dining.combosByHomestay(homestayId),
      );
      return unwrapArray(res).map(mapCombo);
    } catch {
      return [];
    }
  },

  /** GET /api/customer/dining/homestays/:id/slots?date=YYYY-MM-DD */
  async getAvailableSlots(homestayId: string, date: string): Promise<AvailableTimeSlot[]> {
    try {
      const res = await apiClient.get(
        apiConfig.endpoints.dining.availableSlots(homestayId),
        { date },
      );
      return unwrapArray(res).map(mapSlot);
    } catch {
      return [];
    }
  },

  /** POST /api/customer/dining/order */
  async createOrder(payload: {
    bookingId: string;
    comboId: string;
    timeSlotId: string;
    orderDate: string;
    serveLocation: ServeLocation;
    note?: string;
  }): Promise<{ success: boolean; message: string; data?: DiningOrder }> {
    try {
      const res = await apiClient.post<AnyRecord>(
        apiConfig.endpoints.dining.createOrder,
        {
          bookingId: payload.bookingId,
          comboId: payload.comboId,
          timeSlotId: payload.timeSlotId,
          orderDate: payload.orderDate,
          serveLocation: payload.serveLocation,
          paymentStatus: "CHARGE_TO_ROOM",
          note: payload.note,
        },
      );
      const data = unwrapData(res);
      return {
        success: true,
        message: asStr((res as AnyRecord)?.message ?? "Đặt món thành công!"),
        data: data ? mapOrder(data) : undefined,
      };
    } catch (e: any) {
      return { success: false, message: e?.message ?? "Không thể đặt món" };
    }
  },

  /** PATCH /api/customer/dining/orders/:id/cancel */
  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.patch<AnyRecord>(
        apiConfig.endpoints.dining.cancelOrder(orderId),
        {},
      );
      return {
        success: true,
        message: asStr((res as AnyRecord)?.message ?? "Đã hủy món"),
      };
    } catch (e: any) {
      return { success: false, message: e?.message ?? "Không thể hủy món" };
    }
  },
};
