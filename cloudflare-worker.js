// Cloudflare Worker for RC Verification
// Deploy this to: https://dash.cloudflare.com/workers

// Configuration from environment variables
const CORS_ALLOWED_ORIGINS = (CORS_ALLOWED_ORIGINS_ENV || "*")
  .split(",")
  .map((s) => s.trim());
const SHARED_PROXY_TOKEN = SHARED_PROXY_TOKEN_ENV || "";
const APICLUB_API_URL = APICLUB_API_URL_ENV || "https://golasgil.apiclub.in/api/v1/rc_info";
const APICLUB_API_KEY = APICLUB_API_KEY_ENV || "";
const UPSTREAM_TIMEOUT_MS = parseInt(UPSTREAM_TIMEOUT_MS_ENV || "10000");

// Helper functions
const buildCorsHeaders = (origin) => {
  const allowOrigin =
    CORS_ALLOWED_ORIGINS.includes("*") || CORS_ALLOWED_ORIGINS.includes(origin)
      ? origin || "*"
      : CORS_ALLOWED_ORIGINS[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,Authorization,X-Proxy-Token,X-Requested-With",
  };
};

const ok = (origin, data, statusCode = 200) => {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(origin),
    },
  });
};

const err = (origin, message, statusCode = 400) =>
  ok(origin, { success: false, error: message }, statusCode);

// Normalization for APICLUB-like responses
const normalizeRc = (raw) => {
  const api = raw?.data || raw?.result || raw || {};
  const first = api?.result || api;

  return {
    rc_number:
      first?.rc_number ||
      first?.registration_number ||
      first?.vehicle_number ||
      first?.vehicleRegNo ||
      null,
    vehicle_number:
      first?.vehicle_number ||
      first?.registration_number ||
      first?.rc_number ||
      first?.vehicleRegNo ||
      null,
    owner_name:
      first?.owner_name || first?.ownerName || first?.owner || null,
    engine_number:
      first?.engine_number || first?.engineNo || first?.engine || null,
    chassis_number:
      first?.chassis_number || first?.chassisNo || first?.chassis || null,
    fuel_type:
      first?.fuel_type || first?.fuelType || null,
    manufacturer:
      first?.manufacturer || first?.maker || first?.make || null,
    model:
      first?.model || first?.model_name || null,
    rc_status:
      first?.rc_status || first?.status || null,
    rc_valid_upto:
      first?.rc_valid_upto || first?.rcValidity || first?.rcValidUpto || null,
    insurance_status:
      first?.insurance_status || first?.insuranceStatus || null,
    insurance_valid_upto:
      first?.insurance_valid_upto || first?.insuranceValidUpto || null,
    fitness_upto:
      first?.fitness_upto || first?.fitnessValidUpto || null,
    puc_valid_upto:
      first?.puc_valid_upto || first?.pucValidUpto || null,
  };
};

export default {
  async fetch(request, env, ctx) {
    // Get environment variables from Cloudflare
    const CORS_ALLOWED_ORIGINS_ENV = env.CORS_ALLOWED_ORIGINS;
    const SHARED_PROXY_TOKEN_ENV = env.SHARED_PROXY_TOKEN;
    const APICLUB_API_URL_ENV = env.APICLUB_API_URL;
    const APICLUB_API_KEY_ENV = env.APICLUB_API_KEY;
    const UPSTREAM_TIMEOUT_MS_ENV = env.UPSTREAM_TIMEOUT_MS;

    const origin = request.headers.get("origin") || "*";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(origin),
      });
    }

    // Validate method
    if (!["GET", "POST"].includes(request.method)) {
      return err(origin, "Method not allowed", 405);
    }

    // Optional shared proxy token validation
    if (SHARED_PROXY_TOKEN_ENV) {
      const token = request.headers.get("x-proxy-token") || 
                   request.headers.get("X-Proxy-Token");
      if (!token || token !== SHARED_PROXY_TOKEN_ENV) {
        return err(origin, "Unauthorized: invalid proxy token", 401);
      }
    }

    // Validate API key configuration
    if (!APICLUB_API_KEY_ENV) {
      return err(origin, "Server not configured: missing APICLUB_API_KEY", 500);
    }

    // Parse vehicle number from request
    let vehicleNumber = null;
    try {
      if (request.method === "POST") {
        const body = await request.json();
        vehicleNumber =
          body?.vehicleNumber || body?.rc_number || body?.vehicle_number || null;
      }
    } catch (e) {
      // Ignore JSON parse errors, try query params
    }

    if (!vehicleNumber) {
      const url = new URL(request.url);
      vehicleNumber =
        url.searchParams.get("vehicleNumber") ||
        url.searchParams.get("rc_number") ||
        url.searchParams.get("vehicle_number") ||
        null;
    }

    if (!vehicleNumber) {
      return err(origin, "vehicleNumber (or rc_number) is required", 422);
    }

    // Call upstream API with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS || 10000);

      const headers = {
        "content-type": "application/json",
        "x-api-key": APICLUB_API_KEY_ENV,
        // If your provider needs Bearer instead, uncomment next line and remove x-api-key
        // "Authorization": `Bearer ${APICLUB_API_KEY_ENV}`,
      };

      const upstreamRes = await fetch(APICLUB_API_URL_ENV || "https://golasgil.apiclub.in/api/v1/rc_info", {
        method: "POST",
        headers,
        body: JSON.stringify({ rc_number: vehicleNumber }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await upstreamRes.text();
      const json = text ? JSON.parse(text) : {};

      if (!upstreamRes.ok) {
        console.error("Upstream error:", upstreamRes.status, text?.slice(0, 500));
        return err(
          origin,
          `RC lookup failed (${upstreamRes.status}). Please try again later.`,
          502
        );
      }

      const data = normalizeRc(json);

      return ok(origin, { success: true, data });
    } catch (e) {
      const isAbort = e?.name === "AbortError";
      console.error("Upstream exception:", e);
      return err(
        origin,
        isAbort
          ? `RC lookup timed out after ${UPSTREAM_TIMEOUT_MS || 10000}ms`
          : "Unexpected server error",
        504
      );
    }
  },
};