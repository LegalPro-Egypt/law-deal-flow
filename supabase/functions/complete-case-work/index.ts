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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { caseId, completionType } = await req.json();

    if (!caseId || !completionType) {
      return new Response(
        JSON.stringify({ error: 'Case ID and completion type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get case work session
    const { data: workSession, error: sessionError } = await supabaseClient
      .from('case_work_sessions')
      .select('*')
      .eq('case_id', caseId)
      .eq('status', 'active')
      .single();

    if (sessionError || !workSession) {
      return new Response(
        JSON.stringify({ error: 'Active case work session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is authorized (lawyer or client)
    if (user.id !== workSession.lawyer_id && user.id !== workSession.client_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to complete this case' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();
    let updateData: any = {};
    let newCaseStatus = '';
    let notificationData: any[] = [];

    if (completionType === 'lawyer_complete') {
      // Lawyer marking case as complete
      updateData = {
        lawyer_completed_at: now,
        updated_at: now
      };
      newCaseStatus = 'pending_client_confirmation';

      notificationData = [{
        user_id: workSession.client_id,
        type: 'lawyer_marked_complete',
        title: 'Case Marked Complete by Lawyer',
        message: 'Your lawyer has marked the case as complete. Please review and confirm completion.',
        case_id: caseId,
        action_required: true,
        metadata: { 
          lawyer_id: workSession.lawyer_id,
          completed_at: now
        }
      }];

    } else if (completionType === 'client_confirm') {
      // Client confirming completion
      if (!workSession.lawyer_completed_at) {
        return new Response(
          JSON.stringify({ error: 'Lawyer must complete case first' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const actualCompletionDate = new Date();
      let timelineAccuracy = null;

      // Calculate timeline accuracy if we have estimated dates
      if (workSession.estimated_timeline_days && workSession.work_started_at) {
        const startDate = new Date(workSession.work_started_at);
        const actualDays = Math.ceil((actualCompletionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const estimatedDays = workSession.estimated_timeline_days;
        
        // Calculate accuracy percentage (100% if on time, decreases based on how far off)
        const daysDifference = Math.abs(actualDays - estimatedDays);
        timelineAccuracy = Math.max(0, 100 - (daysDifference / estimatedDays * 100));
      }

      updateData = {
        client_confirmed_at: now,
        actual_completion_date: actualCompletionDate.toISOString(),
        timeline_accuracy_score: timelineAccuracy,
        status: 'completed',
        updated_at: now
      };
      newCaseStatus = 'completed';

      notificationData = [
        {
          user_id: workSession.lawyer_id,
          type: 'case_fully_completed',
          title: 'Case Fully Completed',
          message: 'The client has confirmed case completion. Great work!',
          case_id: caseId,
          metadata: { 
            timeline_accuracy: timelineAccuracy,
            completed_at: now
          }
        },
        {
          user_id: workSession.client_id,
          type: 'case_fully_completed',
          title: 'Case Completed',
          message: 'Case has been successfully completed. Thank you for using our service!',
          case_id: caseId,
          metadata: { 
            completed_at: now
          }
        }
      ];
    }

    // Update case work session
    const { error: updateError } = await supabaseClient
      .from('case_work_sessions')
      .update(updateData)
      .eq('id', workSession.id);

    if (updateError) {
      console.error('Work session update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update case work session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update case status
    if (newCaseStatus) {
      const { error: caseUpdateError } = await supabaseClient
        .from('cases')
        .update({ 
          status: newCaseStatus,
          updated_at: now
        })
        .eq('id', caseId);

      if (caseUpdateError) {
        console.error('Case status update error:', caseUpdateError);
      }
    }

    // Create notifications
    if (notificationData.length > 0) {
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert(notificationData);

      if (notificationError) {
        console.error('Notification creation error:', notificationError);
      }
    }

    console.log(`Case work completion step completed: ${completionType} for case ${caseId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: completionType === 'client_confirm' ? 'Case fully completed' : 'Waiting for client confirmation',
        status: newCaseStatus,
        timelineAccuracy: updateData.timeline_accuracy_score
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in complete-case-work:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});