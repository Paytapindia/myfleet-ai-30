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
    // Get the user token from the request and bind it to the Supabase client for RLS
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    )

    // Resolve the user for logic/validation
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication error:', authError)
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

    console.log('Processing FASTag verification for vehicle:', vehicleNumber)

    // Check if we have recent cached data (within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: cachedData, error: cacheError } = await supabase
      .from('fastag_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('vehicle_number', vehicleNumber)
      .eq('status', 'completed')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    if (cacheError) {
      console.error('Cache check error:', cacheError)
    }

    // If we have recent cached data, return it
    if (cachedData && cachedData.length > 0) {
      console.log('Returning cached FASTag data for vehicle:', vehicleNumber)
      
      // Update vehicle's last synced timestamp
      await supabase
        .from('vehicles')
        .update({ 
          fasttag_last_synced_at: new Date().toISOString(),
          fasttag_balance: cachedData[0].verification_data?.balance || 0,
          fasttag_linked: cachedData[0].verification_data?.linked || false
        })
        .eq('user_id', user.id)
        .eq('number', vehicleNumber)

      return new Response(
        JSON.stringify({
          success: true,
          data: cachedData[0].verification_data,
          cached: true,
          verifiedAt: cachedData[0].created_at
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create a pending verification record
    const { data: verification, error: createError } = await supabase
      .from('fastag_verifications')
      .insert({
        user_id: user.id,
        vehicle_number: vehicleNumber,
        status: 'pending'
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create verification record:', createError)
      return new Response(
        JSON.stringify({ error: 'Failed to create verification record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the AWS API Gateway URL from secrets (reuse the same Lambda as RC verification)
    // Try multiple env names for robustness
    const awsGatewayUrl =
      Deno.env.get('AWS_API_GATEWAY_URL') ||
      Deno.env.get('AWS_RC_API_GATEWAY_URL') ||
      Deno.env.get('AWS_RC_API_URL') ||
      Deno.env.get('AWS_GATEWAY_URL')
    const proxyToken = Deno.env.get('SHARED_PROXY_TOKEN')

    if (!awsGatewayUrl) {
      console.error('AWS API Gateway URL not configured. Checked: AWS_API_GATEWAY_URL, AWS_RC_API_GATEWAY_URL, AWS_RC_API_URL, AWS_GATEWAY_URL')
      return new Response(
        JSON.stringify({ error: 'FASTag API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Calling AWS Lambda for FASTag verification:', vehicleNumber)
    console.log('Using AWS Gateway URL:', awsGatewayUrl)

    // Call the AWS Lambda function via API Gateway with service parameter
    const lambdaResponse = await fetch(awsGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(proxyToken && { 'x-proxy-token': proxyToken })
      },
      body: JSON.stringify({
        vehicleId: vehicleNumber,
        type: 'fastag',
        service: 'fastag'
      })
    })

    const lambdaData = await lambdaResponse.json()
    console.log('Lambda response status:', lambdaResponse.status)
    console.log('Lambda response data:', lambdaData)

    const lambdaIndicatesError = (lambdaData && (lambdaData.status === 'error' || (typeof lambdaData.code === 'number' && lambdaData.code >= 400)))

    if (!lambdaResponse.ok || lambdaIndicatesError) {
      console.error('Lambda function reported failure:', lambdaData)
      const message = (lambdaData && (lambdaData.message || lambdaData.error)) || 'FASTag verification failed'
      const details = (lambdaData && (lambdaData.details || lambdaData.upstream?.bodyPreview)) || undefined
      
      // Update verification record with error
      await supabase
        .from('fastag_verifications')
        .update({
          status: 'failed',
          error_message: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', verification.id)

      return new Response(
        JSON.stringify({ 
          error: message,
          details
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process successful response - handle Lambda normalized format
    const responseData = lambdaData.response || lambdaData
    const fastagData = {
      balance: responseData.balance || 0,
      linked: responseData.linked !== undefined ? responseData.linked : (responseData.tag_status === 'ACTIVE'),
      tagId: responseData.tag_id || null,
      status: responseData.tag_status || 'unknown',
      lastTransactionDate: responseData.lastTransactionDate || null,
      vehicleNumber: vehicleNumber,
      bankName: responseData.bank_name || null
    }

    // Update verification record with success
    await supabase
      .from('fastag_verifications')
      .update({
        status: 'completed',
        verification_data: fastagData,
        is_cached: false,
        api_cost_saved: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', verification.id)

    // Update vehicle record with FASTag data
    await supabase
      .from('vehicles')
      .update({ 
        fasttag_last_synced_at: new Date().toISOString(),
        fasttag_balance: fastagData.balance,
        fasttag_linked: fastagData.linked
      })
      .eq('user_id', user.id)
      .eq('number', vehicleNumber)

    console.log('FASTag verification completed successfully for vehicle:', vehicleNumber)

    return new Response(
      JSON.stringify({
        success: true,
        data: fastagData,
        cached: false,
        verifiedAt: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('FASTag verification error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})