import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { caseId } = await req.json();

    if (!caseId) {
      return new Response(
        JSON.stringify({ error: 'Case ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify lawyer is assigned to this case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, assigned_lawyer_id, user_id, status, consultation_paid, remaining_fee')
      .eq('id', caseId)
      .eq('assigned_lawyer_id', user.id)
      .single();

    if (caseError || !caseData) {
      console.error('Case verification error:', caseError);
      return new Response(
        JSON.stringify({ error: 'Case not found or unauthorized' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if consultation has been paid and case is in correct status
    if (!caseData.consultation_paid || !['proposal_accepted', 'consultation_paid'].includes(caseData.status)) {
      return new Response(
        JSON.stringify({ error: 'Case is not in the correct status for consultation completion' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const gracePeriodExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Update case status and set grace period
    const { error: updateError } = await supabase
      .from('cases')
      .update({
        status: 'consultation_completed',
        consultation_completed_at: now.toISOString(),
        grace_period_expires_at: gracePeriodExpires.toISOString(),
        communication_modes: {
          text: true,
          voice: false,
          video: false
        },
        updated_at: now.toISOString()
      })
      .eq('id', caseId);

    if (updateError) {
      console.error('Error updating case:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update case status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification for client about payment deadline
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: caseData.user_id,
        case_id: caseId,
        type: 'consultation_completed',
        title: 'Consultation Completed - Payment Required',
        message: `Your consultation has been completed. You have 24 hours to complete the remaining payment of $${caseData.remaining_fee || 0}. After this period, communication will be limited.`,
        action_required: true,
        action_url: `/payment?caseId=${caseId}&type=remaining`,
        metadata: {
          remaining_fee: caseData.remaining_fee,
          grace_period_expires_at: gracePeriodExpires.toISOString()
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the request for notification error, just log it
    }

    // End any active communication sessions for this case
    const { error: sessionError } = await supabase
      .from('communication_sessions')
      .update({
        status: 'ended',
        ended_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('case_id', caseId)
      .eq('status', 'active');

    if (sessionError) {
      console.error('Error ending communication sessions:', sessionError);
      // Don't fail the request for session error, just log it
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Consultation completed successfully',
        grace_period_expires_at: gracePeriodExpires.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});