import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  mobile: string; // E.164 format e.g. 9198XXXXXXXX
  name?: string;  // Optional, used as Param1 if your DLT template expects a name
  params?: Record<string, string>; // Additional template vars (Param2, Param3, ...)
  expiryMinutes?: number; // defaults to 10
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const MSG91_AUTHKEY = Deno.env.get("MSG91_AUTHKEY");
  const MSG91_TEMPLATE_ID = Deno.env.get("MSG91_TEMPLATE_ID_LOGIN");

  if (!MSG91_AUTHKEY || !MSG91_TEMPLATE_ID) {
    console.error("Missing MSG91 secrets");
    return new Response(JSON.stringify({ error: "Server not configured: MSG91 secrets missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = (await req.json()) as SendOtpRequest;
    const { mobile, name, params = {}, expiryMinutes } = body || {};

    if (!mobile) {
      return new Response(JSON.stringify({ error: "'mobile' is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build query params as per MSG91 OTP API
    const qp = new URLSearchParams({
      authkey: MSG91_AUTHKEY,
      template_id: MSG91_TEMPLATE_ID,
      mobile,
    });

    // expiry is optional; default 10 minutes
    const expiry = typeof expiryMinutes === "number" && expiryMinutes > 0 ? String(expiryMinutes) : "10";
    qp.set("otp_expiry", expiry);

    // Optional real time response flag (1 for real-time)
    qp.set("realTimeResponse", "1");

    // Body can include Param1/2/3... for template variables besides OTP
    // If you have a name variable in template, pass it as Param1
    const payload: Record<string, string> = {};
    if (name) payload["Param1"] = name;
    // Merge additional params as Param2/3/etc if provided as named keys
    // If caller already uses ParamX keys, keep them; otherwise map in insertion order
    let nextIndex = 2;
    for (const [k, v] of Object.entries(params)) {
      if (k.startsWith("Param")) {
        payload[k] = v;
      } else {
        payload[`Param${nextIndex}`] = v;
        nextIndex++;
      }
    }

    const url = `https://control.msg91.com/api/v5/otp?${qp.toString()}`;

    console.log("MSG91 Send OTP request:", { url, hasPayload: Object.keys(payload).length > 0 });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: Object.keys(payload).length ? JSON.stringify(payload) : undefined,
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      console.error("MSG91 Send OTP error:", res.status, data);
      return new Response(JSON.stringify({ error: "Failed to send OTP", status: res.status, data }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("Unhandled error in msg91-send-otp:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
