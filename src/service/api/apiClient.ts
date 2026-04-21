import { apiConfig } from "@/service/constants/apiConfig";
import { tokenStorage } from "@/service/auth/tokenStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// AI endpoints cần timeout dài hơn vì LLM response chậm
const AI_ENDPOINTS = ["/api/ai/chat", "/api/ai/recommendations", "/api/ai/faq"];
// BE gọi LLM có thể timeout tới 120s, mobile mạng yếu dễ vượt 60s
const AI_TIMEOUT = 120000; // 120s cho AI

type RefreshTokenResponse = {
  data?: {
    accessToken?: string;
    token?: string;
    refreshToken?: string;
  };
  accessToken?: string;
  token?: string;
  refreshToken?: string;
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) return null;
  const accessToken = (await tokenStorage.getToken()) ?? "";

  const url = `${apiConfig.baseURL}${apiConfig.endpoints.auth.refreshToken}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken, accessToken }),
  });

  if (!response.ok) return null;

  const json = (await response.json().catch(() => ({}))) as RefreshTokenResponse;
  const newAccessToken =
    json?.data?.accessToken ?? json?.data?.token ?? json?.accessToken ?? json?.token ?? null;
  const newRefreshToken = json?.data?.refreshToken ?? json?.refreshToken ?? refreshToken;

  if (!newAccessToken) return null;

  const user = await tokenStorage.getUser();
  if (user) {
    await tokenStorage.setSession(newAccessToken, newRefreshToken, user);
  } else {
    // Fallback: chỉ cập nhật token, không đụng userData
    await AsyncStorage.setItem("authToken", newAccessToken);
    if (newRefreshToken) {
      await AsyncStorage.setItem("refreshToken", newRefreshToken);
    }
  }

  return newAccessToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await tokenStorage.getToken();
  const controller = new AbortController();
  const isAiEndpoint = AI_ENDPOINTS.some((e) => endpoint.startsWith(e));
  const timeoutMs = isAiEndpoint ? AI_TIMEOUT : apiConfig.timeout;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${apiConfig.baseURL}${endpoint}`;

    let response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });

    // Auto refresh token on 401 (except refresh endpoint itself)
    if (
      response.status === 401 &&
      token &&
      endpoint !== apiConfig.endpoints.auth.refreshToken
    ) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newToken}`,
            ...options.headers,
          },
          signal: controller.signal,
        });
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Extract error message from various BE response shapes:
      // { message }, { Message }, { data: { message } }, { errors: { field: [...] } }, { title }
      let errorMessage: string =
        data?.message ||
        data?.Message ||
        data?.data?.message ||
        data?.data?.Message ||
        "";

      if (!errorMessage && data?.errors) {
        // ASP.NET ModelState: { errors: { FieldName: ["msg1"] } }
        const firstField = Object.values(
          data.errors as Record<string, string[]>,
        )[0];
        if (Array.isArray(firstField) && firstField.length > 0) {
          errorMessage = firstField[0];
        }
      }

      if (!errorMessage && data?.title) {
        errorMessage = data.title;
      }

      const finalError = errorMessage || `HTTP ${response.status}`;
      throw new Error(finalError);
    }
    return data as T;
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildQuery(
  params?: Record<string, string | number | boolean | undefined | null>,
) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (!entries.length) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of entries) qs.append(k, String(v));
  return `?${qs.toString()}`;
}

export const apiClient = {
  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ) {
    return request<T>(`${endpoint}${buildQuery(params)}`, { method: "GET" });
  },
  post<T>(endpoint: string, payload?: unknown) {
    return request<T>(endpoint, {
      method: "POST",
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
  },
  put<T>(endpoint: string, payload?: unknown) {
    return request<T>(endpoint, {
      method: "PUT",
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });
  },
  delete<T>(endpoint: string) {
    return request<T>(endpoint, { method: "DELETE" });
  },
};
