import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface TicketMessage {
  id: string;
  sender: "CUSTOMER" | "STAFF";
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  priority: "HIGH" | "NORMAL" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  category?: string;
  bookingId?: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority: "HIGH" | "NORMAL" | "LOW";
  category?: string;
  bookingId?: string;
}

export interface SendMessagePayload {
  message: string;
  attachmentUrl?: string;
}

export const supportService = {
  // Tạo ticket hỗ trợ mới
  async createTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.supportTickets.create,
      payload,
    );
    const data = res?.data ?? res;
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      category: data.category,
      bookingId: data.bookingId,
      messages: (data.messages || []).map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        message: msg.message,
        attachmentUrl: msg.attachmentUrl,
        createdAt: msg.createdAt,
      })),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  // Lấy danh sách tickets
  async getTickets(): Promise<SupportTicket[]> {
    const res = await apiClient.get<any>(
      apiConfig.endpoints.supportTickets.list,
    );
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      priority: item.priority,
      status: item.status,
      category: item.category,
      bookingId: item.bookingId,
      messages: (item.messages || []).map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        message: msg.message,
        attachmentUrl: msg.attachmentUrl,
        createdAt: msg.createdAt,
      })),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  },

  // Lấy chi tiết ticket
  async getTicketDetail(ticketId: string): Promise<SupportTicket | null> {
    const res = await apiClient.get<any>(
      apiConfig.endpoints.supportTickets.detail(ticketId),
    );
    const data = res?.data ?? res;
    if (!data) return null;
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      category: data.category,
      bookingId: data.bookingId,
      messages: (data.messages || []).map((msg: any) => ({
        id: msg.id,
        sender: msg.sender,
        message: msg.message,
        attachmentUrl: msg.attachmentUrl,
        createdAt: msg.createdAt,
      })),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  // Gửi tin nhắn trong ticket
  async sendMessage(
    ticketId: string,
    payload: SendMessagePayload,
  ): Promise<TicketMessage> {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.supportTickets.sendMessage(ticketId),
      payload,
    );
    const data = res?.data ?? res;
    return {
      id: data.id,
      sender: data.sender,
      message: data.message,
      attachmentUrl: data.attachmentUrl,
      createdAt: data.createdAt,
    };
  },

  // Đóng ticket
  async closeTicket(ticketId: string): Promise<{ success: boolean }> {
    const res = await apiClient.post<any>(
      apiConfig.endpoints.supportTickets.close(ticketId),
    );
    return {
      success: Boolean(res?.success ?? true),
    };
  },
};
