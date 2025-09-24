import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResponseData {
  request_id: string;
  response: 'accepted' | 'rejected';
  client_response?: string;
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

    const responseData: ResponseData = await req.json();

    // Get the fee request and validate client ownership
    const { data: feeRequest, error: requestError } = await supabase
      .from('additional_fee_requests')
      .select('*, cases!inner(user_id, assigned_lawyer_id)')
      .eq('id', responseData.request_id)
      .eq('client_id', user.id)
      .eq('status', 'pending')
      .single();

    if (requestError || !feeRequest) {
      return new Response(JSON.stringify({ error: 'Fee request not found or not authorized' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the fee request
    const { error: updateError } = await supabase
      .from('additional_fee_requests')
      .update({
        status: responseData.response,
        client_response: responseData.client_response,
        client_responded_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString()
      })
      .eq('id', responseData.request_id);

    if (updateError) {
      console.error('Error updating fee request:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update case status based on response
    const newCaseStatus = responseData.response === 'accepted' 
      ? 'awaiting_additional_payment' 
      : 'active'; // Return to active if rejected

    await supabase
      .from('cases')
      .update({ status: newCaseStatus })
      .eq('id', feeRequest.case_id);

    // Create notification for lawyer
    const notificationMessage = responseData.response === 'accepted'
      ? `Client has accepted your additional fee request for "${feeRequest.request_title}"`
      : `Client has rejected your additional fee request for "${feeRequest.request_title}"`;

    await supabase
      .from('notifications')
      .insert({
        user_id: feeRequest.lawyer_id,
        case_id: feeRequest.case_id,
        type: 'additional_fee_response',
        title: `Additional Fee Request ${responseData.response === 'accepted' ? 'Accepted' : 'Rejected'}`,
        message: notificationMessage,
        action_required: false,
        metadata: {
          request_id: feeRequest.id,
          response: responseData.response,
          amount: feeRequest.additional_fee_amount
        }
      });

    console.log('Additional fee request response processed:', responseData.request_id);

    return new Response(JSON.stringify({ 
      success: true,
      status: responseData.response
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in respond-additional-fee-request:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});