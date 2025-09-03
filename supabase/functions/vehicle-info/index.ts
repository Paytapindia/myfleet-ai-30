import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const lambdaData = await lambdaResponse.json();

    if (!lambdaData.success) {
      return new Response(JSON.stringify(lambdaData), {
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
    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const lambdaData = await lambdaResponse.json();

    if (lambdaData.success && lambdaData.data) {
      // Update verification record with success
      await supabase
        .from('fastag_verifications')
        .update({
          status: 'completed',
          response_data: lambdaData.data
        })
        .eq('id', pendingRecord.id);

      // Update vehicle with fresh data
      await supabase
        .from('vehicles')
        .update({
          fastag_balance: lambdaData.data.balance,
          fastag_linked: lambdaData.data.linked,
          fastag_tag_id: lambdaData.data.tagId,
          fastag_status: lambdaData.data.status,
          fastag_bank_name: lambdaData.data.bankName,
          fastag_last_transaction_date: lambdaData.data.lastTransactionDate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('number', vehicleNumber);
    } else {
      // Update verification record with failure
      await supabase
        .from('fastag_verifications')
        .update({
          status: 'failed',
          error_message: lambdaData.error || 'Unknown error'
        })
        .eq('id', pendingRecord.id);
    }

    return new Response(JSON.stringify(lambdaData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
            challan_count: recentVerification.response_data.challans.length,
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
    const lambdaResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const lambdaData = await lambdaResponse.json();

    if (lambdaData.success && lambdaData.data) {
      // Update verification record with success
      await supabase
        .from('challan_verifications')
        .update({
          status: 'completed',
          response_data: lambdaData.data
        })
        .eq('id', pendingRecord.id);

      // Update vehicle with challan count
      if (lambdaData.data.challans) {
        await supabase
          .from('vehicles')
          .update({
            challan_count: lambdaData.data.challans.length,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('number', vehicleNumber);
      }
    } else {
      // Update verification record with failure
      await supabase
        .from('challan_verifications')
        .update({
          status: 'failed',
          error_message: lambdaData.error || 'Unknown error'
        })
        .eq('id', pendingRecord.id);
    }

    return new Response(JSON.stringify(lambdaData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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