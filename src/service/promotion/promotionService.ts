import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface Promotion {
  id: string;
  name: string;
  code?: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  // BE-aligned fields (same as FE)
  discountPercent: number;
  discountAmount: number;
  maxDiscountAmount?: number;
  minBookingAmount?: number;
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
  // Additional promotion details if available from BE
  name?: string;
  description?: string;
  discountType?: "PERCENTAGE" | "FIXED";
  discountValue?: number;
}

const mapPromotion = (item: any): Promotion => {
  // BE trả về discountPercent / discountAmount (giống FE)
  const discountPercent = Number(item.discountPercent ?? item.discountValue ?? 0);
  const discountAmount = Number(item.discountAmount ?? 0);
  // Xác định discountType dựa trên field nào có giá trị
  const discountType: "PERCENTAGE" | "FIXED" =
    discountPercent > 0 ? "PERCENTAGE" : "FIXED";
  // discountValue dùng để render (% hoặc số tiền)
  const discountValue = discountPercent > 0 ? discountPercent : discountAmount;

  return {
    id: String(item.id ?? ""),
    name: item.name ?? "",
    code: item.code,
    description: item.description,
    discountType,
    discountValue,
    discountPercent,
    discountAmount,
    maxDiscountAmount: item.maxDiscountAmount ? Number(item.maxDiscountAmount) : undefined,
    minBookingAmount: item.minBookingAmount ? Number(item.minBookingAmount) : undefined,
    startDate: item.startDate ?? "",
    endDate: item.endDate ?? "",
    isActive: Boolean(item.isActive),
  };
};

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
      // Optional promotion details from BE
      name: data.name ?? data.code,
      description: data.description,
      discountType:
        data.discountType ??
        (data.discountAmount && data.discountAmount > 100
          ? "FIXED"
          : "PERCENTAGE"),
      discountValue: data.discountValue ?? data.discountAmount ?? 0,
    };
  },
};
