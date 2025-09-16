import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    
    console.log('Sending lawyer invitation to:', email);

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique invitation token
    const invitationToken = crypto.randomUUID();
    
    // Store invitation in database
    const { error: invitationError } = await supabase
      .from('lawyer_invitations')
      .insert({
        email,
        invited_by: invitedBy,
        invitation_token: invitationToken,
        status: 'pending'
      });

    if (invitationError) {
      console.error('Error storing invitation:', invitationError);
      throw new Error('Failed to create invitation record');
    }

    // Get current domain for the signup link
    const origin = req.headers.get('origin') || 'https://yourapp.com';
    const signupLink = `${origin}/auth?invitation=${invitationToken}&email=${encodeURIComponent(email)}`;

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "LegalConnect <onboarding@resend.dev>",
      to: [email],
      subject: "You've been invited to join LegalConnect as a lawyer",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a365d; margin-bottom: 24px;">Welcome to LegalConnect</h1>
          
          <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
            You've been invited to join LegalConnect as a lawyer. Our platform connects legal professionals with clients who need expert legal assistance.
          </p>
          
          <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #2d3748; margin-bottom: 16px; font-size: 18px;">What's next?</h2>
            <ol style="color: #4a5568; padding-left: 20px;">
              <li style="margin-bottom: 8px;">Click the link below to create your account</li>
              <li style="margin-bottom: 8px;">Complete your professional profile</li>
              <li style="margin-bottom: 8px;">Wait for admin approval</li>
              <li>Start receiving and handling cases!</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${signupLink}" 
               style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Create Your Lawyer Account
            </a>
          </div>
          
          <p style="color: #718096; font-size: 14px; margin-top: 32px;">
            This invitation will expire in 7 days. If you have any questions, please contact our support team.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
          
          <p style="color: #a0aec0; font-size: 12px; text-align: center;">
            © 2024 LegalConnect. All rights reserved.
          </p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error('Error sending email:', emailResponse.error);
      throw new Error('Failed to send invitation email');
    }

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Invitation sent successfully',
      invitationToken 
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