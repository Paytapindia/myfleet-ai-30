import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  mobile: string; // E.164 format e.g. 9198XXXXXXXX
  otp: string;    // 4-8 digits depending on your MSG91 config
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const MSG91_AUTHKEY = Deno.env.get("MSG91_AUTHKEY");

  if (!MSG91_AUTHKEY) {
    console.error("Missing MSG91_AUTHKEY secret");
    return new Response(JSON.stringify({ error: "Server not configured: MSG91_AUTHKEY missing" }), {
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
    const body = (await req.json()) as VerifyOtpRequest;
    const { mobile, otp } = body || {};

    if (!mobile || !otp) {
      return new Response(JSON.stringify({ error: "'mobile' and 'otp' are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const qp = new URLSearchParams({ mobile, otp });
    const url = `https://control.msg91.com/api/v5/otp/verify?${qp.toString()}`;

    console.log("MSG91 Verify OTP request:", { urlMasked: url.replace(otp, "******") });

    const res = await fetch(url, {
      method: "GET",
      headers: { authkey: MSG91_AUTHKEY },
    });

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      console.error("MSG91 Verify OTP http error:", res.status, data);
      return new Response(JSON.stringify({ error: "Verification failed", status: res.status, data }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // MSG91 may return fields like `type: 'success'` or codes/messages
    const success = (data?.type?.toLowerCase?.() === "success") || data?.message?.toLowerCase?.().includes("success");

    return new Response(JSON.stringify({ success, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("Unhandled error in msg91-verify-otp:", err);
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
