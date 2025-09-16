import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalRequest {
  email: string;
  lawyerName: string;
  approved: boolean;
  reviewNotes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, lawyerName, approved, reviewNotes }: ApprovalRequest = await req.json();
    
    console.log('Processing lawyer approval for:', email, 'approved:', approved);

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (approved) {
      // Use Supabase's built-in email invitation system
      console.log('Inviting approved lawyer via Supabase auth:', email);
      
      const { data: authData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name: lawyerName,
            role: 'lawyer',
            approved_by_admin: true,
            review_notes: reviewNotes || ''
          },
          redirectTo: `${req.headers.get('origin') || 'https://yourapp.com'}/auth`
        }
      );

      if (inviteError) {
        console.error('Error inviting lawyer:', inviteError);
        throw new Error(`Failed to send invitation: ${inviteError.message}`);
      }

      console.log('Lawyer invitation sent successfully via Supabase auth:', authData);

      // Create profile for the lawyer
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            email: email,
            first_name: lawyerName.split(' ')[0] || '',
            last_name: lawyerName.split(' ').slice(1).join(' ') || '',
            role: 'lawyer',
            is_verified: true,
            is_active: true
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't fail the whole process if profile creation fails
        } else {
          console.log('Profile created successfully for lawyer');
        }
      }
    } else {
      // For rejections, we'll just log it - no email needed for now
      console.log('Lawyer application rejected:', email, 'Reason:', reviewNotes || 'No reason provided');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${approved ? 'Approval' : 'Rejection'} notification sent successfully`
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-lawyer-approval function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send notification',
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