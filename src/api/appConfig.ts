// Central app configuration for API usage
// Toggle useApi to true when backend is ready
export const APP_CONFIG = {
  useApi: true, // Enable direct API calls
  apiBaseUrl: "https://your-api-gateway-url.amazonaws.com/prod", // Replace with your actual API Gateway URL
  timeoutMs: 30000, // Increased timeout for verification calls
};

export let AUTH_TOKEN: string | null = null;
export const setAuthToken = (token: string | null) => {
  AUTH_TOKEN = token;
};
