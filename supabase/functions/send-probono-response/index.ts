import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResponseRequest {
  email: string;
  fullName: string;
  caseTitle: string;
  status: string;
  adminResponse: string;
}

serve(async (req: Request) => {
  console.log('Pro bono response function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { email, fullName, caseTitle, status, adminResponse }: ResponseRequest = await req.json();
    console.log('Pro bono response email would be sent to:', email, 'Status:', status);

    return new Response(JSON.stringify({ success: true, message: "Response logged successfully" }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error('Error in send-probono-response function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send pro bono response email'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});