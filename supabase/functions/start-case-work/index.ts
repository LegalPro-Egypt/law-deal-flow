import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { caseId } = await req.json();

    if (!caseId) {
      return new Response(
        JSON.stringify({ error: 'Case ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get case details with proposal
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select(`
        *,
        proposals (
          id,
          timeline,
          lawyer_id,
          client_id
        )
      `)
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error('Case fetch error:', caseError);
      return new Response(
        JSON.stringify({ error: 'Case not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const proposal = caseData.proposals?.[0];
    if (!proposal) {
      return new Response(
        JSON.stringify({ error: 'No proposal found for case' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse timeline to get estimated days
    const timelineMatch = proposal.timeline?.match(/(\d+)/);
    const estimatedDays = timelineMatch ? parseInt(timelineMatch[1]) : null;
    
    const startDate = new Date();
    const estimatedCompletionDate = estimatedDays 
      ? new Date(startDate.getTime() + (estimatedDays * 24 * 60 * 60 * 1000))
      : null;

    // Create case work session
    const { error: workSessionError } = await supabaseClient
      .from('case_work_sessions')
      .insert({
        case_id: caseId,
        lawyer_id: proposal.lawyer_id,
        client_id: proposal.client_id,
        work_started_at: startDate.toISOString(),
        estimated_completion_date: estimatedCompletionDate?.toISOString(),
        estimated_timeline_days: estimatedDays,
        status: 'active'
      });

    if (workSessionError) {
      console.error('Work session creation error:', workSessionError);
      return new Response(
        JSON.stringify({ error: 'Failed to start case work session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update case status
    const { error: updateError } = await supabaseClient
      .from('cases')
      .update({ 
        status: 'work_in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId);

    if (updateError) {
      console.error('Case status update error:', updateError);
    }

    // Create notifications for both parties
    const notifications = [
      {
        user_id: proposal.lawyer_id,
        type: 'case_work_started',
        title: 'Case Work Started',
        message: `Payment received! Case work has begun for case ${caseData.case_number}.`,
        case_id: caseId,
        metadata: { 
          case_number: caseData.case_number,
          estimated_completion: estimatedCompletionDate?.toISOString()
        }
      },
      {
        user_id: proposal.client_id,
        type: 'case_work_started',
        title: 'Case Work Started',
        message: `Your payment has been processed and case work has begun for case ${caseData.case_number}.`,
        case_id: caseId,
        metadata: { 
          case_number: caseData.case_number,
          estimated_completion: estimatedCompletionDate?.toISOString()
        }
      }
    ];

    const { error: notificationError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (notificationError) {
      console.error('Notification creation error:', notificationError);
    }

    console.log(`Case work started for case ${caseId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Case work started successfully',
        estimatedCompletion: estimatedCompletionDate
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in start-case-work:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});