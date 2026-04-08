import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";
import type { Booking, BookingStatus } from "@/types";

const normalizeStatus = (raw: unknown): BookingStatus => {
  const v = String(raw || "").toUpperCase();
  if (v === "CONFIRMED") return "CONFIRMED";
  if (v === "CANCELLED") return "CANCELLED";
  if (v === "COMPLETED") return "COMPLETED";
  if (v === "REJECTED") return "REJECTED";
  if (v === "CHECKED_IN") return "CHECKED_IN";
  return "PENDING";
};

const mapBooking = (item: Record<string, unknown>): Booking => ({
  id: String(item.id ?? item.Id ?? ""),
  homestayId: String(item.homestayId ?? item.HomestayId ?? ""),
  homestayName: (item.homestayName ?? item.HomestayName) as string | undefined,
  checkIn: String(item.checkIn ?? item.CheckIn ?? ""),
  checkOut: String(item.checkOut ?? item.CheckOut ?? ""),
  guestsCount: Number(item.guestsCount ?? item.GuestsCount ?? 0),
  totalPrice: (item.totalPrice ?? item.TotalPrice) as number | undefined,
  depositAmount: (item.depositAmount ?? item.DepositAmount) as
    | number
    | undefined,
  remainingAmount: (item.remainingAmount ?? item.RemainingAmount) as
    | number
    | undefined,
  depositPercentage: (item.depositPercentage ?? item.DepositPercentage) as
    | number
    | undefined,
  paymentStatus: (item.paymentStatus ??
    item.PaymentStatus) as Booking["paymentStatus"],
  status: normalizeStatus(item.status ?? item.Status),
  contactPhone: (item.contactPhone ?? item.ContactPhone) as string | undefined,
  specialRequests: (item.specialRequests ?? item.SpecialRequests) as
    | string
    | undefined,
  createdAt: (item.createdAt ?? item.CreatedAt) as string | undefined,
});

export const bookingService = {
  async getMyBookings(): Promise<Booking[]> {
    try {
      const res = await apiClient.get<unknown>(
        apiConfig.endpoints.bookings.list,
      );
      // Đồng bộ với FE web: check response.data là array, hoặc response là array
      // Cũng handle paged response { data: { items: [...] } }
      const r = res as any;
      let rawList: any[] = [];
      if (Array.isArray(r?.data)) {
        rawList = r.data;
      } else if (Array.isArray(r?.data?.items)) {
        rawList = r.data.items;
      } else if (Array.isArray(r?.data?.Items)) {
        rawList = r.data.Items;
      } else if (Array.isArray(r)) {
        rawList = r;
      }
      return rawList.map(mapBooking);
    } catch (_e) {
      return [];
    }
  },

  async getBookingDetail(id: string): Promise<Booking | null> {
    try {
      const res = await apiClient.get<unknown>(
        apiConfig.endpoints.bookings.detail(id),
      );
      const r = res as Record<string, unknown>;
      const raw = (r?.data ?? r) as Record<string, unknown>;
      if (!raw?.id && !raw?.Id) return null;
      return mapBooking(raw);
    } catch {
      return null;
    }
  },

  async createBooking(payload: {
    homestayId: string;
    checkIn: string;
    checkOut: string;
    guestsCount: number;
    contactPhone: string;
    specialRequests?: string;
    promotionId?: string;
  }) {
    const res = await apiClient.post<Record<string, unknown>>(
      apiConfig.endpoints.bookings.create,
      payload,
    );
    const bookingData = res?.data;
    const success = Boolean(res?.success ?? true);
    const message = String(res?.message ?? "Đặt phòng thành công!");
    return {
      success,
      message,
      data:
        bookingData &&
        typeof bookingData === "object" &&
        !Array.isArray(bookingData)
          ? mapBooking(bookingData as Record<string, unknown>)
          : undefined,
    };
  },

  async modifyBooking(
    id: string,
    payload: {
      homestayId?: string;
      checkIn?: string;
      checkOut?: string;
      guestsCount?: number;
      contactPhone?: string;
      specialRequests?: string;
      promotionId?: string;
    },
  ) {
    const res = await apiClient.put<Record<string, unknown>>(
      apiConfig.endpoints.bookings.modify(id),
      payload,
    );
    return {
      success: Boolean(res?.success ?? true),
      message: String(res?.message ?? "Cập nhật booking thành công"),
      data:
        res?.data && typeof res.data === "object" && !Array.isArray(res.data)
          ? mapBooking(res.data as Record<string, unknown>)
          : undefined,
    };
  },

  async cancelBooking(id: string) {
    const res = await apiClient.post<Record<string, unknown>>(
      apiConfig.endpoints.bookings.cancel(id),
    );
    return {
      success: Boolean(res?.success ?? true),
      message: String(res?.message ?? "Đã hủy booking"),
    };
  },

  async getCancellationPolicy(id: string): Promise<unknown> {
    try {
      const res = await apiClient.get<unknown>(
        apiConfig.endpoints.bookings.cancellationPolicy(id),
      );
      const r = res as Record<string, unknown>;
      return r?.data ?? res;
    } catch {
      return null;
    }
  },

  /** POST /api/bookings/calculate — tính giá trước khi đặt */
  async calculate(payload: {
    homestayId: string;
    checkIn: string;
    checkOut: string;
    guestsCount: number;
    promotionId?: string;
    experienceIds?: string[];
  }): Promise<number | null> {
    try {
      const res = await apiClient.post<Record<string, unknown>>(
        apiConfig.endpoints.bookings.calculate,
        payload,
      );
      const price = (res as any)?.data ?? res;
      return typeof price === "number" ? price : null;
    } catch {
      return null;
    }
  },

  /** POST /api/bookings/:id/special-requests — BE nhận raw string */
  async updateSpecialRequests(
    id: string,
    specialRequests: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post<Record<string, unknown>>(
        apiConfig.endpoints.bookings.specialRequests(id),
        specialRequests,
      );
      return {
        success: Boolean((res as any)?.success ?? true),
        message: String(
          (res as any)?.message ?? "Đã ghi nhận yêu cầu đặc biệt.",
        ),
      };
    } catch (e: any) {
      return { success: false, message: e?.message ?? "Đã xảy ra lỗi." };
    }
  },
};
