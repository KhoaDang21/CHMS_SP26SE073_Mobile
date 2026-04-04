import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface CouponValidationRequest {
  code: string;
  bookingId?: string;
  totalAmount?: number;
}

export interface CouponValidationResponse {
  isValid: boolean;
  discountAmount?: number;
  message?: string;
  promotionId?: string;
}

const mapPromotion = (item: any): Promotion => ({
  id: String(item.id ?? ""),
  name: item.name ?? "",
  description: item.description,
  discountType: item.discountType ?? "PERCENTAGE",
  discountValue: Number(item.discountValue ?? 0),
  startDate: item.startDate ?? "",
  endDate: item.endDate ?? "",
  isActive: Boolean(item.isActive),
});

export const promotionService = {
  /** GET /api/promotions/active — danh sách khuyến mãi đang hoạt động cho customer */
  async getActiveForCustomer(): Promise<Promotion[]> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.promotions.activeForCustomer,
      );
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      return list.map(mapPromotion);
    } catch {
      return [];
    }
  },

  /** POST /api/coupons/validate — kiểm tra mã coupon */
  async validateCoupon(
    payload: CouponValidationRequest,
  ): Promise<CouponValidationResponse> {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.coupons.validate,
      payload,
    );
    const data = res?.data ?? res ?? {};
    return {
      isValid: Boolean(data.isValid),
      discountAmount: data.discountAmount,
      message: data.message,
      promotionId: data.promotionId,
    };
  },
};
