import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdditionalFeeRequestData {
  case_id: string;
  request_title: string;
  request_description: string;
  additional_fee_amount: number;
  timeline_extension_days?: number;
  justification: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestData: AdditionalFeeRequestData = await req.json();

    // Get case details to validate and get client info
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, user_id, assigned_lawyer_id')
      .eq('id', requestData.case_id)
      .eq('assigned_lawyer_id', user.id)
      .single();

    if (caseError || !caseData) {
      return new Response(JSON.stringify({ error: 'Case not found or not assigned to you' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the original proposal
    const { data: proposalData, error: proposalError } = await supabase
      .from('proposals')
      .select('id')
      .eq('case_id', requestData.case_id)
      .eq('lawyer_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (proposalError || !proposalData) {
      return new Response(JSON.stringify({ error: 'No accepted proposal found for this case' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create the additional fee request
    const { data: feeRequest, error: createError } = await supabase
      .from('additional_fee_requests')
      .insert({
        case_id: requestData.case_id,
        lawyer_id: user.id,
        client_id: caseData.user_id,
        original_proposal_id: proposalData.id,
        request_title: requestData.request_title,
        request_description: requestData.request_description,
        additional_fee_amount: requestData.additional_fee_amount,
        timeline_extension_days: requestData.timeline_extension_days || 0,
        justification: requestData.justification,
        status: 'pending',
        payment_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating additional fee request:', createError);
      return new Response(JSON.stringify({ error: 'Failed to create request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update case status to indicate additional fee requested
    await supabase
      .from('cases')
      .update({ status: 'additional_fee_requested' })
      .eq('id', requestData.case_id);

    // Create notification for client
    await supabase
      .from('notifications')
      .insert({
        user_id: caseData.user_id,
        case_id: requestData.case_id,
        type: 'additional_fee_request',
        title: 'Additional Fee Request',
        message: `Your lawyer has requested additional fees for "${requestData.request_title}". Amount: $${requestData.additional_fee_amount}`,
        action_required: true,
        metadata: {
          request_id: feeRequest.id,
          amount: requestData.additional_fee_amount
        }
      });

    console.log('Additional fee request created successfully:', feeRequest.id);

    return new Response(JSON.stringify({ 
      success: true, 
      request: feeRequest 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-additional-fee-request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});