import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  message: string;
  createdAt: string;
}

export interface ChatResponse {
  id: string;
  message: string;
  suggestions?: string[];
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
  // Gửi tin nhắn chat
  async sendMessage(message: string): Promise<ChatResponse> {
    const res = await apiClient.post<any>(apiConfig.endpoints.ai.chat, {
      message,
    });
    const data = res?.data ?? res;
    return {
      id: data.id,
      message: data.message,
      suggestions: data.suggestions,
    };
  },

  // Lấy lịch sử chat
  async getChatHistory(): Promise<ChatMessage[]> {
    const res = await apiClient.get<any>(apiConfig.endpoints.ai.chatHistory);
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map((item: any) => ({
      id: item.id,
      role: item.role,
      message: item.message,
      createdAt: item.createdAt,
    }));
  },

  // Xóa lịch sử chat
  async clearChatHistory(): Promise<{ success: boolean }> {
    const res = await apiClient.delete<any>(
      `${apiConfig.endpoints.ai.chatHistory}`,
    );
    return {
      success: Boolean(res?.success ?? true),
    };
  },

  // Nhận recommendations
  async getRecommendations(): Promise<Recommendation[]> {
    const res = await apiClient.get<any>(
      apiConfig.endpoints.ai.recommendations,
    );
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map((item: any) => ({
      homestayId: item.homestayId,
      homestayName: item.homestayName,
      reason: item.reason,
      price: item.price,
      rating: item.rating,
    }));
  },

  // Lấy FAQs
  async getFAQs(category?: string): Promise<FAQ[]> {
    const url = category
      ? `${apiConfig.endpoints.ai.faq}?category=${encodeURIComponent(category)}`
      : apiConfig.endpoints.ai.faq;
    const res = await apiClient.get<any>(url);
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map((item: any) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      category: item.category,
    }));
  },

  // Tìm FAQs theo câu hỏi
  async askFAQ(question: string): Promise<FAQ[]> {
    const res = await apiClient.post<any>(apiConfig.endpoints.ai.askFaq, {
      question,
    });
    const list = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];
    return list.map((item: any) => ({
      id: item.id,
      question: item.question,
      answer: item.answer,
      category: item.category,
    }));
  },
};
