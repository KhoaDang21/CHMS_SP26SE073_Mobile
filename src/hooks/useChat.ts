import { useCallback, useEffect, useReducer } from "react";
import { aiService } from "@/service/ai/aiService";
import type { ChatMessage, ChatWrapperResponse } from "@/service/ai/aiService";

export interface ExtendedChatMessage extends ChatMessage {
  recommendedHomestays?: any[];
  isRecommendation?: boolean;
}

export interface ChatState {
  messages: ExtendedChatMessage[];
  /** true chỉ khi đang chờ AI reply — dùng để hiện typing indicator */
  sending: boolean;
  /** true khi đang load history lần đầu */
  historyLoading: boolean;
  error: string | null;
}

type ChatAction =
  | { type: "SET_SENDING"; payload: boolean }
  | { type: "SET_HISTORY_LOADING"; payload: boolean }
  | { type: "SET_MESSAGES"; payload: ExtendedChatMessage[] }
  | { type: "ADD_USER_MESSAGE"; payload: string }
  | { type: "ADD_AI_MESSAGE"; payload: ChatWrapperResponse }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_MESSAGES" };

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "SET_SENDING":
      return { ...state, sending: action.payload };

    case "SET_HISTORY_LOADING":
      return { ...state, historyLoading: action.payload };

    case "SET_MESSAGES":
      return { ...state, messages: action.payload, error: null };

    case "ADD_USER_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            sender: "User",
            message: action.payload,
            timestamp: new Date().toISOString(),
          },
        ],
      };

    case "ADD_AI_MESSAGE":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            sender: "AI",
            message: action.payload.replyMessage || "Xin lỗi, tôi chưa hiểu.",
            timestamp: new Date().toISOString(),
            isRecommendation: action.payload.isRecommendation || false,
            recommendedHomestays: Array.isArray(
              action.payload.recommendedHomestays,
            )
              ? action.payload.recommendedHomestays
              : undefined,
          },
        ],
      };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "CLEAR_MESSAGES":
      return { ...state, messages: [] };

    default:
      return state;
  }
};

export const useChat = () => {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    sending: false,
    historyLoading: true,
    error: null,
  });

  /** Fetch history một lần khi mount — không ảnh hưởng sending state */
  const fetchHistory = useCallback(async () => {
    try {
      dispatch({ type: "SET_HISTORY_LOADING", payload: true });
      const history = await aiService.getChatHistory();
      const extended: ExtendedChatMessage[] = history.map((msg) => ({
        ...msg,
        recommendedHomestays: msg.recommendedHomestays,
        isRecommendation: msg.isRecommendation ?? false,
      }));
      dispatch({ type: "SET_MESSAGES", payload: extended });
    } catch {
      // Không block user nếu load history thất bại
      dispatch({ type: "SET_MESSAGES", payload: [] });
    } finally {
      dispatch({ type: "SET_HISTORY_LOADING", payload: false });
    }
  }, []);

  /** Gửi tin nhắn — chỉ set sending, không đụng historyLoading */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || state.sending) return;

      // Optimistic UI: hiện tin user ngay
      dispatch({ type: "ADD_USER_MESSAGE", payload: message });
      dispatch({ type: "SET_SENDING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const response = await aiService.chat(message);
        dispatch({
          type: "ADD_AI_MESSAGE",
          payload: {
            replyMessage: response.replyMessage || "Xin lỗi, tôi chưa hiểu.",
            isRecommendation: response.isRecommendation || false,
            recommendedHomestays: response.recommendedHomestays || [],
          },
        });
      } catch (error) {
        const isAbort = error instanceof Error && error.name === "AbortError";
        const friendlyMsg = isAbort
          ? "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại."
          : "Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.";
        dispatch({
          type: "ADD_AI_MESSAGE",
          payload: {
            replyMessage: `❌ ${friendlyMsg}`,
            isRecommendation: false,
            recommendedHomestays: [],
          },
        });
      } finally {
        dispatch({ type: "SET_SENDING", payload: false });
      }
    },
    [state.sending],
  );

  /** Xóa lịch sử */
  const clearHistory = useCallback(async () => {
    try {
      await aiService.deleteChatHistory();
      dispatch({ type: "CLEAR_MESSAGES" });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Failed to clear history";
      dispatch({ type: "SET_ERROR", payload: errorMsg });
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    messages: state.messages,
    sending: state.sending,
    historyLoading: state.historyLoading,
    error: state.error,
    sendMessage,
    fetchHistory,
    clearHistory,
  };
};
