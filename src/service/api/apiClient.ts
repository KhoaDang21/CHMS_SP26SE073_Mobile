import { apiConfig } from "@/service/constants/apiConfig";
import { tokenStorage } from "@/service/auth/tokenStorage";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await tokenStorage.getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiConfig.timeout);

  try {
    const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || `HTTP ${response.status}`);
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

function buildQuery(params?: Record<string, string | number | boolean | undefined | null>) {
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
  get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>) {
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
