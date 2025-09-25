import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmationRequest {
  email: string;
  fullName: string;
  caseTitle: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Pro bono confirmation email function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { email, fullName, caseTitle }: ConfirmationRequest = await req.json();
    console.log('Pro bono confirmation email would be sent to:', email, 'for case:', caseTitle);

    return new Response(JSON.stringify({ success: true, message: "Confirmation logged successfully" }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-probono-confirmation function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send pro bono confirmation email'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);