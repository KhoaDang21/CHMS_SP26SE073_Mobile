import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

/**
 * Chat message structure from backend
 */
export interface ChatMessage {
  sender: string; // "User" | "AI"
  message: string;
  timestamp: string;
  isRecommendation?: boolean;
  recommendedHomestays?: any[];
}

/**
 * Request structure for getting recommendations
 * Used for filter/search UI, NOT for chat messages
 */
export interface RecommendRequest {
  preferences?: string;
  location?: string;
  guestCount?: number;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string[];
}

/**
 * Chat wrapper response from backend
 */
export interface ChatWrapperResponse {
  replyMessage: string;
  isRecommendation: boolean;
  recommendedHomestays?: any[];
}

/**
 * Recommendation response from backend
 */
export interface RecommendResponse {
  message: string;
  recommendedHomestays: any[];
}

/**
 * AI Service Layer
 * All AI logic is handled by the backend
 * Frontend is responsible only for UI and state management
 */
export const aiService = {
  /**
   * Unwrap common backend ApiResponse envelopes (data/Data) recursively.
   * Handles multiple nesting levels and various response shapes.
   */
  normalizePayload(input: any): any {
    let payload = input;
    const visited = new Set(); // Prevent infinite loops

    // Limit depth to avoid accidental infinite loops on malformed payloads
    for (let i = 0; i < 5; i += 1) {
      if (payload === null || payload === undefined) {
        break;
      }

      if (visited.has(payload)) {
        break; // Already seen this object
      }

      if (typeof payload !== "object" || Array.isArray(payload)) {
        break; // Stop at non-objects or arrays
      }

      visited.add(payload);

      // Try common wrapper properties
      if (payload.data && typeof payload.data === "object") {
        payload = payload.data;
        continue;
      }

      if (payload.Data && typeof payload.Data === "object") {
        payload = payload.Data;
        continue;
      }

      if (payload.result && typeof payload.result === "object") {
        payload = payload.result;
        continue;
      }

      if (payload.Result && typeof payload.Result === "object") {
        payload = payload.Result;
        continue;
      }

      // No more unwrapping possible
      break;
    }

    return payload ?? input;
  },

  /**
   * POST /api/ai/chat
   * Send message to AI - backend handles ALL logic:
   * - Intent detection
   * - FAQ routing
   * - Recommendations
   * - General Q&A
   * Returns: ChatWrapperResponseDTO with replyMessage, isRecommendation, and optional recommendedHomestays
   */
  async chat(message: string): Promise<ChatWrapperResponse> {
    const res = await apiClient.post<any>(apiConfig.endpoints.ai.chat, {
      Message: message,
    });

    let data = this.normalizePayload(res);

    // BE might return nested data — unwrap more if needed
    if (data?.data && typeof data.data === "object") {
      data = data.data;
    }

    // Extract homestays — handle both camelCase and PascalCase + nested structures
    let homestays =
      data?.recommendedHomestays ??
      data?.RecommendedHomestays ??
      data?.recommended_homestays ??
      null;

    // If still not found, try to extract from other possible locations
    if (!Array.isArray(homestays) && data) {
      const keys = Object.keys(data);
      const homestaayKey = keys.find(
        (k) => k.toLowerCase().includes("homestay") && Array.isArray(data[k]),
      );
      if (homestaayKey) {
        homestays = data[homestaayKey];
      }
    }

    const result = {
      replyMessage: String(
        data?.replyMessage ??
          data?.ReplyMessage ??
          data?.message ??
          data?.Message ??
          "",
      ),
      isRecommendation: Boolean(
        data?.isRecommendation ?? data?.IsRecommendation ?? false,
      ),
      recommendedHomestays: Array.isArray(homestays) ? homestays : undefined,
    };

    return result;
  },

  /**
   * GET /api/ai/chat/history
   * Retrieve chat history for current user
   */
  async getChatHistory(): Promise<ChatMessage[]> {
    const res = await apiClient.get<any>(apiConfig.endpoints.ai.chatHistory);

    // Normalize response structure
    const list: any[] = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
        ? res
        : [];

    return list.map(
      (r: any): ChatMessage => ({
        sender: r.sender ?? r.Sender ?? "",
        message: r.message ?? r.Message ?? "",
        timestamp: r.timestamp ?? r.Timestamp ?? new Date().toISOString(),
        isRecommendation: Boolean(
          r.isRecommendation ?? r.IsRecommendation ?? false,
        ),
        recommendedHomestays: Array.isArray(
          r.recommendedHomestays ?? r.RecommendedHomestays,
        )
          ? (r.recommendedHomestays ?? r.RecommendedHomestays)
          : undefined,
      }),
    );
  },

  /**
   * DELETE /api/ai/chat/history
   * Clear all chat history for current user
   */
  async deleteChatHistory(): Promise<void> {
    await apiClient.delete<any>(apiConfig.endpoints.ai.deleteChatHistory);
  },

  /**
   * POST /api/ai/recommendations
   * Get structured recommendations for filter/search UI
   * NOT used for chat messages
   */
  async getRecommendations(data: RecommendRequest): Promise<RecommendResponse> {
    try {
      const res = await apiClient.post<any>(
        apiConfig.endpoints.ai.recommendations,
        {
          Location: data.location,
          GuestCount: data.guestCount ?? 2,
          MinPrice: data.minPrice,
          MaxPrice: data.maxPrice,
          Amenities: data.amenities,
          Preferences: data.preferences,
        },
      );

      // Normalize response - handle different property cases
      const result = res?.data ?? res;
      const message = result?.message ?? result?.Message ?? "";
      const homestays =
        result?.recommendedHomestays ?? result?.RecommendedHomestays ?? [];

      return {
        message,
        recommendedHomestays: Array.isArray(homestays) ? homestays : [],
      };
    } catch (error) {
      console.error("[AI] getRecommendations error:", error);
      return {
        message: "",
        recommendedHomestays: [],
      };
    }
  },

  /**
   * GET /api/ai/faq
   * Retrieve FAQ list (public, used for FAQ screen only)
   */
  async getFaqs(): Promise<any[]> {
    try {
      const res = await apiClient.get<any>(apiConfig.endpoints.ai.faq);
      const list = res?.data ?? res;
      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.error("[AI] getFaqs error:", error);
      return [];
    }
  },
};
