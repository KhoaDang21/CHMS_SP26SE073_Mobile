import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

/**
 * Refund Service for Mobile App
 * Handles customer refund tracking and details
 * API: GET /api/bookings/my-refunds — customer xem refund của mình
 * API: GET /api/admin/cancellation-policies/refund-detail/{id} — xem chi tiết refund
 */

export interface PendingRefund {
  id: string;
  bookingId: string;
  refundAmount: number;
  refundStatus: "PENDING" | "COMPLETED";
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  createdAt: string;
  refundedAt?: string;
  vietQRUrl?: string;
}

const mapRefund = (raw: any): PendingRefund => ({
  id: String(raw?.Id ?? raw?.id ?? ""),
  bookingId: String(raw?.BookingId ?? raw?.bookingId ?? ""),
  refundAmount: Number(raw?.RefundAmount ?? raw?.refundAmount ?? 0),
  refundStatus: (raw?.RefundStatus ?? raw?.refundStatus ?? "PENDING") as
    | "PENDING"
    | "COMPLETED",
  bankName: String(raw?.BankName ?? raw?.bankName ?? ""),
  accountNumber: String(raw?.AccountNumber ?? raw?.accountNumber ?? ""),
  accountHolderName: String(
    raw?.AccountHolderName ?? raw?.accountHolderName ?? "",
  ),
  createdAt: String(
    raw?.CreatedAt ?? raw?.createdAt ?? new Date().toISOString(),
  ),
  refundedAt: (raw?.RefundedAt ?? raw?.refundedAt) as string | undefined,
  vietQRUrl: String(raw?.VietQRUrl ?? raw?.vietQRUrl ?? ""),
});

export const refundService = {
  /**
   * GET /api/bookings/my-refunds
   * Lấy danh sách refund của customer
   */
  async getMyRefunds(): Promise<PendingRefund[]> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.refunds.myRefunds,
      );
      const list = res?.data ?? res ?? [];
      return (Array.isArray(list) ? list : []).map(mapRefund);
    } catch (error) {
      console.warn("[refundService.getMyRefunds] Error:", error);
      return [];
    }
  },

  /**
   * GET /api/admin/cancellation-policies/refund-detail/{id}
   * Lấy chi tiết một refund
   */
  async getRefundDetail(id: string): Promise<PendingRefund | null> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.refunds.detail(id),
      );
      const data = res?.data ?? res;
      return data ? mapRefund(data) : null;
    } catch (error) {
      console.warn("[refundService.getRefundDetail] Error:", error);
      return null;
    }
  },
};
