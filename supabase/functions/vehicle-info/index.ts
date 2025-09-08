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
        status: 401,
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON in request' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Incoming request body:', rawBody);
    const { type, vehicleNumber, vehicleId, chassis, engine_no } = rawBody;

    // Validate request
    if (!type || !(vehicleNumber || vehicleId)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing required params: type, vehicleId' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate service type
    if (!['rc', 'fastag', 'challan'].includes(type)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid service type. Must be: rc, fastag, or challan' 
      }), {
        status: 400,
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
        if (!chassis || !engine_no) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Chassis and engine_no are required for challan verification' 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return await handleChallansVerification(supabase, user.id, vehicleNumber || vehicleId, chassis, engine_no, rawBody.forceRefresh);
      
      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Unknown service type' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    console.error('Vehicle Info API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper: fetch with timeout and robust parsing of Lambda responses
const DEFAULT_TIMEOUT_MS = 15000;
async function fetchLambda(url: string, payload: Record<string, any>, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let rawText = '';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    // Accept common APIclub shapes as success too
    if (res.ok && (d.data || d.result || d.payload || d.response)) return true;
    // Heuristic: nested response object contains FASTag fields
    const r = (d as any).response;
    if (r && typeof r === 'object') {
      if ('tag_status' in r || 'balance' in r || 'tagId' in r || 'tag_id' in r) return true;
    }
  }
  return false;
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
      console.log('Returning cached RC data');
      return new Response(JSON.stringify({
        success: true,
        data: {
          number: existingVehicle.number,
          model: existingVehicle.model || '',
          make: existingVehicle.make,
          year: existingVehicle.year,
          fuelType: existingVehicle.fuel_type,
          registrationDate: existingVehicle.registration_date,
          ownerName: existingVehicle.owner_name,
          chassisNumber: existingVehicle.chassis_number,
          engineNumber: existingVehicle.engine_number,
          registrationAuthority: existingVehicle.registration_authority,
          fitnessExpiry: existingVehicle.fitness_expiry,
          puccExpiry: existingVehicle.pucc_expiry,
          insuranceExpiry: existingVehicle.insurance_expiry
        },
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Lambda for fresh data
    const lambdaUrl = Deno.env.get('LAMBDA_URL');
    if (!lambdaUrl) {
      throw new Error('LAMBDA_URL not configured');
    }

    const payload = {
      type: 'rc',
      vehicleId: vehicleNumber,
    };
    console.log('Forwarding to Lambda:', payload);

    const res = await fetchLambda(lambdaUrl, payload);
    if (!res.parsed) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid Lambda response', details: res.rawText || 'Empty response' }), {
        status: res.status || 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const lambdaData = res.parsed;

    if (!lambdaSucceeded(res)) {
      // Log failed verification
      await supabase
        .from('rc_verifications')
        .insert({
          user_id: userId,
          vehicle_number: vehicleNumber,
          status: 'failed',
          error_message: lambdaData?.error || lambdaData?.message || res.rawText || 'Unknown error',
        });

      return new Response(JSON.stringify({ success: false, error: lambdaData?.error || lambdaData?.message || 'Verification failed', details: res.rawText?.slice(0, 500) }), {
        status: res.status || 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update/create vehicle record with RC data
    const vehicleData = {
      user_id: userId,
      number: vehicleNumber,
      model: lambdaData.data.model || 'Not specified',
      make: lambdaData.data.make,
      year: lambdaData.data.year ? parseInt(lambdaData.data.year) : null,
      fuel_type: lambdaData.data.fuelType,
      registration_date: lambdaData.data.registrationDate,
      owner_name: lambdaData.data.ownerName,
      chassis_number: lambdaData.data.chassisNumber,
      engine_number: lambdaData.data.engineNumber,
      registration_authority: lambdaData.data.registrationAuthority,
      fitness_expiry: lambdaData.data.fitnessExpiry,
      pucc_expiry: lambdaData.data.puccExpiry,
      insurance_expiry: lambdaData.data.insuranceExpiry,
      rc_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingVehicle) {
      await supabase
        .from('vehicles')
        .update(vehicleData)
        .eq('id', existingVehicle.id);
    } else {
      await supabase
        .from('vehicles')
        .insert({ ...vehicleData, status: 'active' });
    }

    // Log verification
    await supabase
      .from('rc_verifications')
      .insert({
        user_id: userId,
        vehicle_number: vehicleNumber,
        status: 'completed',
        verification_data: lambdaData.data
      });

    return new Response(JSON.stringify(lambdaData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('RC verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'RC verification failed',
      details: error.message
    }), {
      status: 500,
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
      .single();

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
      type: 'fastag',
      vehicleId: vehicleNumber,
    };
    console.log('Forwarding to Lambda:', payload);

    // Enhanced retry logic with exponential backoff - Phase 3 implementation
    let res = await fetchLambda(lambdaUrl, payload, 30000);
    
    // Retry up to 2 times with exponential backoff for timeouts/502s
    const maxRetries = 2;
    let retryDelay = 1000; // Start with 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (res.parsed && lambdaSucceeded(res)) break;
      
      if (res.status === 502 || res.status === 0 || !res.parsed) {
        console.log(`[FASTag] Retry ${attempt}/${maxRetries} after ${retryDelay}ms delay...`);
        await new Promise((r) => setTimeout(r, retryDelay));
        res = await fetchLambda(lambdaUrl, payload, 30000);
        retryDelay *= 2; // Exponential backoff: 1s, 2s
      } else {
        break; // Don't retry on other errors
      }
    }
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
        .single();
      
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
          .single();
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

    if (lambdaSucceeded(res)) {
      const r = lambdaData.response || lambdaData.data || lambdaData.result || {};
      const fastagData = {
        balance: typeof r.balance === 'number' ? r.balance : 0,
        linked: typeof r.tag_status === 'string' ? r.tag_status.toLowerCase() === 'active' : false,
        tagId: r.tag_id ?? r.tagId ?? undefined,
        status: r.tag_status ?? r.status ?? undefined,
        lastTransactionDate: r.last_transaction_date ?? r.lastTransactionDate ?? undefined,
        vehicleNumber: r.vehicle_number ?? r.vehicleNumber ?? vehicleNumber,
        bankName: r.bank_name ?? r.bankName ?? undefined,
      };

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
        .single();

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
        .single();
        
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

async function handleChallansVerification(supabase: any, userId: string, vehicleNumber: string, chassis: string, engine_no: string, forceRefresh = false) {
  try {
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
        .single();
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
      type: 'challan',
      vehicleId: vehicleNumber,
      chassis,
      engine_no,
    };
    console.log('Forwarding to Lambda:', payload);
    // Increase timeout for challans (can be slower upstream)
    const res = await fetchLambda(lambdaUrl, payload, 30000);
    console.log('[Lambda] Raw response:', res.rawText);
    if (!res.parsed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid Lambda response', details: res.rawText || 'Empty response' }),
        {
          status: res.status || 502,
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
        { status: res.status || 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Challans verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Challans verification failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}