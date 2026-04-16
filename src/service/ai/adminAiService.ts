import { apiClient } from "@/service/api/apiClient";
import { apiConfig } from "@/service/constants/apiConfig";

export interface AiAnalytics {
  totalChats?: number;
  totalQuestions?: number;
  averageResponseTime?: number;
  usageByDay?: Record<string, number>;
  topQuestions?: string[];
  satisfactionRate?: number;
}

export interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiSetting {
  key: string;
  value: string;
  description?: string;
}

export const adminAiService = {
  /**
   * GET /api/admin/ai/analytics
   * Retrieve AI usage statistics
   */
  async getAnalytics(): Promise<AiAnalytics | null> {
    try {
      const response = await apiClient.get<any>(
        apiConfig.endpoints.ai.adminAnalytics,
      );
      const data = response?.data ?? response;
      if (!data) return null;

      return {
        totalChats: data.totalChats ?? 0,
        totalQuestions: data.totalQuestions ?? 0,
        averageResponseTime: data.averageResponseTime ?? 0,
        usageByDay: data.usageByDay ?? {},
        topQuestions: data.topQuestions ?? [],
        satisfactionRate: data.satisfactionRate ?? 0,
      };
    } catch (error) {
      console.error("[Admin AI] Get analytics error:", error);
      return null;
    }
  },

  /**
   * GET /api/admin/ai/knowledge-base
   * Retrieve knowledge base list
   */
  async getKnowledgeBase(
    page?: number,
    limit?: number,
  ): Promise<KnowledgeBase[]> {
    try {
      const params = new URLSearchParams();
      if (page) params.append("page", String(page));
      if (limit) params.append("limit", String(limit));

      const response = await apiClient.get<any>(
        `${apiConfig.endpoints.ai.adminKnowledgeBase}?${params.toString()}`,
      );
      const rawList = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      return rawList.map((item: any) => ({
        id: item.id ?? "",
        title: item.title ?? "",
        content: item.content ?? "",
        category: item.category ?? "",
        tags: item.tags ?? [],
        status: item.status ?? "ACTIVE",
        createdAt: item.createdAt ?? "",
        updatedAt: item.updatedAt ?? "",
      }));
    } catch (error) {
      console.error("[Admin AI] Get knowledge base error:", error);
      return [];
    }
  },

  /**
   * POST /api/admin/ai/knowledge-base
   * Create new knowledge base entry
   */
  async createKnowledgeBase(
    data: Omit<KnowledgeBase, "id" | "createdAt" | "updatedAt">,
  ): Promise<{ success: boolean; message: string; data?: KnowledgeBase }> {
    try {
      const response = await apiClient.post<any>(
        apiConfig.endpoints.ai.adminKnowledgeBase,
        {
          title: data.title,
          content: data.content,
          category: data.category,
          tags: data.tags,
          status: data.status ?? "ACTIVE",
        },
      );
      const item = response?.data ?? response;
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Thêm knowledge base thành công!",
        data: item?.id
          ? {
              id: item.id ?? "",
              title: item.title ?? "",
              content: item.content ?? "",
              category: item.category ?? "",
              tags: item.tags ?? [],
              status: item.status ?? "ACTIVE",
              createdAt: item.createdAt ?? "",
              updatedAt: item.updatedAt ?? "",
            }
          : undefined,
      };
    } catch (error) {
      console.error("[Admin AI] Create knowledge base error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Lỗi khi thêm knowledge base",
      };
    }
  },

  /**
   * PUT /api/admin/ai/knowledge-base/{id}
   * Update knowledge base entry
   */
  async updateKnowledgeBase(
    id: string,
    data: Partial<KnowledgeBase>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.put<any>(
        apiConfig.endpoints.ai.adminKnowledgeBaseDetail(id),
        {
          title: data.title,
          content: data.content,
          category: data.category,
          tags: data.tags,
          status: data.status,
        },
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật knowledge base thành công!",
      };
    } catch (error) {
      console.error("[Admin AI] Update knowledge base error:", error);
      return {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Lỗi khi cập nhật knowledge base",
      };
    }
  },

  /**
   * DELETE /api/admin/ai/knowledge-base/{id}
   * Delete knowledge base entry
   */
  async deleteKnowledgeBase(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<any>(
        apiConfig.endpoints.ai.adminKnowledgeBaseDetail(id),
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Xóa knowledge base thành công!",
      };
    } catch (error) {
      console.error("[Admin AI] Delete knowledge base error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi khi xóa knowledge base",
      };
    }
  },

  /**
   * PUT /api/admin/ai/settings/{key}
   * Update AI configuration
   */
  async updateSetting(
    key: string,
    value: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.put<any>(
        apiConfig.endpoints.ai.adminSettings(key),
        { key, value },
      );
      return {
        success: response?.success ?? true,
        message: response?.message ?? "Cập nhật cấu hình thành công!",
      };
    } catch (error) {
      console.error("[Admin AI] Update setting error:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Lỗi khi cập nhật cấu hình",
      };
    }
  },
};
