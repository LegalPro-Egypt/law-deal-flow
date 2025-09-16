import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteLawyerRequest {
  email: string;
  invitedBy: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, invitedBy }: InviteLawyerRequest = await req.json();
    
    console.log('Sending lawyer invitation via Supabase auth to:', email);

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Supabase's built-in email invitation system
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          role: 'lawyer',
          invited_by: invitedBy,
          invitation_type: 'lawyer'
        },
        redirectTo: `${req.headers.get('origin') || 'https://yourapp.com'}/auth`
      }
    );

    if (inviteError) {
      console.error('Error sending invitation:', inviteError);
      throw new Error(`Failed to send invitation: ${inviteError.message}`);
    }

    console.log("Invitation sent successfully via Supabase auth:", inviteData);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Invitation sent successfully',
      userId: inviteData.user?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-lawyer-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send invitation',
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);