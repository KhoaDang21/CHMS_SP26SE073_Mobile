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

// ─── Types ────────────────────────────────────────────────────────────────────

export type EquipmentItem = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  quantity: number;
  availableQuantity: number;
  rentalFee: number;
};

export type EquipmentRequest = {
  id: string;
  bookingId: string;
  equipmentId: string;
  equipmentName: string;
  quantity: number;
  // Status flow: PENDING -> HANDED_OVER -> RETURNED
  status: "PENDING" | "HANDED_OVER" | "RETURNED" | "REJECTED";
  requestedAt: string;
  approvedAt?: string;
  handedOverAt?: string;
  returnedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
};

export type EquipmentRequestPayload = {
  bookingId: string;
  equipmentId: string;
  quantity: number;
  note?: string;
};

export type EquipmentRequestBatchPayload = {
  bookingId: string;
  items: Array<{
    equipmentId: string;
    quantity: number;
  }>;
};

export type EquipmentRequestResponse = {
  success: boolean;
  message: string;
  requestId?: string;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const equipmentService = {
  // Lấy danh sách equipment của homestay
  async getEquipmentByHomestay(homestayId: string): Promise<EquipmentItem[]> {
    if (!homestayId) return [];
    try {
      const res = await apiClient.get(
        apiConfig.endpoints.equipment.byHomestay(homestayId),
      );
      const raw = unwrapArray<AnyRecord>(res);
      return raw.map((item) => {
        const normalized = normalize<AnyRecord>(item);
        return {
          id: normalized.id,
          name: normalized.name,
          description: normalized.description,
          image: normalized.image,
          quantity: Number(normalized.quantity ?? 0),
          availableQuantity: Number(normalized.availableQuantity ?? 0),
          rentalFee: Number(normalized.rentalFee ?? 0),
        };
      });
    } catch (error) {
      console.error("Error fetching equipment:", error);
      return [];
    }
  },

  // Lấy danh sách requests của customer hiện tại
  async getEquipmentRequests(): Promise<EquipmentRequest[]> {
    try {
      const res = await apiClient.get(apiConfig.endpoints.equipment.requests);
      const raw = unwrapArray<AnyRecord>(res);
      return raw.map((item) => {
        const normalized = normalize<AnyRecord>(item);
        return {
          id: normalized.id,
          bookingId: normalized.bookingId,
          equipmentId: normalized.equipmentId,
          equipmentName: normalized.equipmentName ?? "Không xác định",
          quantity: Number(normalized.quantity ?? 0),
          status: normalized.status,
          requestedAt: normalized.requestedAt,
          approvedAt: normalized.approvedAt,
          handedOverAt: normalized.handedOverAt,
          returnedAt: normalized.returnedAt,
          rejectedAt: normalized.rejectedAt,
          rejectionReason: normalized.rejectionReason,
        };
      });
    } catch (error) {
      console.error("Error fetching equipment requests:", error);
      return [];
    }
  },

  // Submit equipment request - gửi từng item riêng lẻ
  async submitEquipmentRequest(
    batchPayload: EquipmentRequestBatchPayload,
  ): Promise<EquipmentRequestResponse> {
    try {
      const results = [];
      let hasError = false;

      // Gửi từng item riêng lẻ
      for (const item of batchPayload.items) {
        if (item.quantity <= 0) continue;

        const payload: EquipmentRequestPayload = {
          bookingId: batchPayload.bookingId,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
        };

        try {
          const res = await apiClient.post(
            apiConfig.endpoints.equipment.createRequest,
            payload,
          );
          const response = unwrapData<AnyRecord>(res);
          results.push({
            equipmentId: item.equipmentId,
            success: response.success ?? true,
            requestId: response.requestId ?? response.id,
          });
        } catch (err) {
          hasError = true;
          console.error(`Error submitting equipment ${item.equipmentId}:`, err);
        }
      }

      if (results.length === 0) {
        return {
          success: false,
          message: "Không có item nào được gửi",
        };
      }

      const allSuccess = results.every((r) => r.success) && !hasError;
      return {
        success: allSuccess,
        message: allSuccess
          ? `Yêu cầu mượn ${results.length} đồ dùng thành công`
          : `Gửi ${results.length} yêu cầu, có ${hasError ? "một số lỗi" : "tất cả thành công"}`,
        requestId: results[0]?.requestId,
      };
    } catch (error) {
      console.error("Error submitting equipment request:", error);
      return {
        success: false,
        message: "Không thể gửi yêu cầu mượn đồ dùng",
      };
    }
  },
};
