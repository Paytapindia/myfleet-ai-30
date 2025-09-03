import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utilities: sanitize input and add robust retry for upstream calls
const sanitizeVehicleNumber = (input: string) =>
  input?.toString().toUpperCase().replace(/[\s-]/g, '').trim();

async function fetchWithRetry(url: string, payload: any, headers: Record<string, string> = {}, maxRetries = 2) {
  let attempt = 0;
  let lastStatus: number | null = null;
  let lastError: any = null;
  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s per attempt
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...headers },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      lastStatus = res.status;
      if (res.ok) return res;
      // Retry only on 5xx responses
      if (res.status >= 500) {
        attempt++;
        if (attempt > maxRetries) return res;
        const backoff = 500 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      // Do not retry on 4xx
      return res;
    } catch (e) {
      lastError = e;
      attempt++;
      if (attempt > maxRetries) throw e;
      const backoff = 500 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError ?? new Error(`Failed after retries (lastStatus=${lastStatus})`);
}

// Helpers to sanitize values before DB writes
function toDateOrNull(value: any): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already YYYY-MM-DD
  // Convert DD/MM/YYYY or DD-MM-YYYY => YYYY-MM-DD
  const m = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function toIntOrNull(value: any): number | null {
  const n = parseInt(String(value), 10);
  return isNaN(n) ? null : n;
}

function toBool(value: any): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function toStringOrNull(value: any): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s || null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

const body = await req.json()
const vehicleNumber = body?.vehicleNumber

if (!vehicleNumber) {
  return new Response(
    JSON.stringify({ error: 'Vehicle number is required' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

const vNum = sanitizeVehicleNumber(vehicleNumber)

console.log(`RC verification requested for vehicle: ${vNum} by user: ${user.id}`)

    // First, check if we have cached RC data for this vehicle
    const { data: cachedVehicle, error: cacheError } = await supabaseClient
.from('vehicles')
      .select('*')
      .eq('number', vNum)
      .eq('user_id', user.id)
      .eq('rc_verification_status', 'verified')
      .maybeSingle()

    if (cacheError) {
      console.error('Error checking cached vehicle data:', cacheError)
    }

    // If we have complete cached data, return it
    if (cachedVehicle && cachedVehicle.owner_name && cachedVehicle.rc_verified_at) {
console.log(`Returning cached RC data for vehicle: ${vNum}`)
      
      // Log this as a cached verification to track cost savings
      await supabaseClient.from('rc_verifications').insert({
        user_id: user.id,
        vehicle_number: vehicleNumber,
        status: 'success',
        verification_data: {
          number: cachedVehicle.number,
          model: cachedVehicle.model,
          make: cachedVehicle.make,
          year: cachedVehicle.year,
          fuelType: cachedVehicle.fuel_type,
          registrationDate: cachedVehicle.registration_date,
          ownerName: cachedVehicle.owner_name,
          chassisNumber: cachedVehicle.chassis_number,
          engineNumber: cachedVehicle.engine_number,
          registrationAuthority: cachedVehicle.registration_authority,
          permanentAddress: cachedVehicle.permanent_address,
          financer: cachedVehicle.financer,
          isFinanced: cachedVehicle.is_financed
        },
        is_cached: true,
        api_cost_saved: true
      })

      return new Response(
        JSON.stringify({
          success: true,
          cached: true,
          data: {
            number: cachedVehicle.number,
            model: cachedVehicle.model || '',
            make: cachedVehicle.make,
            year: cachedVehicle.year,
            fuelType: cachedVehicle.fuel_type,
            registrationDate: cachedVehicle.registration_date,
            ownerName: cachedVehicle.owner_name,
            chassisNumber: cachedVehicle.chassis_number,
            engineNumber: cachedVehicle.engine_number,
            registrationAuthority: cachedVehicle.registration_authority,
            permanentAddress: cachedVehicle.permanent_address,
            financer: cachedVehicle.financer,
            isFinanced: cachedVehicle.is_financed,
            insuranceExpiry: cachedVehicle.insurance_expiry,
            puccExpiry: cachedVehicle.pollution_expiry,
            fitnessExpiry: null // Not stored in our schema yet
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

console.log(`No cached data found, calling APIClub for vehicle: ${vNum}`)

    // Get AWS API Gateway URL from secrets
const awsApiGatewayUrl = Deno.env.get('AWS_API_GATEWAY_URL')
const proxyToken = Deno.env.get('SHARED_PROXY_TOKEN')
const awsApiKey = Deno.env.get('AWS_RC_API_KEY')
    
if (!awsApiGatewayUrl) {
  console.error('AWS_API_GATEWAY_URL not configured')
  return new Response(
    JSON.stringify({ error: 'AWS API Gateway not configured' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

console.log('Calling AWS API Gateway', {
  url: awsApiGatewayUrl,
  vehicleNumber: vNum,
})

    // Construct a payload compatible with multiple Lambda expectations
const payload = {
  vehicleId: vNum,
  rc_number: vNum,
  registrationNumber: vNum,
  service: 'rc',
  type: 'rc'
}
console.log('AWS request payload preview:', payload)

const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  ...(proxyToken && { 'x-proxy-token': proxyToken }),
  ...(awsApiKey && { 'x-api-key': awsApiKey }),
}

// Call AWS API Gateway with retries
let apiResponse: Response;
try {
  apiResponse = await fetchWithRetry(awsApiGatewayUrl, payload, headers, 2);
} catch (e) {
  const message = e instanceof Error ? e.message : String(e)
  console.error('AWS API Gateway fetch error after retries:', message)
  // Log failure (non-blocking)
  await supabaseClient.from('rc_verifications').insert({
    user_id: user.id,
    vehicle_number: vNum,
    status: 'failed',
    verification_data: { error: message },
    is_cached: false,
    api_cost_saved: false
  })
  return new Response(
    JSON.stringify({
      success: false,
      cached: false,
      error: 'Verification service unavailable. Please try again.',
      details: message,
      retryAfterMs: 2000
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

console.log('AWS API Gateway response status:', apiResponse.status)

if (!apiResponse.ok) {
  const errText = await apiResponse.text()
  console.error('AWS API Gateway error:', apiResponse.status, errText)
  // Log failure (non-blocking)
  await supabaseClient.from('rc_verifications').insert({
    user_id: user.id,
    vehicle_number: vNum,
    status: 'failed',
    verification_data: { upstream_status: apiResponse.status, preview: errText?.slice(0, 200) },
    is_cached: false,
    api_cost_saved: false
  })
  return new Response(
    JSON.stringify({ 
      success: false, 
      cached: false,
      error: 'RC verification failed',
      details: `Upstream error ${apiResponse.status}${errText ? ` - ${errText.slice(0, 200)}` : ''}`,
      retryable: apiResponse.status >= 500
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

    // Safely parse response (handle non-JSON bodies)
    const contentType = apiResponse.headers.get('content-type') ?? ''
    let raw: any = null
    let bodyText: string | null = null

    if (contentType.includes('application/json')) {
      try {
        raw = await apiResponse.json()
      } catch (e) {
        console.error('Failed to parse JSON response from AWS API Gateway', e)
      }
    } else {
      bodyText = await apiResponse.text()
      // Attempt to extract JSON object from text (in case upstream wrapped it)
      const match = bodyText.match(/\{[\s\S]*\}/)
      if (match) {
        try { raw = JSON.parse(match[0]) } catch (e) {
          console.error('Failed to parse JSON from text body', e)
        }
      }
    }

    // If Lambda used proxy integration with a string body, parse it
    if (raw && typeof raw.body === 'string') {
      try { raw.body = JSON.parse(raw.body) } catch (e) {
        console.error('Failed to parse nested string body from AWS response', e)
      }
    }

    if (!raw) {
      console.error('Invalid response format from AWS API Gateway', { contentType, preview: bodyText?.slice(0, 200) })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid response format from verification service',
          details: (bodyText && bodyText.slice(0, 200)) || 'Empty body' 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawPreview = (() => { try { return JSON.stringify(raw).slice(0, 500) } catch { return null } })()
    console.log('AWS API Gateway response received', { status: (raw as any)?.status ?? (raw as any)?.body?.status, preview: rawPreview })
    // Normalize APIClub response for UI compatibility
    const normalizeData = (apiResponse: any) => {
      // Handle AWS Lambda response format: { statusCode: 200, body: { response: {...} } }
      const response = apiResponse?.body?.response ?? apiResponse?.response ?? {}
      
      return {
number: response.license_plate || response.rc_number || response.registration_number || vNum,
        model: response.brand_model || response.model || response.Model || '',
        make: response.brand_name || response.make || response.Make || '',
        year: (response.manufacturing_year || response.mfg_year || response.year)?.toString() || '',
        fuelType: response.fuel_type || response.fuel || '',
        registrationDate: response.registration_date || response.regn_dt || '',
        ownerName: response.owner_name || response.owner || '',
        chassisNumber: response.chassis_number || response.chassis_no || response.chassisNo || '',
        engineNumber: response.engine_number || response.engine_no || response.engineNo || '',
        registrationAuthority: response.registering_authority || response.rto || response.registration_authority || '',
        fitnessExpiry: response.fitness_upto || response.fitnessExpiry || '',
        puccExpiry: response.pucc_upto || response.puc_valid_upto || response.puccExpiry || '',
        insuranceExpiry: response.insurance_expiry || response.insurance_valid_upto || response.insuranceExpiry || '',
      }
    }

    const normalized = normalizeData(raw)

    // Store the fetched data in vehicles table for future caching
    try {
      // Check if vehicle already exists for this user
      const { data: existingVehicle } = await supabaseClient
        .from('vehicles')
        .select('id')
.eq('number', vNum)
      .eq('user_id', user.id)
        .maybeSingle()

      const vehicleData = {
        owner_name: toStringOrNull(normalized.ownerName),
        chassis_number: toStringOrNull(normalized.chassisNumber),
        engine_number: toStringOrNull(normalized.engineNumber),
        fuel_type: toStringOrNull(normalized.fuelType),
        registration_date: toDateOrNull(normalized.registrationDate),
        registration_authority: toStringOrNull(normalized.registrationAuthority),
        permanent_address: toStringOrNull(raw?.body?.response?.permanent_address ?? raw?.response?.permanent_address),
        financer: toStringOrNull(raw?.body?.response?.financer ?? raw?.response?.financer),
        is_financed: toBool(raw?.body?.response?.is_financed ?? raw?.response?.is_financed),
        rc_verified_at: new Date().toISOString(),
        rc_verification_status: 'verified',
        model: toStringOrNull(normalized.model) || 'Not specified',
        make: toStringOrNull(normalized.make),
        year: toIntOrNull(normalized.year),
        insurance_expiry: toDateOrNull(normalized.insuranceExpiry),
        pollution_expiry: toDateOrNull(normalized.puccExpiry)
      }

      if (existingVehicle) {
        // Update existing vehicle with RC data
        await supabaseClient
          .from('vehicles')
          .update(vehicleData)
          .eq('id', existingVehicle.id)
      } else {
        // Create new vehicle with RC data
        await supabaseClient
          .from('vehicles')
          .insert({
            ...vehicleData,
user_id: user.id,
            number: vNum,
            status: 'active'
          })
      }

      console.log(`Cached RC data for vehicle: ${vNum}`)
    } catch (cacheError) {
      console.error('Error caching vehicle RC data:', cacheError)
      // Continue even if caching fails
    }

    // Store verification record
    await supabaseClient.from('rc_verifications').insert({
user_id: user.id,
      vehicle_number: vNum,
      status: 'success',
      verification_data: normalized,
      is_cached: false,
      api_cost_saved: false
    })

    console.log(`RC verification completed for vehicle: ${vNum}`)

    return new Response(
      JSON.stringify({ success: true, cached: false, data: normalized }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('RC verification error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})