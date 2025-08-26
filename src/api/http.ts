import { APP_CONFIG, AUTH_TOKEN } from "./appConfig";

export class ApiError<T = any> extends Error {
  status: number;
  data?: T;
  constructor(message: string, status: number, data?: T) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(path, APP_CONFIG.apiBaseUrl);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!APP_CONFIG.useApi) {
    throw new ApiError("API calls are disabled. Enable APP_CONFIG.useApi to use the backend.", 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APP_CONFIG.timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (AUTH_TOKEN) headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;

    const res = await fetch(
      buildUrl(path, options.query),
      {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal || controller.signal,
      }
    );

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      throw new ApiError(typeof data === "string" ? data : (data?.message || "Request failed"), res.status, data);
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const http = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: any) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: any) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
