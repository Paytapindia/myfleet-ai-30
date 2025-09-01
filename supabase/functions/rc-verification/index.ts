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

    // Get Pipedream webhook URL and proxy token from secrets
    const pipedreamUrl = Deno.env.get('PIPEDREAM_WEBHOOK_URL')
    const proxyToken = Deno.env.get('SHARED_PROXY_TOKEN')
    
    if (!pipedreamUrl) {
      console.error('PIPEDREAM_WEBHOOK_URL not configured')
      return new Response(
        JSON.stringify({ error: 'Pipedream webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build request headers for Pipedream webhook
    const requestHeaders: Record<string, string> = {
      'content-type': 'application/json',
    }

    // Add authentication headers if configured
    if (proxyToken) {
      requestHeaders['x-proxy-token'] = proxyToken
    }

    console.log('Calling Pipedream webhook', {
      url: pipedreamUrl,
      vehicleNumber,
      hasProxyToken: Boolean(proxyToken),
    })

    // Call Pipedream webhook -> AWS Lambda -> API Club
    const apiResponse = await fetch(pipedreamUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        vehicleNumber,
        rc_number: vehicleNumber,
      })
    })

    console.log('Pipedream webhook response status:', apiResponse.status)

    if (!apiResponse.ok) {
      const errText = await apiResponse.text()
      console.error('Pipedream webhook error:', apiResponse.status, errText)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RC verification failed',
          details: `Webhook error ${apiResponse.status}` 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const raw = await apiResponse.json()
    console.log('Pipedream webhook response received', { success: raw.success })

    // Re-normalize AWS response for UI compatibility
    const normalizeData = (api: any) => {
      const src = api?.data ?? api ?? {}
      return {
        number: src.rc_number || src.registration_number || src.regn_no || vehicleNumber,
        model: src.model || src.Model || '',
        make: src.make || src.Make || '',
        year: (src.mfg_year || src.year || src.manufacturing_year)?.toString() || '',
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

    console.log(`RC verification completed for vehicle: ${vehicleNumber}`)

    return new Response(
      JSON.stringify({ success: true, data: normalized }),
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