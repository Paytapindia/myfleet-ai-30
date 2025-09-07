import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-timeout',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  console.log('Vehicle Info API called:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authorization header missing' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid authorization token' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON in request' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Incoming body keys:', Object.keys(rawBody));
    const { type, vehicleNumber, vehicleId, chassis, engine_no } = rawBody;

    // Validate request
    if (!type || !(vehicleNumber || vehicleId)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required params: type, vehicleId' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate service type
    if (!['rc', 'fastag', 'challan'].includes(type)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid service type. Must be: rc, fastag, or challan' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${type} request for vehicle: ${vehicleNumber || vehicleId}`);

    // Handle service-specific logic
    switch (type) {
      case 'rc':
        return await handleRCVerification(supabase, user.id, vehicleNumber || vehicleId);
      
      case 'fastag':
        return await handleFastagVerification(supabase, user.id, vehicleNumber || vehicleId);
      
      case 'challan':
        return await handleChallansVerification(supabase, user.id, vehicleNumber || vehicleId, chassis, engine_no, rawBody.forceRefresh);
      
      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Unknown service type' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Vehicle Info API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper: fetch with timeout and robust parsing of Lambda responses
const DEFAULT_TIMEOUT_MS = 45000;
async function fetchLambda(url: string, payload: Record<string, any>, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let rawText = '';
  try {
    // Get proxy token from environment
    const proxyToken = Deno.env.get('AWS_LAMBDA_PROXY_TOKEN') || Deno.env.get('SHARED_PROXY_TOKEN');
    
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json'
    };
    
    // Add proxy token header if available
    if (proxyToken) {
      headers['X-Proxy-Token'] = proxyToken;
    }
    
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const status = res.status;
    const ok = res.ok;
    rawText = await res.text();
    console.log(`[Lambda] Status: ${status} OK: ${ok}`);
    console.log('[Lambda] Raw response:', rawText.slice(0, 500));
    let parsed: any = null;
    try { parsed = rawText ? JSON.parse(rawText) : null; } catch (_e) { parsed = null; }
    return { status, ok, rawText, parsed };
  } catch (e) {
    console.error('[Lambda] Request error:', e);
    return { status: 0, ok: false, rawText, parsed: null, error: e instanceof Error ? e.message : 'Unknown error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

function lambdaSucceeded(res: { ok: boolean; parsed: any }) {
  const d = res.parsed;
  if (!d) return false;
  if (typeof d === 'object') {
    if (d.success === true) return true;
    if (typeof d.status === 'string' && d.status.toLowerCase() === 'success') return true;
    if (res.ok && (d.data || d.result || d.payload)) return true;
  }
  return false;
}

// Helper to safely map date strings to Postgres DATE (YYYY-MM-DD) or null
function toDateOrNull(input: any): string | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;
  const yyyy_mm_dd = /^\d{4}-\d{2}-\d{2}$/;
  if (yyyy_mm_dd.test(s)) return s;
  const dd_mm_yyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const mm_dd_yyyy_dash = /^(\d{2})-(\d{2})-(\d{4})$/;
  const mm_yyyy_slash = /^(\d{2})\/(\d{4})$/;
  const yyyy_mm = /^(\d{4})-(\d{2})$/;
  let y: string, m: string, d: string;
  let match: RegExpMatchArray | null;
  if ((match = s.match(dd_mm_yyyy))) {
    d = match[1]; m = match[2]; y = match[3];
    return `${y}-${m}-${d}`;
  }
  if ((match = s.match(mm_dd_yyyy_dash))) {
    m = match[1]; d = match[2]; y = match[3];
    return `${y}-${m}-${d}`;
  }
  if ((match = s.match(mm_yyyy_slash))) {
    m = match[1]; y = match[2];
    return `${y}-${m}-01`;
  }
  if ((match = s.match(yyyy_mm))) {
    y = match[1]; m = match[2];
    return `${y}-${m}-01`;
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
}

async function handleRCVerification(supabase: any, userId: string, vehicleNumber: string) {
  try {
    // Check for cached data
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
      .eq('number', vehicleNumber)
      .single();

    if (existingVehicle && existingVehicle.rc_verified_at) {
      console.log('Found existing RC data for vehicle:', vehicleNumber);
      return new Response(JSON.stringify({
        success: true,
        data: {
          // Standardized field names that match frontend expectations
          number: existingVehicle.number,
          model: existingVehicle.model || 'Not specified',
          make: existingVehicle.make || null,
          year: existingVehicle.year || null,
          fuelType: existingVehicle.fuel_type || null,
          registrationDate: existingVehicle.registration_date,
          ownerName: existingVehicle.owner_name || null,
          chassisNumber: existingVehicle.chassis_number || null,
          engineNumber: existingVehicle.engine_number || null,
          registrationAuthority: existingVehicle.registration_authority || null,
          puccExpiry: existingVehicle.pollution_expiry,
          fitnessExpiry: null, // Not stored in current schema
          insuranceExpiry: existingVehicle.insurance_expiry,
          isFinanced: existingVehicle.is_financed || false,
          financer: existingVehicle.financer || null,
          permanentAddress: existingVehicle.permanent_address || null
        },
        cached: true,
        source: 'database'
      }), {
        headers: corsHeaders,
        status: 200
      });
    }

    // Call Lambda for fresh data
    const lambdaUrl = Deno.env.get('LAMBDA_URL');
    if (!lambdaUrl) {
      throw new Error('LAMBDA_URL not configured');
    }

    const payload = {
      service: 'rc',
      vehicleId: vehicleNumber,
    };
    console.log('Forwarding to Lambda:', payload);

    const res = await fetchLambda(lambdaUrl, payload);
    if (!res.parsed) {
      // Attempt fallback to last successful RC verification
      const { data: fallbackVerification } = await supabase
        .from('rc_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('vehicle_number', vehicleNumber)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackVerification && fallbackVerification.verification_data) {
        console.log('[RC] Using cached fallback data from rc_verifications');
        return new Response(
          JSON.stringify({ success: true, data: fallbackVerification.verification_data, cached: true, verifiedAt: fallbackVerification.created_at }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: false, error: 'Invalid Lambda response', details: res.rawText || 'Empty response' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const lambdaData = res.parsed;

    if (!lambdaSucceeded(res)) {
      // Try fallback to last successful RC verification if available
      const { data: fallbackVerification } = await supabase
        .from('rc_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('vehicle_number', vehicleNumber)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Log failed verification
      await supabase
        .from('rc_verifications')
        .insert({
          user_id: userId,
          vehicle_number: vehicleNumber,
          status: 'failed',
          error_message: lambdaData?.error || lambdaData?.message || res.rawText || 'Unknown error',
        });

      if (fallbackVerification && fallbackVerification.verification_data) {
        console.log('[RC] Using cached data after failure');
        return new Response(JSON.stringify({ success: true, data: fallbackVerification.verification_data, cached: true, verifiedAt: fallbackVerification.created_at }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: false, error: lambdaData?.error || lambdaData?.message || 'Verification failed', details: res.rawText?.slice(0, 500) }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update/create vehicle record with RC data - Enhanced with logging
    const r = lambdaData.response || lambdaData.data || lambdaData.result || {};
    console.log('RC Lambda raw response data:', JSON.stringify(r, null, 2));

    const rcData = {
      number: r.license_plate ?? r.vehicle_number ?? r.registrationNumber ?? vehicleNumber,
      model: r.brand_model ?? r.model ?? r.vehicleModel ?? 'Not specified',
      make: r.brand_name ?? r.make ?? r.maker ?? null,
      year: r.manufacturing_date_formatted
        ? parseInt(String(r.manufacturing_date_formatted).split('-')[0])
        : (r.mfgYear ?? r.manufacturing_year ?? r.year ?? null),
      fuelType: r.fuel_type ?? r.fuelType ?? null,
      registrationDate: r.registration_date ?? r.registrationDate ?? null,
      ownerName: r.owner_name ?? r.ownerName ?? null,
      chassisNumber: r.chassis_number ?? r.chassis_no ?? r.chassisNumber ?? r.chassis ?? null,
      engineNumber: r.engine_number ?? r.engine_no ?? r.engineNumber ?? r.engine ?? null,
      registrationAuthority: r.rto_name ?? r.registration_authority ?? r.registrationAuthority ?? null,
      puccExpiry: r.pucc_upto ?? r.pollution_expiry ?? r.puccExpiry ?? null,
      fitnessExpiry: r.fit_up_to ?? r.fitness_expiry ?? r.fitnessExpiry ?? null,
      insuranceExpiry: r.insurance_expiry ?? r.insuranceExpiry ?? null,
      isFinanced: r.is_financed ?? r.isFinanced ?? false,
      financer: r.financer ?? null,
      permanentAddress: r.permanent_address ?? r.permanentAddress ?? null
    };

    console.log('Parsed RC data for frontend:', JSON.stringify(rcData, null, 2));

const vehicleData = {
      user_id: userId,
      number: vehicleNumber,
      model: rcData.model,
      make: rcData.make,
      year: rcData.year,
      fuel_type: rcData.fuelType,
      registration_date: toDateOrNull(rcData.registrationDate),
      owner_name: rcData.ownerName,
      chassis_number: rcData.chassisNumber,
      engine_number: rcData.engineNumber,
      registration_authority: rcData.registrationAuthority,
      insurance_expiry: toDateOrNull(rcData.insuranceExpiry),
      pollution_expiry: toDateOrNull(rcData.puccExpiry),
      registration_expiry: toDateOrNull(r.registration_expiry ?? r.registration_valid_upto ?? null),
      fit_up_to: toDateOrNull(rcData.fitnessExpiry),
      manufacturing_date: toDateOrNull(r.manufacturing_date_formatted ?? r.manufacturing_date ?? null),
      is_financed: rcData.isFinanced,
      financer: rcData.financer,
      permanent_address: rcData.permanentAddress,
      rc_verified_at: new Date().toISOString(),
      rc_verification_status: 'verified',
      last_rc_refresh: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Vehicle data to save to database:', JSON.stringify(vehicleData, null, 2));

    // Save to database with error handling
    let saveResult;
    if (existingVehicle) {
      saveResult = await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', existingVehicle.id)
        .select();
    } else {
      saveResult = await supabase
        .from('vehicles')
        .insert({ ...vehicleData, status: 'active' })
        .select();
    }

    if (saveResult.error) {
      console.error('CRITICAL: Failed to save RC data to database:', saveResult.error);
      console.error('Vehicle data that failed to save:', JSON.stringify(vehicleData, null, 2));
      
      // Log failed verification
      await supabase
        .from('rc_verifications')
        .insert({
          user_id: userId,
          vehicle_number: vehicleNumber,
          status: 'failed',
          error_message: `DB save error: ${saveResult.error.message || 'unknown'}`,
          verification_data: rcData,
          request_id: r.request_id || null
        });
      
      // Return failure since DB save failed
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to save vehicle data',
        details: saveResult.error.message
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('SUCCESS: RC data saved to database:', saveResult.data);
      
      // Log successful verification
      await supabase
        .from('rc_verifications')
        .insert({
          user_id: userId,
          vehicle_number: vehicleNumber,
          status: 'completed',
          verification_data: rcData,
          request_id: r.request_id || null
        });
    }

    console.log('Final RC response being sent to frontend:', JSON.stringify(rcData, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: rcData, 
        cached: false, 
        source: 'api',
        verifiedAt: new Date().toISOString() 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('RC verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'RC verification failed',
      details: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleFastagVerification(supabase: any, userId: string, vehicleNumber: string) {
  try {
    // Check for recent cached data (within 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentVerification } = await supabase
      .from('fastag_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('vehicle_number', vehicleNumber)
      .eq('status', 'completed')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentVerification && recentVerification.verification_data) {
      console.log('Returning cached FASTag data');
      
      // Update vehicle with cached data - FIXED: Use correct fasttag_* column names
      await supabase
        .from('vehicles')
        .update({
          fasttag_balance: recentVerification.verification_data.balance || 0,
          fasttag_linked: recentVerification.verification_data.linked || false,
          fasttag_last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('number', vehicleNumber);

      return new Response(JSON.stringify({
        success: true,
        data: recentVerification.verification_data,
        cached: true,
        verifiedAt: recentVerification.created_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create pending verification record
    const { data: pendingRecord } = await supabase
      .from('fastag_verifications')
      .insert({
        user_id: userId,
        vehicle_number: vehicleNumber,
        status: 'pending'
      })
      .select()
      .single();

    // Call Lambda for fresh data
    const lambdaUrl = Deno.env.get('LAMBDA_URL');
    if (!lambdaUrl) {
      throw new Error('LAMBDA_URL not configured');
    }

    const payload = {
      service: 'fastag',
      vehicleId: vehicleNumber,
    };
    console.log('Forwarding to Lambda:', payload);

    // Fast path retry logic tuned for <20s total
    const startMs = Date.now();
    let res = await fetchLambda(lambdaUrl, payload, 12000);
    
    // Single quick retry on transient errors/timeouts
    if ((!res.parsed || res.status === 0 || res.status === 502)) {
      const elapsed1 = Date.now() - startMs;
      console.log(`[FASTag] First attempt elapsed ${elapsed1}ms; quick retry after 1500ms...`);
      await new Promise((r) => setTimeout(r, 1500));
      res = await fetchLambda(lambdaUrl, payload, 10000);
    }
    const totalElapsed = Date.now() - startMs;
    console.log(`[FASTag] Lambda attempts total elapsed: ${totalElapsed}ms`);
    // Phase 2: Progressive fallback - always return 200 with error details
    if (!res.parsed) {
      console.log('[FASTag] Lambda returned invalid response, checking for fallback data...');
      
      // Try progressive fallback: 6-hour cache → any historical data
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      
      let fallbackData = await supabase
        .from('fastag_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('vehicle_number', vehicleNumber)
        .eq('status', 'completed')
        .gte('created_at', sixHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // If no 6-hour cache, try any historical data
      if (!fallbackData.data) {
        fallbackData = await supabase
          .from('fastag_verifications')
          .select('*')
          .eq('user_id', userId)
          .eq('vehicle_number', vehicleNumber)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
        .maybeSingle();
      }
      
      if (fallbackData.data && fallbackData.data.verification_data) {
        console.log('[FASTag] Using historical fallback data');
        const dataAge = Date.now() - new Date(fallbackData.data.created_at).getTime();
        const ageHours = Math.floor(dataAge / (1000 * 60 * 60));
        
        // Update vehicle with fallback data
        await supabase
          .from('vehicles')
          .update({
            fasttag_balance: fallbackData.data.verification_data.balance || 0,
            fasttag_linked: fallbackData.data.verification_data.linked || false,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('number', vehicleNumber);
        
        return new Response(JSON.stringify({
          success: false,
          error: 'Live verification failed, showing historical data',
          details: `Data is ${ageHours} hours old - service temporarily unavailable`,
          data: fallbackData.data.verification_data,
          cached: true,
          verifiedAt: fallbackData.data.created_at,
          dataAge: `${ageHours} hours ago`
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Service temporarily unavailable', 
        details: 'No cached data available - please try again later'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const lambdaData = res.parsed;
    console.log('[FASTag] Raw Lambda response:', JSON.stringify(lambdaData, null, 2));

    if (lambdaSucceeded(res)) {
      const r = lambdaData.response || lambdaData.data || lambdaData.result || lambdaData || {};
      console.log('[FASTag] Extracted response data:', JSON.stringify(r, null, 2));
      
      const fastagData = {
        balance: parseFloat(r.available_balance || r.balance || r.current_balance || 0),
        linked: (r.tag_status || r.status || '').toLowerCase() === 'active' || 
                (r.tag_status || r.status || '').toLowerCase() === 'linked' ||
                Boolean(r.tag_id || r.tagId),
        tagId: r.tag_id || r.tagId || r.fasttag_id || undefined,
        status: r.tag_status || r.status || r.fastag_status || 'unknown',
        lastTransactionDate: r.last_transaction_date || r.lastTransactionDate || r.last_txn_date || undefined,
        vehicleNumber: r.vehicle_number || r.vehicleNumber || r.license_plate || vehicleNumber,
        bankName: r.bank_name || r.bankName || r.issuing_bank || r.issuer || undefined,
      };
      
      console.log('[FASTag] Mapped FASTag data:', JSON.stringify(fastagData, null, 2));

      // Update verification record with success
      await supabase
        .from('fastag_verifications')
        .update({
          status: 'completed',
          verification_data: fastagData,
        })
        .eq('id', pendingRecord.id);

      // Update vehicle with fresh data
      await supabase
        .from('vehicles')
        .update({
          fasttag_balance: fastagData.balance,
          fasttag_linked: fastagData.linked,
          fasttag_last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('number', vehicleNumber);

      return new Response(
        JSON.stringify({ success: true, data: fastagData, cached: false, verifiedAt: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Lambda failed - try to fallback to any cached data
      const { data: fallbackVerification } = await supabase
        .from('fastag_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('vehicle_number', vehicleNumber)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Update pending record with failure
      await supabase
        .from('fastag_verifications')
        .update({
          status: 'failed',
          error_message: lambdaData?.error || lambdaData?.message || res.rawText || 'Timeout/Network error',
        })
        .eq('id', pendingRecord.id);

      if (fallbackVerification && fallbackVerification.verification_data) {
        console.log('Using stale FASTag data as fallback');
        
        // Update vehicle with stale data
        await supabase
          .from('vehicles')
          .update({
            fasttag_balance: fallbackVerification.verification_data.balance || 0,
            fasttag_linked: fallbackVerification.verification_data.linked || false,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('number', vehicleNumber);

        return new Response(JSON.stringify({
          success: false,
          error: 'Live verification failed, showing cached data',
          details: lambdaData?.error || 'Service temporarily unavailable',
          data: fallbackVerification.verification_data,
          cached: true,
          verifiedAt: fallbackVerification.created_at
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: false,
        error: lambdaData?.error || lambdaData?.message || 'Service temporarily unavailable',
        details: res.rawText?.slice(0, 500) || 'Network timeout - please try again'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('FASTag verification error:', error);
    
    // Phase 2: Graceful error handling - always return 200
    // Try to get any cached data as last resort
    try {
      const { data: emergencyFallback } = await supabase
        .from('fastag_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('vehicle_number', vehicleNumber)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (emergencyFallback && emergencyFallback.verification_data) {
        console.log('[FASTag] Emergency fallback to any available data');
        const dataAge = Date.now() - new Date(emergencyFallback.created_at).getTime();
        const ageHours = Math.floor(dataAge / (1000 * 60 * 60));
        
        return new Response(JSON.stringify({
          success: false,
          error: 'System error occurred, showing last known data',
          details: `Data is ${ageHours} hours old`,
          data: emergencyFallback.verification_data,
          cached: true,
          verifiedAt: emergencyFallback.created_at,
          dataAge: `${ageHours} hours ago`
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (fallbackError) {
      console.error('Emergency fallback also failed:', fallbackError);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'System temporarily unavailable',
      details: 'Please try again in a few minutes'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleChallansVerification(supabase: any, userId: string, vehicleNumber: string, chassis?: string, engine_no?: string, forceRefresh = false) {
  try {
    // Defensive fetching of chassis and engine numbers if missing
    if (!chassis || !engine_no) {
      console.log('Missing chassis/engine numbers, fetching from database...');
      const { data: vehicleData } = await supabase
        .from('vehicles')
        .select('chassis_number, engine_number')
        .eq('user_id', userId)
        .eq('number', vehicleNumber)
        .maybeSingle();
      
      if (vehicleData) {
        chassis = chassis || vehicleData.chassis_number;
        engine_no = engine_no || vehicleData.engine_number;
        console.log('Fetched from DB - chassis:', !!chassis, 'engine:', !!engine_no);
      }
      
      if (!chassis || !engine_no) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Chassis and engine numbers are required for challan verification', 
          details: 'Please complete RC verification first to get these details'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    // Check for recent cached data (within 30 minutes) unless force refresh
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    let recentVerification = null;
    
    if (!forceRefresh) {
      const { data } = await supabase
        .from('challan_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('vehicle_number', vehicleNumber)
        .eq('status', 'completed')
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      recentVerification = data;
    }

    if (recentVerification && recentVerification.verification_data) {
      console.log('Returning cached Challans data:', recentVerification.verification_data);
      
      // Normalize cached data structure
      let normalizedData = recentVerification.verification_data;
      
      // Handle different cached data structures
      if (normalizedData.response && !normalizedData.challans) {
        normalizedData = {
          ...normalizedData.response,
          vehicleNumber,
          count: normalizedData.response.challans ? normalizedData.response.challans.length : 0
        };
      } else if (!normalizedData.challans && normalizedData.data) {
        normalizedData = {
          challans: normalizedData.data,
          vehicleNumber,
          count: Array.isArray(normalizedData.data) ? normalizedData.data.length : 0
        };
      }
      
      // Ensure challans is always an array
      if (!Array.isArray(normalizedData.challans)) {
        normalizedData.challans = [];
      }
      
      // Update vehicle with cached challan count
      await supabase
        .from('vehicles')
        .update({
          challans_count: normalizedData.challans.length,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('number', vehicleNumber);

      return new Response(JSON.stringify({
        success: true,
        data: normalizedData,
        cached: true,
        verifiedAt: recentVerification.created_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create pending verification record
    const { data: pendingRecord } = await supabase
      .from('challan_verifications')
      .insert({
        user_id: userId,
        vehicle_number: vehicleNumber,
        status: 'pending'
      })
      .select()
      .single();

    // Call Lambda for fresh data
    const lambdaUrl = Deno.env.get('LAMBDA_URL');
    if (!lambdaUrl) {
      throw new Error('LAMBDA_URL not configured');
    }

    const payload = {
      service: 'challans',
      vehicleId: vehicleNumber,
      chassis,
      engine_no,
    };
    console.log('Forwarding to Lambda:', payload);
    // Increase timeout for challans (can be slower upstream)
    const startMs = Date.now();
    let res = await fetchLambda(lambdaUrl, payload, 45000);
    
    // Single retry on timeout/network errors after 30s fallback check
    if (!res.parsed || res.status === 0 || res.status === 502) {
      const elapsed1 = Date.now() - startMs;
      console.log(`[Challans] First attempt elapsed ${elapsed1}ms; checking cache before retry...`);
      
      // Check for any cached data as fallback before retry
      const { data: fallbackData } = await supabase
        .from('challan_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('vehicle_number', vehicleNumber)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fallbackData && fallbackData.verification_data && elapsed1 > 30000) {
        console.log('[Challans] Using cached fallback after 30s timeout');
        // Update vehicle with cached data
        await supabase
          .from('vehicles')
          .update({
            challans_count: Array.isArray(fallbackData.verification_data.challans) 
              ? fallbackData.verification_data.challans.length 
              : 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('number', vehicleNumber);
          
        return new Response(JSON.stringify({
          success: true,
          data: fallbackData.verification_data,
          cached: true,
          verifiedAt: fallbackData.created_at,
          warning: 'Live service timeout, showing cached data'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Quick retry if no cached data or under 30s
      if (elapsed1 < 30000) {
        console.log('[Challans] Quick retry after network error...');
        await new Promise((r) => setTimeout(r, 2000));
        res = await fetchLambda(lambdaUrl, payload, 15000);
      }
    }
    
    const totalElapsed = Date.now() - startMs;
    console.log(`[Challans] Total elapsed: ${totalElapsed}ms`);
    console.log('[Lambda] Raw response:', res.rawText);
    if (!res.parsed) {
      // Final fallback to any historical data
      const { data: emergencyFallback } = await supabase
        .from('challan_verifications')
        .select('*')
        .eq('user_id', userId)
        .eq('vehicle_number', vehicleNumber)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (emergencyFallback && emergencyFallback.verification_data) {
        console.log('[Challans] Using emergency fallback data');
        return new Response(JSON.stringify({
          success: true,
          data: emergencyFallback.verification_data,
          cached: true,
          verifiedAt: emergencyFallback.created_at,
          warning: 'Service unavailable, showing last known data'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Service temporarily unavailable', 
          details: 'Unable to fetch live data and no cached data available',
          retryAfter: 300 // 5 minutes
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const lambdaData = res.parsed;

    if (lambdaSucceeded(res)) {
      console.log('[Lambda] Parsed response:', JSON.stringify(lambdaData, null, 2));
      
      // Note: Detect potential RC-shaped data but do not intercept; log only
      const r = lambdaData.response || lambdaData.data || lambdaData.result || lambdaData;
      
      // If response contains RC-specific fields, just warn and continue
      if (r && (r.registrationDate || r.ownerName || r.model || r.engineNumber)) {
        console.warn('[Lambda] Warning: Response appears RC-shaped while requesting Challans. Continuing without altering the response.');
      }
      
      let challansArray = [] as any[];
      let parsePath = 'unknown';
      
      if (Array.isArray(r.challans)) {
        challansArray = r.challans;
        parsePath = 'r.challans';
      } else if (Array.isArray(r.response?.challans)) {
        // PROD case: nested challans array
        challansArray = r.response.challans;
        parsePath = 'r.response.challans';
      } else if (Array.isArray(r.data)) {
        challansArray = r.data;
        parsePath = 'r.data';
      } else if (Array.isArray(r.results)) {
        challansArray = r.results;
        parsePath = 'r.results';
      } else if (Array.isArray(r)) {
        challansArray = r;
        parsePath = 'r(root array)';
      }
      
      console.log('[Challans] Parse path:', parsePath, 'count:', challansArray.length);
      
      console.log('[Lambda] Extracted challans array:', challansArray);

      const challansData = {
        challans: challansArray,
        vehicleNumber,
        count: challansArray.length,
        total: Number(r.total ?? challansArray.length),
        request_id: r.request_id || lambdaData.request_id
      };

      // Update verification record with success
      await supabase
        .from('challan_verifications')
        .update({
          status: 'completed',
          verification_data: challansData,
        })
        .eq('id', pendingRecord.id);

      // Update vehicle with challan count
      await supabase
        .from('vehicles')
        .update({
          challans_count: challansData.count,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('number', vehicleNumber);

      return new Response(
        JSON.stringify({ success: true, data: challansData, cached: false, verifiedAt: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update verification record with failure
      await supabase
        .from('challan_verifications')
        .update({
          status: 'failed',
          error_message: lambdaData?.error || lambdaData?.message || res.rawText || 'Unknown error',
        })
        .eq('id', pendingRecord.id);

      return new Response(
        JSON.stringify({ success: false, error: lambdaData?.error || lambdaData?.message || 'Verification failed', details: res.rawText?.slice(0, 500) }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Challans verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Challans verification failed',
      details: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}