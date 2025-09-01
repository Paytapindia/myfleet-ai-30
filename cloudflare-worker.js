// Cloudflare Worker for RC Verification
// Deploy this to: https://dash.cloudflare.com/workers

// Helper functions
const buildCorsHeaders = (origin, allowedOrigins) => {
  const allowOrigin =
    allowedOrigins.includes("*") || allowedOrigins.includes(origin)
      ? origin || "*"
      : allowedOrigins[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,Authorization,X-Proxy-Token,X-Requested-With",
  };
};

const ok = (origin, allowedOrigins, data, statusCode = 200) => {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(origin, allowedOrigins),
    },
  });
};

const err = (origin, allowedOrigins, message, statusCode = 400) =>
  ok(origin, allowedOrigins, { success: false, error: message }, statusCode);

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
    // Read environment variables inside fetch function
    const CORS_ALLOWED_ORIGINS = (env.CORS_ALLOWED_ORIGINS || "*")
      .split(",")
      .map((s) => s.trim());
    const SHARED_PROXY_TOKEN = env.SHARED_PROXY_TOKEN || "";
    const APICLUB_API_URL = env.APICLUB_API_URL || "https://golasgil.apiclub.in/api/v1/rc_info";
    const APICLUB_API_KEY = env.APICLUB_API_KEY || "";
    const UPSTREAM_TIMEOUT_MS = parseInt(env.UPSTREAM_TIMEOUT_MS || "10000");

    const origin = request.headers.get("origin") || "*";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(origin, CORS_ALLOWED_ORIGINS),
      });
    }

    // Validate method
    if (!["GET", "POST"].includes(request.method)) {
      return err(origin, CORS_ALLOWED_ORIGINS, "Method not allowed", 405);
    }

    // Optional shared proxy token validation
    if (SHARED_PROXY_TOKEN) {
      const token = request.headers.get("x-proxy-token") || 
                   request.headers.get("X-Proxy-Token");
      if (!token || token !== SHARED_PROXY_TOKEN) {
        return err(origin, CORS_ALLOWED_ORIGINS, "Unauthorized: invalid proxy token", 401);
      }
    }

    // Validate API key configuration
    if (!APICLUB_API_KEY) {
      return err(origin, CORS_ALLOWED_ORIGINS, "Server not configured: missing APICLUB_API_KEY", 500);
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
      return err(origin, CORS_ALLOWED_ORIGINS, "vehicleNumber (or rc_number) is required", 422);
    }

    // Call upstream API with timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

      const headers = {
        "content-type": "application/json",
        "x-api-key": APICLUB_API_KEY,
        // If your provider needs Bearer instead, uncomment next line and remove x-api-key
        // "Authorization": `Bearer ${APICLUB_API_KEY}`,
      };

      const upstreamRes = await fetch(APICLUB_API_URL, {
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
          CORS_ALLOWED_ORIGINS,
          `RC lookup failed (${upstreamRes.status}). Please try again later.`,
          502
        );
      }

      const data = normalizeRc(json);

      return ok(origin, CORS_ALLOWED_ORIGINS, { success: true, data });
    } catch (e) {
      const isAbort = e?.name === "AbortError";
      console.error("Upstream exception:", e);
      return err(
        origin,
        CORS_ALLOWED_ORIGINS,
        isAbort
          ? `RC lookup timed out after ${UPSTREAM_TIMEOUT_MS}ms`
          : "Unexpected server error",
        504
      );
    }
  },
};