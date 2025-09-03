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
        return await handleChallansVerification(supabase, user.id, vehicleNumber || vehicleId, chassis, engine_no);
      
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
    if (res.ok && (d.data || d.result || d.payload)) return true;
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
        response_data: lambdaData.data
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

    if (recentVerification && recentVerification.response_data) {
      console.log('Returning cached FASTag data');
      
      // Update vehicle with cached data
      await supabase
        .from('vehicles')
        .update({
          fastag_balance: recentVerification.response_data.balance,
          fastag_linked: recentVerification.response_data.linked,
          fastag_tag_id: recentVerification.response_data.tagId,
          fastag_status: recentVerification.response_data.status,
          fastag_bank_name: recentVerification.response_data.bankName,
          fastag_last_transaction_date: recentVerification.response_data.lastTransactionDate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('number', vehicleNumber);

      return new Response(JSON.stringify({
        success: true,
        data: recentVerification.response_data,
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

    // Increase timeout for FASTag (can be slower upstream) and add a single retry for 502/timeout
    let res = await fetchLambda(lambdaUrl, payload, 30000);
    if ((!res.parsed || !lambdaSucceeded(res)) && (res.status === 502 || res.status === 0)) {
      console.log('[FASTag] Retrying once after timeout/502...');
      await new Promise((r) => setTimeout(r, 1500));
      res = await fetchLambda(lambdaUrl, payload, 30000);
    }
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
          response_data: fastagData,
        })
        .eq('id', pendingRecord.id);

      // Update vehicle with correct FASTag data (only update existing columns)
      await supabase
        .from('vehicles')
        .update({
          fasttag_balance: fastagData.balance || 0,
          fasttag_linked: fastagData.status?.toLowerCase() === 'active',
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
      // Update verification record with failure
      await supabase
        .from('fastag_verifications')
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
    console.error('FASTag verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'FASTag verification failed',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleChallansVerification(supabase: any, userId: string, vehicleNumber: string, chassis: string, engine_no: string) {
  try {
    // Check for recent cached data (within 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentVerification } = await supabase
      .from('challan_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('vehicle_number', vehicleNumber)
      .eq('status', 'completed')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentVerification && recentVerification.response_data) {
      console.log('Returning cached Challans data');
      
      // Update vehicle with cached challan count
      if (recentVerification.response_data.challans) {
        await supabase
          .from('vehicles')
          .update({
            challans_count: recentVerification.response_data.challans.length,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('number', vehicleNumber);
      }

      return new Response(JSON.stringify({
        success: true,
        data: recentVerification.response_data,
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
      const r = lambdaData.response || lambdaData.data || lambdaData.result || {};
      const challansArray = Array.isArray(r.challans)
        ? r.challans
        : Array.isArray(r.data)
        ? r.data
        : Array.isArray(r.results)
        ? r.results
        : [];

      const challansData = {
        challans: challansArray,
        vehicleNumber,
        count: Array.isArray(challansArray) ? challansArray.length : 0,
      };

      // Update verification record with success
      await supabase
        .from('challan_verifications')
        .update({
          status: 'completed',
          response_data: challansData,
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