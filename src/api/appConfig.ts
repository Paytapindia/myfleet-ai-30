// Central app configuration for API usage
// Toggle useApi to true when backend is ready
export const APP_CONFIG = {
  useApi: true, // Enable direct API calls
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "https://gcuaa4tfjl.execute-api.ap-south-1.amazonaws.com/Dev/Vehiclemanager-myfleet",
  timeoutMs: 30000, // Increased timeout for verification calls
};

export let AUTH_TOKEN: string | null = null;
export const setAuthToken = (token: string | null) => {
  AUTH_TOKEN = token;
};
