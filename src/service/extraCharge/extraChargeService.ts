import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";
import type { ExtraCharge } from "@/types";

const mapExtraCharge = (item: any): ExtraCharge => ({
  id: String(item.id ?? item.Id ?? ""),
  description: item.description ?? item.Description ?? "",
  amount: Number(item.amount ?? item.Amount ?? 0),
  chargeType: item.chargeType ?? item.ChargeType,
  appliedDate: item.appliedDate ?? item.AppliedDate,
});

/**
 * Extra Charges Service
 * Handles tracking additional charges applied to bookings
 */
export const extraChargeService = {
  /**
   * GET /api/extra-charges/booking/{bookingId} — Get extra charges for a booking
   */
  async getByBooking(bookingId: string): Promise<ExtraCharge[]> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.extraCharges.byBooking(bookingId),
      );
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.items)
          ? res.data.items
          : Array.isArray(res)
            ? res
            : [];
      return list.map(mapExtraCharge);
    } catch (e) {
      console.warn("[extraChargeService.getByBooking] Error:", e);
      return [];
    }
  },
};
