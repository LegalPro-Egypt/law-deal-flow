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
      // First check if user already exists
      console.log('Checking if user exists:', email);
      
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error checking existing users:', listError);
        throw new Error(`Failed to check existing users: ${listError.message}`);
      }

      const existingUser = existingUsers.users?.find(user => user.email === email);
      let userId: string;
      let actionTaken: string;

      if (existingUser) {
        // User exists - send password reset and update their profile
        console.log('User exists, sending password reset:', email);
        
        const { error: resetError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: `${req.headers.get('origin') || 'https://yourapp.com'}/auth?type=recovery`
          }
        });

        if (resetError) {
          console.error('Error sending password reset:', resetError);
          throw new Error(`Failed to send password reset: ${resetError.message}`);
        }

        userId = existingUser.id;
        actionTaken = 'Password reset email sent to existing user';
        console.log('Password reset sent successfully to existing user');
      } else {
        // User doesn't exist - send invitation
        console.log('User does not exist, sending invitation:', email);
        
        const { data: authData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
          email,
          {
            data: {
              full_name: lawyerName,
              role: 'lawyer',
              approved_by_admin: true,
              review_notes: reviewNotes || ''
            },
            redirectTo: `${req.headers.get('origin') || 'https://yourapp.com'}/auth?force=true`
          }
        );

        if (inviteError) {
          console.error('Error inviting new user:', inviteError);
          throw new Error(`Failed to send invitation: ${inviteError.message}`);
        }

        if (!authData.user) {
          throw new Error('No user data returned from invitation');
        }

        userId = authData.user.id;
        actionTaken = 'Invitation email sent to new user';
        console.log('Invitation sent successfully to new user');
      }

      // Create or update profile for the lawyer
      const profileData = {
        user_id: userId,
        email: email,
        first_name: lawyerName.split(' ')[0] || '',
        last_name: lawyerName.split(' ').slice(1).join(' ') || '',
        role: 'lawyer',
        is_verified: true,
        is_active: true
      };

      // Try to insert first, if it fails due to duplicate, update instead
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profileData);

      if (insertError) {
        console.log('Profile exists, updating instead:', insertError.message);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'lawyer',
            is_verified: true,
            is_active: true,
            first_name: lawyerName.split(' ')[0] || '',
            last_name: lawyerName.split(' ').slice(1).join(' ') || ''
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          // Don't fail the whole process if profile update fails
        } else {
          console.log('Profile updated successfully for lawyer');
        }
      } else {
        console.log('Profile created successfully for lawyer');
      }
    } else {
      // For rejections, we'll just log it - no email needed for now
      console.log('Lawyer application rejected:', email, 'Reason:', reviewNotes || 'No reason provided');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: approved 
        ? (actionTaken || 'Lawyer approval processed successfully')
        : `Lawyer application rejected: ${reviewNotes || 'No reason provided'}`
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