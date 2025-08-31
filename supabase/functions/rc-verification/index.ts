import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { vehicleNumber } = await req.json()

    if (!vehicleNumber) {
      return new Response(
        JSON.stringify({ error: 'Vehicle number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`RC verification requested for vehicle: ${vehicleNumber} by user: ${user.id}`)

    // Check if we already have a recent verification for this vehicle
    const { data: existingVerification } = await supabaseClient
      .from('rc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('vehicle_number', vehicleNumber)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // If we have a recent completed verification (within 24 hours), return it
    if (existingVerification) {
      const verificationAge = Date.now() - new Date(existingVerification.created_at).getTime()
      const oneDay = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
      
      if (verificationAge < oneDay) {
        console.log(`Returning cached verification for vehicle: ${vehicleNumber}`)
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            data: existingVerification.verification_data
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create a new verification request
    const { data: newVerification, error: insertError } = await supabaseClient
      .from('rc_verifications')
      .insert({
        user_id: user.id,
        vehicle_number: vehicleNumber,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating verification request:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create verification request' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Configure AWS Lambda API Gateway endpoint (static IP egress)
    const lambdaUrl = Deno.env.get('AWS_LAMBDA_RC_URL')
    const proxyToken = Deno.env.get('AWS_LAMBDA_PROXY_TOKEN')
    
    if (!lambdaUrl) {
      console.error('AWS_LAMBDA_RC_URL not found')
      await supabaseClient
        .from('rc_verifications')
        .update({
          status: 'failed',
          error_message: 'AWS Lambda endpoint not configured'
        })
        .eq('id', newVerification.id)

      return new Response(
        JSON.stringify({ error: 'Lambda configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update status to processing
    await supabaseClient
      .from('rc_verifications')
      .update({ 
        status: 'processing',
        request_id: newVerification.id // Use our internal ID as request ID for now
      })
      .eq('id', newVerification.id)

    // Make the API call via AWS Lambda API Gateway (synchronous)
    const requestHeaders: Record<string, string> = {
      'content-type': 'application/json',
    }
    
    // Add proxy token if configured
    if (proxyToken) {
      requestHeaders['x-proxy-token'] = proxyToken
    }
    
    const apiResponse = await fetch(lambdaUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        vehicleNumber,
        rc_number: vehicleNumber,
        request_id: newVerification.id,
      })
    })

    if (!apiResponse.ok) {
      const errText = await apiResponse.text()
      console.error('AWS Lambda API error:', apiResponse.status, errText)

      await supabaseClient
        .from('rc_verifications')
        .update({
          status: 'failed',
          error_message: `Lambda error ${apiResponse.status}: ${errText?.slice(0, 300)}`
        })
        .eq('id', newVerification.id)

      return new Response(
        JSON.stringify({ success: false, error: 'RC lookup failed via Lambda. Please try again later.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const raw = await apiResponse.json()
    console.log('AWS Lambda response received')

    // Normalize APICLUB response to our app schema
    const normalizeData = (api: any) => {
      const src = api?.data ?? api ?? {}
      return {
        number: src.rc_number || src.registration_number || src.regn_no || vehicleNumber,
        model: src.model || src.Model || '',
        make: src.make || src.Make || '',
        year: (src.mfg_year || src.year || src.manufacturing_year)?.toString() || (src.registration_date ? new Date(src.registration_date).getFullYear().toString() : undefined),
        fuelType: src.fuel_type || src.fuel || '',
        registrationDate: src.registration_date || src.regn_dt || '',
        ownerName: src.owner_name || src.owner || '',
        chassisNumber: src.chassis_number || src.chassis_no || src.chassisNo || '',
        engineNumber: src.engine_number || src.engine_no || src.engineNo || '',
        registrationAuthority: src.registering_authority || src.rto || src.registration_authority || '',
        fitnessExpiry: src.fitness_upto || src.fitnessExpiry || '',
        puccExpiry: src.pucc_upto || src.puc_valid_upto || src.puccExpiry || '',
        insuranceExpiry: src.insurance_valid_upto || src.insuranceExpiry || '',
      }
    }

    const normalized = normalizeData(raw)

    await supabaseClient
      .from('rc_verifications')
      .update({
        status: 'completed',
        verification_data: normalized
      })
      .eq('id', newVerification.id)

    console.log(`Verification completed for vehicle: ${vehicleNumber}`)

    return new Response(
      JSON.stringify({ success: true, data: normalized }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('RC verification error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})