import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sanitizeVehicleNumber = (input: string) =>
  input?.toString().toUpperCase().replace(/[\s-]/g, '').trim();

async function fetchWithRetry(url: string, payload: any, headers: Record<string, string> = {}, maxRetries = 2) {
  let attempt = 0;
  let lastStatus: number | null = null;
  let lastError: any = null;
  while (attempt < maxRetries) {
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
      return res;
    } catch (e) {
      lastError = e;
      lastStatus = null;
      attempt++;
      console.log(`Fetch attempt ${attempt} failed:`, e);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw new Error(`Fetch failed after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown'}`);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { vehicleNumber } = await req.json();
    if (!vehicleNumber) {
      return new Response(
        JSON.stringify({ error: 'Vehicle number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vNum = sanitizeVehicleNumber(vehicleNumber);
    console.log(`Processing challans verification for vehicle: ${vNum}`);

    // Check for recent cached data (shorter cache for challans - 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: cachedData, error: cacheError } = await supabase
      .from('challan_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('vehicle_number', vNum)
      .eq('status', 'completed')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cacheError) {
      console.error('Cache lookup error:', cacheError);
    }

    if (cachedData && cachedData.verification_data) {
      console.log(`Using cached challans data for vehicle: ${vNum}`);
      
      // Update vehicle challans count from cached data
      const challansData = cachedData.verification_data;
      const challansCount = Array.isArray(challansData?.challans) ? challansData.challans.length : 0;
      
      await supabase
        .from('vehicles')
        .update({ 
          challans_count: challansCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('number', vNum);

      return new Response(
        JSON.stringify({
          success: true,
          data: challansData,
          cached: true,
          message: 'Challans data retrieved from cache'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`No cached data found, calling APIClub for vehicle challans: ${vNum}`);

    // Get AWS API Gateway URL from secrets
    const awsApiGatewayUrl = Deno.env.get('AWS_API_GATEWAY_URL');
    const proxyToken = Deno.env.get('SHARED_PROXY_TOKEN');
    const awsApiKey = Deno.env.get('AWS_RC_API_KEY');
    
    if (!awsApiGatewayUrl) {
      console.error('AWS_API_GATEWAY_URL not configured');
      return new Response(
        JSON.stringify({ error: 'AWS API Gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling AWS API Gateway for challans', {
      url: awsApiGatewayUrl,
      vehicleNumber: vNum
    });

    // Create pending verification record
    const { data: verification, error: insertError } = await supabase
      .from('challan_verifications')
      .insert({
        user_id: user.id,
        vehicle_number: vNum,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create verification record:', insertError);
    }

    const payload = {
      vehicleId: vNum,
      vehicle_number: vNum,
      registrationNumber: vNum,
      service: 'challans',
      type: 'challans'
    };
    console.log('AWS request payload preview:', payload);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(proxyToken && { 'x-proxy-token': proxyToken }),
      ...(awsApiKey && { 'x-api-key': awsApiKey }),
    };

    // Call AWS API Gateway with retries
    let apiResponse: Response;
    try {
      apiResponse = await fetchWithRetry(awsApiGatewayUrl, payload, headers, 2);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('AWS API Gateway fetch error after retries:', message);
      
      // Update verification record as failed
      if (verification) {
        await supabase
          .from('challan_verifications')
          .update({
            status: 'failed',
            error_message: message
          })
          .eq('id', verification.id);
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch challans data', details: message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AWS API Gateway response status: ${apiResponse.status}`);

    const responseData = await apiResponse.json();
    console.log('AWS API Gateway response received', {
      status: responseData.status || 'unknown',
      preview: JSON.stringify(responseData).substring(0, 200)
    });

    // Handle successful response
    if (responseData.status === 'success' && responseData.response) {
      const challansData = responseData.response;
      
      // Update verification record as completed
      if (verification) {
        await supabase
          .from('challan_verifications')
          .update({
            status: 'completed',
            verification_data: challansData
          })
          .eq('id', verification.id);
      }

      console.log(`Cached challans data for vehicle: ${vNum}`);

      // Update vehicle challans count
      const challansCount = Array.isArray(challansData?.challans) ? challansData.challans.length : 0;
      
      await supabase
        .from('vehicles')
        .update({ 
          challans_count: challansCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('number', vNum);

      console.log(`Challans verification completed for vehicle: ${vNum}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: challansData,
          cached: false,
          message: 'Challans data fetched successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Handle API errors
      const errorMessage = responseData.message || 'Unknown error from challans API';
      console.error('Challans API error:', errorMessage);
      
      // Update verification record as failed
      if (verification) {
        await supabase
          .from('challan_verifications')
          .update({
            status: 'failed',
            error_message: errorMessage,
            verification_data: responseData
          })
          .eq('id', verification.id);
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to fetch challans data',
          details: errorMessage,
          apiResponse: responseData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Challans verification error:', error);
    const message = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});