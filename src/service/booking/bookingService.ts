import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";
import type { Booking } from "@/types";

const mapBooking = (item: any): Booking => ({
  id: item.id,
  homestayId: item.homestayId,
  homestayName: item.homestayName,
  checkIn: item.checkIn,
  checkOut: item.checkOut,
  guestsCount: item.guestsCount,
  totalPrice: item.totalPrice,
  depositAmount: item.depositAmount,
  remainingAmount: item.remainingAmount,
  paymentStatus: item.paymentStatus,
  status: String(item.status || "PENDING").toUpperCase() as Booking["status"],
  contactPhone: item.contactPhone,
  specialRequests: item.specialRequests,
  createdAt: item.createdAt,
});

export const bookingService = {
  async getMyBookings(): Promise<Booking[]> {
    const res = await apiClient.get<any>(apiConfig.endpoints.bookings.list);
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map(mapBooking);
  },
  async getBookingDetail(id: string): Promise<Booking | null> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.bookings.detail(id),
      );
      const item = res?.data ?? res;
      if (!item) return null;
      return mapBooking(item);
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
  }) {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.bookings.create,
      payload,
    );
    return {
      success: Boolean(res?.success ?? true),
      message: res?.message ?? "Dat phong thanh cong",
      data: res?.data ? mapBooking(res.data) : undefined,
    };
  },
  async modifyBooking(
    id: string,
    payload: {
      checkIn?: string;
      checkOut?: string;
      guestsCount?: number;
      contactPhone?: string;
      specialRequests?: string;
    },
  ) {
    const res = await apiClient.put<any>(
      apiConfig.endpoints.bookings.modify(id),
      payload,
    );
    return {
      success: Boolean(res?.success ?? true),
      message: res?.message ?? "Cap nhat booking thanh cong",
      data: res?.data ? mapBooking(res.data) : undefined,
    };
  },
  async cancelBooking(id: string) {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.bookings.cancel(id),
    );
    return {
      success: Boolean(res?.success ?? true),
      message: res?.message ?? "Da huy booking",
    };
  },
  async getCancellationPolicy(id: string): Promise<any> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.bookings.cancellationPolicy(id),
      );
      return res?.data ?? res;
    } catch {
      return null;
    }
  },
};
