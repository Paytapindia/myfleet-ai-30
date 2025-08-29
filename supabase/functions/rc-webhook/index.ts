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
    // Create Supabase admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('RC webhook received:', JSON.stringify(payload, null, 2))

    // Validate webhook payload structure
    if (!payload.request_id || !payload.event_type) {
      console.error('Invalid webhook payload - missing required fields')
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { request_id, event_type, data, error_message } = payload

    // Find the verification request
    const { data: verification, error: fetchError } = await supabaseAdmin
      .from('rc_verifications')
      .select('*')
      .eq('request_id', request_id)
      .single()

    if (fetchError || !verification) {
      console.error('Verification request not found:', request_id, fetchError)
      return new Response(
        JSON.stringify({ error: 'Verification request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updateData: any = {}

    switch (event_type) {
      case 'validation_completed':
        updateData = {
          status: 'completed',
          verification_data: data,
          updated_at: new Date().toISOString()
        }
        console.log(`Verification completed for request: ${request_id}`)
        break

      case 'validation_failed':
        updateData = {
          status: 'failed',
          error_message: error_message || 'Verification failed',
          updated_at: new Date().toISOString()
        }
        console.log(`Verification failed for request: ${request_id}`)
        break

      case 'validation_processing':
        updateData = {
          status: 'processing',
          updated_at: new Date().toISOString()
        }
        console.log(`Verification processing for request: ${request_id}`)
        break

      default:
        console.warn(`Unknown event type: ${event_type}`)
        return new Response(
          JSON.stringify({ error: 'Unknown event type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Update the verification record
    const { error: updateError } = await supabaseAdmin
      .from('rc_verifications')
      .update(updateData)
      .eq('id', verification.id)

    if (updateError) {
      console.error('Error updating verification:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update verification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the activity
    await supabaseAdmin
      .from('activity_logs')
      .insert({
        user_id: verification.user_id,
        entity_type: 'rc_verification',
        entity_id: verification.id,
        action: 'webhook_received',
        description: `RC verification ${event_type}`,
        metadata: { event_type, request_id, payload }
      })

    console.log(`Successfully processed webhook for request: ${request_id}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})