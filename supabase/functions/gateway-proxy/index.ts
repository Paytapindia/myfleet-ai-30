import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GatewayRequest {
  service: 'rc' | 'fastag' | 'challans' | 'health' | 'vehicle'
  vehicleNumber?: string
  chassis?: string
  engineNumber?: string
  forceRefresh?: boolean
  userId?: string
  action?: string
  vehicleId?: string
  vehicleData?: any
  updates?: any
  driverId?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Gateway proxy request received:', req.method)
    
    // Parse request body
    const requestData: GatewayRequest = await req.json()
    console.log('Request data:', requestData)

    // Get environment variables
    const awsGatewayUrl = Deno.env.get('AWS_API_GATEWAY_URL')
    const proxyToken = Deno.env.get('AWS_LAMBDA_PROXY_TOKEN')

    if (!awsGatewayUrl) {
      console.error('AWS_API_GATEWAY_URL not configured')
      throw new Error('AWS Gateway URL not configured')
    }

    if (!proxyToken) {
      console.error('AWS_LAMBDA_PROXY_TOKEN not configured')
      throw new Error('Proxy token not configured')
    }

    // Build the payload for AWS Lambda
    let lambdaPayload: any = {}

    if (requestData.service === 'health') {
      lambdaPayload = { action: 'health' }
    } else if (requestData.service === 'vehicle') {
      // Handle vehicle CRUD operations
      lambdaPayload = {
        action: requestData.action,
        ...(requestData.vehicleId && { vehicleId: requestData.vehicleId }),
        ...(requestData.vehicleData && { vehicleData: requestData.vehicleData }),
        ...(requestData.updates && { updates: requestData.updates }),
        ...(requestData.driverId && { driverId: requestData.driverId }),
        ...(requestData.userId && { userId: requestData.userId })
      }
    } else {
      // Handle verification services (rc, fastag, challans)
      if (!requestData.vehicleNumber) {
        throw new Error('Vehicle number is required for verification services')
      }
      
      lambdaPayload = {
        service: requestData.service,
        vehicleId: requestData.vehicleNumber,
        forceRefresh: requestData.forceRefresh || false
      }

      // Add service-specific parameters
      if (requestData.service === 'challans') {
        if (!requestData.chassis || !requestData.engineNumber) {
          throw new Error('Chassis and engine number required for challans verification')
        }
        lambdaPayload.chassis = requestData.chassis
        lambdaPayload.engine_no = requestData.engineNumber
      }

      // Add userId if provided
      if (requestData.userId) {
        lambdaPayload.userId = requestData.userId
      }
    }

    console.log('Calling AWS Lambda with payload:', lambdaPayload)

    // Make request to AWS API Gateway
    const response = await fetch(awsGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-token': proxyToken,
      },
      body: JSON.stringify(lambdaPayload)
    })

    console.log('AWS Lambda response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('AWS Lambda error response:', errorText)
      throw new Error(`Lambda request failed: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    console.log('AWS Lambda response data:', responseData)

    // Return the response from Lambda
    return new Response(JSON.stringify(responseData), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    })

  } catch (error) {
    console.error('Gateway proxy error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        details: 'Gateway proxy failed'
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    )
  }
})