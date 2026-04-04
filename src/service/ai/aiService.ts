import { apiClient } from "@/service/api/apiClient";
import { extractArray } from "@/service/api/responseHelpers";
import { apiConfig } from "@/service/constants/apiConfig";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  message: string;
  createdAt: string;
}

export interface Recommendation {
  homestayId: string;
  homestayName: string;
  reason: string;
  price: number;
  rating: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const aiService = {
  /** POST /api/ai/chat — BE returns ApiResponse<string> */
  async sendMessage(message: string): Promise<string> {
    const res = await apiClient.post<Record<string, unknown>>(apiConfig.endpoints.ai.chat, {
      message,
    });
    const text = res?.data ?? res;
    return typeof text === "string" ? text : "";
  },

  async getChatHistory(): Promise<ChatMessage[]> {
    const res = await apiClient.get<unknown>(apiConfig.endpoints.ai.chatHistory);
    const list = extractArray<Record<string, unknown>>(res);
    return list.map((item, idx) => ({
      id: String(item.id ?? item.Id ?? `h-${idx}`),
      role: (String(item.role ?? item.Role ?? "ASSISTANT").toUpperCase() === "USER"
        ? "USER"
        : "ASSISTANT") as "USER" | "ASSISTANT",
      message: String(item.message ?? item.Message ?? ""),
      createdAt: String(item.createdAt ?? item.CreatedAt ?? new Date().toISOString()),
    }));
  },

  async clearChatHistory(): Promise<{ success: boolean }> {
    const res = await apiClient.delete<Record<string, unknown>>(
      apiConfig.endpoints.ai.deleteChatHistory,
    );
    return { success: Boolean(res?.success ?? true) };
  },

  /** FE: POST /api/ai/recommendations with body */
  async getRecommendations(prefs?: {
    preferences?: string;
    location?: string;
    guestCount?: number;
  }): Promise<Recommendation[]> {
    const res = await apiClient.post<unknown>(apiConfig.endpoints.ai.recommendations, {
      preferences: prefs?.preferences ?? "Homestay ven biển, giá hợp lý",
      location: prefs?.location,
      guestCount: prefs?.guestCount,
    });
    const r = res as Record<string, unknown>;
    const list = r?.data;
    const arr = Array.isArray(list) ? list : Array.isArray(res) ? res : [];
    return (arr as Record<string, unknown>[]).map((item) => ({
      homestayId: String(item.homestayId ?? item.HomestayId ?? ""),
      homestayName: String(item.homestayName ?? item.HomestayName ?? ""),
      reason: String(item.reason ?? item.Reason ?? ""),
      price: Number(item.price ?? item.Price ?? 0),
      rating: Number(item.rating ?? item.Rating ?? 0),
    }));
  },

  async getFAQs(category?: string): Promise<FAQ[]> {
    const url = category
      ? `${apiConfig.endpoints.ai.faq}?category=${encodeURIComponent(category)}`
      : apiConfig.endpoints.ai.faq;
    const res = await apiClient.get<unknown>(url);
    const r = res as Record<string, unknown>;
    const list = Array.isArray(r?.data) ? r.data : Array.isArray(res) ? res : [];
    return (list as Record<string, unknown>[]).map((item) => ({
      id: String(item.id ?? item.Id ?? ""),
      question: String(item.question ?? item.Question ?? ""),
      answer: String(item.answer ?? item.Answer ?? ""),
      category: String(item.category ?? item.Category ?? ""),
    }));
  },

  async askFAQ(question: string): Promise<FAQ[]> {
    const res = await apiClient.post<unknown>(apiConfig.endpoints.ai.askFaq, {
      message: question,
    });
    const list = extractArray<Record<string, unknown>>(res);
    return list.map((item) => ({
      id: String(item.id ?? item.Id ?? ""),
      question: String(item.question ?? item.Question ?? ""),
      answer: String(item.answer ?? item.Answer ?? ""),
      category: String(item.category ?? item.Category ?? ""),
    }));
  },
};
