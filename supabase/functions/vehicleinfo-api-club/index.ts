// vehicleinfo-api-club: Unified edge function to fetch RC, FASTag, and Challans via AWS Lambda
// - Robust CORS
// - Strict input validation
// - Correct payload mapping to Lambda (service, vehicleId, chassis/engine when needed)
// - Auth required (verify_jwt = true in config)
// - Minimal DB updates (RC writes chassis/engine + verification timestamps)
// - Always returns 200 with { success, data?, error?, details? }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeService(input?: string): 'rc' | 'fastag' | 'challans' | null {
  if (!input) return null;
  const v = String(input).toLowerCase().trim();
  if (['rc', 'fastag', 'fasttag'].includes(v)) return v === 'fasttag' ? 'fastag' : (v as any);
  if (v === 'challan' || v === 'challans') return 'challans';
  return null;
}

function firstNonEmpty(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return null;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    // Supabase client with auth context
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      return jsonResponse({ success: false, error: 'Invalid JSON body' });
    }

    // Accept both legacy and new inputs
    const service = normalizeService(body.service || body.type);
    const vehicleId = (body.vehicleId || body.vehicleNumber || '').toString().toUpperCase().replace(/\s+/g, '');

    if (!service || !vehicleId) {
      return jsonResponse({
        success: false,
        error: 'Missing required parameters',
        details: 'Provide service (rc|fastag|challans) and vehicleId',
        received: { service: body.service, type: body.type, vehicleId: body.vehicleId, vehicleNumber: body.vehicleNumber },
      });
    }

    // Ensure challans has chassis and engine
    let chassis: string | null = firstNonEmpty(body, ['chassis', 'chassis_no', 'chassisNumber']);
    let engine_no: string | null = firstNonEmpty(body, ['engine_no', 'engineNo', 'engineNumber', 'engine']);

    if (service === 'challans' && (!chassis || !engine_no)) {
      const { data: veh, error: vehErr } = await supabase
        .from('vehicles')
        .select('chassis_number, engine_number')
        .eq('user_id', user.id)
        .eq('number', vehicleId)
        .maybeSingle();

      if (!vehErr && veh) {
        chassis = chassis || veh?.chassis_number || null;
        engine_no = engine_no || veh?.engine_number || null;
      }

      if (!chassis || !engine_no) {
        return jsonResponse({
          success: false,
          error: 'Missing required parameters for challans',
          details: 'chassis and engine_no are required',
        });
      }
    }

    // Resolve Lambda URL and proxy token
    const lambdaUrl =
      Deno.env.get('AWS_LAMBDA_RC_URL') ||
      Deno.env.get('LAMBDA_URL') ||
      Deno.env.get('AWS_GATEWAY_URL') ||
      Deno.env.get('AWS_RC_API_URL') ||
      Deno.env.get('AWS_FASTAG_API_GATEWAY_URL');

    if (!lambdaUrl) {
      return jsonResponse({ success: false, error: 'Lambda URL not configured' });
    }

    // Validate URL format - ensure it's HTTP/HTTPS, not ARN
    if (!lambdaUrl.startsWith('http://') && !lambdaUrl.startsWith('https://')) {
      console.error('Invalid Lambda URL format:', lambdaUrl);
      return jsonResponse({ 
        success: false, 
        error: 'Invalid Lambda URL configuration', 
        details: `URL must start with http:// or https://, got: ${lambdaUrl.substring(0, 50)}...`
      });
    }

    const proxyToken =
      Deno.env.get('AWS_LAMBDA_PROXY_TOKEN') ||
      Deno.env.get('SHARED_PROXY_TOKEN') ||
      Deno.env.get('CLOUDFLARE_WORKER_PROXY_TOKEN') ||
      '';

    const payload: Record<string, any> = { 
      service, 
      type: service, 
      vehicleId, 
      vehicleNumber: vehicleId,
      rc_number: vehicleId,
      registrationNumber: vehicleId
    };
    if (service === 'challans') {
      payload.chassis = chassis;
      payload.chassis_no = chassis;
      payload.chassisNumber = chassis;
      payload.engine_no = engine_no;
      payload.engineNo = engine_no;
      payload.engineNumber = engine_no;
    }

    // Call Lambda
    const timeoutMs = service === 'challans' ? 65000 : 45000;
    console.log(`[vehicleinfo-api-club] Calling Lambda at: ${lambdaUrl} with payload:`, payload);
    
    let upstream: Response;
    try {
      upstream = await fetchWithTimeout(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(proxyToken ? { 'x-proxy-token': proxyToken } : {}),
        },
        body: JSON.stringify(payload),
      }, timeoutMs);
    } catch (fetchError: any) {
      console.error(`[vehicleinfo-api-club] Fetch error:`, fetchError);
      return jsonResponse({ 
        success: false, 
        error: 'Lambda request failed', 
        details: fetchError.message || String(fetchError)
      });
    }

    const rawText = await upstream.text();
    let parsed: any = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch (_) {
      parsed = { raw: rawText };
    }

    const ok = upstream.ok && !parsed?.error;

    // Best-effort mapping for RC to update DB (readiness relies on these fields)
    if (ok && service === 'rc') {
      const root = parsed?.data ?? parsed; // handle { data: {...} } or plain
      const mapFrom = (root && typeof root === 'object') ? root : {};

      const owner_name = firstNonEmpty(mapFrom, ['ownerName', 'owner_name', 'owner']) || null;
      const chassis_number = firstNonEmpty(mapFrom, ['chassisNumber', 'chassis_no', 'chassis']) || null;
      const engine_number = firstNonEmpty(mapFrom, ['engineNumber', 'engine_no', 'engine']) || null;
      const fuel_type = firstNonEmpty(mapFrom, ['fuelType', 'fuel_type']) || null;
      const registration_date = firstNonEmpty(mapFrom, ['registrationDate', 'registration_date', 'regDate']) || null;
      const registration_authority = firstNonEmpty(mapFrom, ['registrationAuthority', 'rto_name', 'rto', 'rtoName']) || null;

      const updates: Record<string, any> = {
        rc_verification_status: 'verified',
        rc_verified_at: new Date().toISOString(),
        last_rc_refresh: new Date().toISOString(),
      };
      if (owner_name) updates.owner_name = owner_name;
      if (chassis_number) updates.chassis_number = chassis_number;
      if (engine_number) updates.engine_number = engine_number;
      if (fuel_type) updates.fuel_type = fuel_type;
      if (registration_date) updates.registration_date = registration_date;
      if (registration_authority) updates.registration_authority = registration_authority;
      updates.rc_data_complete = Boolean(chassis_number && engine_number);

      const { error: updErr } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('user_id', user.id)
        .eq('number', vehicleId);

      if (updErr) {
        // Return as success=false if we couldn’t persist
        return jsonResponse({ success: false, error: 'RC update failed', details: updErr.message });
      }
    }

    // Optional: update summary fields for other services
    if (ok && service === 'fastag') {
      const root = parsed?.data ?? parsed;
      const linked = firstNonEmpty(root, ['linked', 'is_linked', 'active'])
        ?.toString()
        .toLowerCase();
      const balanceStr = firstNonEmpty(root, ['balance', 'fastag_balance']);
      const balance = balanceStr ? Number(balanceStr) : undefined;

      const updates: Record<string, any> = {};
      if (linked !== null) updates.fasttag_linked = linked === 'true' || linked === 'yes' || linked === 'linked';
      if (balance !== undefined && !Number.isNaN(balance)) updates.fasttag_balance = balance;
      if (Object.keys(updates).length) {
        await supabase.from('vehicles').update(updates).eq('user_id', user.id).eq('number', vehicleId);
      }
    }

    if (ok && service === 'challans') {
      const root = parsed?.data ?? parsed;
      let challansArr: any[] = [];
      if (Array.isArray(root?.response?.challans)) challansArr = root.response.challans;
      else if (Array.isArray(root?.challans)) challansArr = root.challans;
      else if (Array.isArray(root?.data)) challansArr = root.data;
      else if (Array.isArray(root)) challansArr = root;

      await supabase
        .from('vehicles')
        .update({ challans_count: challansArr.length })
        .eq('user_id', user.id)
        .eq('number', vehicleId);
    }

    return jsonResponse({ success: ok, data: parsed?.data ?? parsed, cached: parsed?.cached ?? false, verifiedAt: new Date().toISOString() });
  } catch (e: any) {
    return jsonResponse({ success: false, error: 'Unexpected error', details: e?.message || String(e) });
  }
});