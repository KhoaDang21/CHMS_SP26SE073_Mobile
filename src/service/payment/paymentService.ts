import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

/** Khớp FE paymentService.createLink */
export interface CreatePaymentLinkRequest {
  bookingId: string;
  cancelUrl: string;
  returnUrl: string;
}

export interface PaymentLink {
  checkoutUrl: string;
  code: string;
  desc: string;
}

export interface PaymentDetail {
  id: string;
  bookingId: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  method: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export const paymentService = {
  async createPaymentLink(
    payload: CreatePaymentLinkRequest,
  ): Promise<PaymentLink> {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.payments.createLink,
      {
        bookingId: payload.bookingId,
        cancelUrl: payload.cancelUrl,
        returnUrl: payload.returnUrl,
      },
    );
    const checkoutUrl =
      res?.data?.checkoutUrl ?? res?.checkoutUrl ?? "";
    return {
      checkoutUrl,
      code: res?.data?.code ?? res?.code ?? "",
      desc: res?.data?.desc ?? res?.desc ?? "",
    };
  },

  async getPaymentDetail(paymentId: string): Promise<PaymentDetail | null> {
    const res = await apiClient.get<any>(
      apiConfig.endpoints.payments.detail(paymentId),
    );
    const data = res?.data ?? res;
    if (!data?.id) return null;
    return {
      id: data.id,
      bookingId: data.bookingId,
      amount: data.amount,
      status: data.status || "PENDING",
      method: data.method,
      transactionId: data.transactionId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async getPaymentHistory(): Promise<PaymentDetail[]> {
    const res = await apiClient.get<any>(apiConfig.endpoints.payments.history);
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map((item: any) => ({
      id: item.id,
      bookingId: item.bookingId,
      amount: item.amount,
      status: item.status || "PENDING",
      method: item.method,
      transactionId: item.transactionId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  },
};
