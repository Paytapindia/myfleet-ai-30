// Central app configuration for API usage
// Toggle useApi to true when backend is ready
export const APP_CONFIG = {
  useApi: false, // Do not perform network calls by default
  apiBaseUrl: "https://api.example.com", // Replace in production
  timeoutMs: 15000,
};

export let AUTH_TOKEN: string | null = null;
export const setAuthToken = (token: string | null) => {
  AUTH_TOKEN = token;
};
