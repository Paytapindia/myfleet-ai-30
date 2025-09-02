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

    // Get AWS API Gateway URL from secrets
    const awsApiGatewayUrl = Deno.env.get('AWS_API_GATEWAY_URL')
    
    if (!awsApiGatewayUrl) {
      console.error('AWS_API_GATEWAY_URL not configured')
      return new Response(
        JSON.stringify({ error: 'AWS API Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calling AWS API Gateway', {
      url: awsApiGatewayUrl,
      vehicleNumber,
    })

    // Construct a payload compatible with multiple Lambda expectations
    const payload = {
      vehicleId: vehicleNumber,
      rc_number: vehicleNumber,
      registrationNumber: vehicleNumber,
    }
    console.log('AWS request payload preview:', payload)

    // Call AWS API Gateway -> Lambda -> APIClub (with timeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const apiResponse = await fetch(awsApiGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    console.log('AWS API Gateway response status:', apiResponse.status)

    if (!apiResponse.ok) {
      const errText = await apiResponse.text()
      console.error('AWS API Gateway error:', apiResponse.status, errText)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RC verification failed',
          details: `AWS API Gateway error ${apiResponse.status}${errText ? ` - ${errText.slice(0, 200)}` : ''}` 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        number: response.license_plate || response.rc_number || response.registration_number || vehicleNumber,
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