import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

// ─── Types aligned with BE TicketResponseDTO / TicketDetailResponseDTO ────────

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "HIGH" | "NORMAL" | "LOW";

export interface TicketReply {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  customerName: string;
  staffName?: string;
  bookingId?: string;
  homestayId?: string;
  homestayName: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicket {
  replies: TicketReply[];
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority: TicketPriority;
  bookingId?: string;
  imageFile?: { uri: string; name: string; type: string } | null;
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  // Camera/library on iOS can return heic/heif; backend currently whitelists jpg/jpeg/png/webp.
  "image/heic": "jpg",
  "image/heif": "jpg",
};

const sanitizeImageFile = (
  file: { uri: string; name: string; type: string },
): { uri: string; name: string; type: string } => {
  const rawType = String(file.type ?? "").trim().toLowerCase();
  const normalizedType = rawType.includes(";") ? rawType.split(";")[0] : rawType;

  const uriWithoutQuery = String(file.uri ?? "").split("?")[0];
  const nameWithoutQuery = String(file.name ?? "").split("?")[0];
  const sourceForExt = nameWithoutQuery || uriWithoutQuery;
  const extFromSource = sourceForExt.includes(".")
    ? sourceForExt.split(".").pop()?.toLowerCase() ?? ""
    : "";

  const extFromMime = MIME_TO_EXT[normalizedType] ?? "";
  const finalExt = extFromSource in EXT_TO_MIME
    ? extFromSource
    : extFromMime || "jpg";

  const baseName = nameWithoutQuery.includes(".")
    ? nameWithoutQuery.slice(0, nameWithoutQuery.lastIndexOf("."))
    : "photo";
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, "") || "photo";
  const safeName = `${safeBaseName}.${finalExt}`;
  const safeType = EXT_TO_MIME[finalExt] ?? "image/jpeg";

  return {
    uri: file.uri,
    name: safeName,
    type: safeType,
  };
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

const normalizeStatus = (raw: unknown): TicketStatus => {
  const v = String(raw ?? "OPEN").toUpperCase();
  if (v === "IN_PROGRESS" || v === "IN-PROGRESS") return "IN_PROGRESS";
  if (v === "RESOLVED") return "RESOLVED";
  if (v === "CLOSED") return "CLOSED";
  return "OPEN";
};

const normalizePriority = (raw: unknown): TicketPriority => {
  const v = String(raw ?? "NORMAL").toUpperCase();
  if (v === "HIGH") return "HIGH";
  if (v === "LOW") return "LOW";
  return "NORMAL";
};

const mapTicket = (raw: any): SupportTicket => ({
  id: String(raw?.id ?? ""),
  title: String(raw?.title ?? ""),
  description: String(raw?.description ?? ""),
  priority: normalizePriority(raw?.priority),
  status: normalizeStatus(raw?.status),
  customerName: String(raw?.customerName ?? ""),
  staffName: raw?.staffName ? String(raw.staffName) : undefined,
  bookingId: raw?.bookingId ? String(raw.bookingId) : undefined,
  homestayId: raw?.homestayId ? String(raw.homestayId) : undefined,
  homestayName: String(raw?.homestayName ?? "Hỗ trợ chung"),
  attachmentUrl: raw?.attachmentUrl ? String(raw.attachmentUrl) : undefined,
  createdAt: String(raw?.createdAt ?? new Date().toISOString()),
});

const mapTicketDetail = (raw: any): SupportTicketDetail => ({
  ...mapTicket(raw),
  replies: Array.isArray(raw?.replies)
    ? raw.replies.map(
        (r: any): TicketReply => ({
          id: String(r?.id ?? ""),
          senderId: String(r?.senderId ?? ""),
          senderName: String(r?.senderName ?? ""),
          message: String(r?.message ?? ""),
          attachmentUrl: r?.attachmentUrl ? String(r.attachmentUrl) : undefined,
          createdAt: String(r?.createdAt ?? new Date().toISOString()),
        }),
      )
    : [],
});

// ─── Service ──────────────────────────────────────────────────────────────────

export const supportService = {
  /** GET /api/support/tickets */
  async getTickets(): Promise<SupportTicket[]> {
    const res = await apiClient.get<any>(
      apiConfig.endpoints.supportTickets.list,
    );
    const list: any[] = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map(mapTicket).filter((t) => t.id);
  },

  /** GET /api/support/tickets/{id} */
  async getTicketDetail(ticketId: string): Promise<SupportTicketDetail | null> {
    try {
      const res = await apiClient.get<any>(
        apiConfig.endpoints.supportTickets.detail(ticketId),
      );
      const raw = res?.data ?? res;
      if (!raw?.id) return null;
      return mapTicketDetail(raw);
    } catch {
      return null;
    }
  },

  /** POST /api/support/tickets — multipart/form-data */
  async createTicket(
    payload: CreateTicketPayload,
  ): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append("Title", payload.title);
    formData.append("Description", payload.description);
    formData.append("Priority", payload.priority);
    if (payload.bookingId) formData.append("BookingId", payload.bookingId);
    if (payload.imageFile) {
      const normalizedImage = sanitizeImageFile(payload.imageFile);
      formData.append("ImageFile", {
        uri: normalizedImage.uri,
        name: normalizedImage.name,
        type: normalizedImage.type,
      } as any);
    }
    const res = await apiClient.postForm<any>(
      apiConfig.endpoints.supportTickets.create,
      formData,
    );
    return {
      success: res?.success ?? true,
      message: res?.message ?? "Tạo yêu cầu thành công.",
    };
  },

  /** POST /api/support/tickets/{id}/messages — multipart/form-data */
  async sendMessage(
    ticketId: string,
    message: string,
    imageFile?: { uri: string; name: string; type: string } | null,
  ): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append("Message", message);
    if (imageFile) {
      const normalizedImage = sanitizeImageFile(imageFile);
      formData.append("ImageFile", {
        uri: normalizedImage.uri,
        name: normalizedImage.name,
        type: normalizedImage.type,
      } as any);
    }
    const res = await apiClient.postForm<any>(
      apiConfig.endpoints.supportTickets.sendMessage(ticketId),
      formData,
    );
    if (res?.success === false) {
      throw new Error(res?.message ?? "Gửi tin nhắn thất bại.");
    }
    return {
      success: true,
      message: res?.message ?? "Gửi tin nhắn thành công.",
    };
  },

  /** POST /api/support/tickets/{id}/close */
  async closeTicket(
    ticketId: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.supportTickets.close(ticketId),
    );
    return {
      success: res?.success ?? true,
      message: res?.message ?? "Đã đóng yêu cầu.",
    };
  },
};
