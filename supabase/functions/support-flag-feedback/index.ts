import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { reportId, ocrPreview, flagDetails, email, feedback } = await req.json()

    // Validate required fields
    if (!reportId || !flagDetails) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: reportId and flagDetails' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the feedback for admin review
    const feedbackRecord = {
      report_id: reportId,
      ocr_preview: ocrPreview?.slice(0, 160) || null,
      flag_details: flagDetails,
      user_email: email || null,
      feedback_text: feedback || null,
      submitted_at: new Date().toISOString(),
      status: 'pending'
    }

    console.log('[FLAG-FEEDBACK] Received:', {
      reportId,
      flagCount: flagDetails?.length || 0,
      hasEmail: !!email,
      hasFeedback: !!feedback,
      ocrLength: ocrPreview?.length || 0
    })

    // For now, just log it. In production, you'd store in a feedback table
    console.log('[FLAG-FEEDBACK] Record:', feedbackRecord)

    // Simulate successful storage
    const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedbackId,
        message: 'Feedback submitted successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[FLAG-FEEDBACK] Error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})