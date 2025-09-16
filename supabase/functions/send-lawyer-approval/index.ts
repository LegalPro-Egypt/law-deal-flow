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
    
    console.log('Sending lawyer approval notification to:', email, 'approved:', approved);

    // Get current domain for the signin link
    const origin = req.headers.get('origin') || 'https://yourapp.com';
    const signinLink = `${origin}/auth`;

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (approved) {
      // Create user account for approved lawyer
      console.log('Creating user account for approved lawyer:', email);
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: lawyerName,
          role: 'lawyer'
        }
      });

      if (authError) {
        console.error('Error creating user account:', authError);
        // Continue with email sending even if user creation fails
      } else {
        console.log('User account created successfully:', authData.user?.id);
        
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
          } else {
            console.log('Profile created successfully for lawyer');
          }
        }
      }
    }

    if (approved) {
      // Send approval notification
      const emailResponse = await resend.emails.send({
        from: "LegalConnect <onboarding@resend.dev>",
        to: [email],
        subject: "🎉 Your lawyer account has been approved!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a365d; margin-bottom: 24px;">Congratulations, ${lawyerName}!</h1>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
              Your lawyer account has been approved and your user account has been created! You can now access the LegalConnect platform to start receiving and handling cases.
            </p>
            
            <div style="background-color: #f0fff4; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #38a169;">
              <h2 style="color: #276749; margin-bottom: 16px; font-size: 18px;">✅ Account Created & Approved</h2>
              <p style="color: #2d3748; margin-bottom: 8px;"><strong>Your email:</strong> ${email}</p>
              <p style="color: #2d3748; margin-bottom: 16px;">You now have access to:</p>
              <ul style="color: #2d3748; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Lawyer dashboard with case management</li>
                <li style="margin-bottom: 8px;">Direct communication with clients</li>
                <li style="margin-bottom: 8px;">Case assignment notifications</li>
                <li>Professional profile management</li>
              </ul>
            </div>

            <div style="background-color: #fffbf0; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #f6ad55;">
              <h3 style="color: #c05621; margin-bottom: 12px; font-size: 16px;">🔑 First Time Login Instructions</h3>
              <p style="color: #2d3748; margin-bottom: 12px;">Since this is your first time logging in:</p>
              <ol style="color: #2d3748; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Click the "Sign In to Your Dashboard" button below</li>
                <li style="margin-bottom: 8px;">Click on "Lawyer" tab, then "Forgot Password?"</li>
                <li style="margin-bottom: 8px;">Enter your email (${email}) to receive a password reset link</li>
                <li>Create your password and access your lawyer dashboard</li>
              </ol>
            </div>
            
            ${reviewNotes ? `
              <div style="background-color: #f7fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
                <h3 style="color: #2d3748; margin-bottom: 8px; font-size: 16px;">Admin Notes:</h3>
                <p style="color: #4a5568; font-style: italic;">${reviewNotes}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${signinLink}" 
                 style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Sign In to Your Dashboard
              </a>
            </div>
            
            <p style="color: #718096; font-size: 14px; margin-top: 32px;">
              Welcome to the LegalConnect community! If you have any questions, please don't hesitate to reach out.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            
            <p style="color: #a0aec0; font-size: 12px; text-align: center;">
              © 2024 LegalConnect. All rights reserved.
            </p>
          </div>
        `,
      });

      if (emailResponse.error) {
        console.error('Error sending approval email:', emailResponse.error);
        throw new Error('Failed to send approval notification');
      }

      console.log("Approval email sent successfully:", emailResponse);
    } else {
      // Send rejection notification
      const emailResponse = await resend.emails.send({
        from: "LegalConnect <onboarding@resend.dev>",
        to: [email],
        subject: "Update on your lawyer account application",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a365d; margin-bottom: 24px;">Thank you for your application, ${lawyerName}</h1>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
              We have carefully reviewed your lawyer account application for LegalConnect.
            </p>
            
            <div style="background-color: #fff5f5; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #f56565;">
              <h2 style="color: #c53030; margin-bottom: 16px; font-size: 18px;">Application Status: Not Approved</h2>
              <p style="color: #2d3748;">
                Unfortunately, we are unable to approve your application at this time.
              </p>
            </div>
            
            ${reviewNotes ? `
              <div style="background-color: #f7fafc; padding: 16px; border-radius: 6px; margin-bottom: 24px;">
                <h3 style="color: #2d3748; margin-bottom: 8px; font-size: 16px;">Review Notes:</h3>
                <p style="color: #4a5568;">${reviewNotes}</p>
              </div>
            ` : ''}
            
            <p style="color: #4a5568; font-size: 14px; margin-top: 24px;">
              If you believe this decision was made in error or if you have additional qualifications to submit, 
              please feel free to reapply or contact our support team.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
            
            <p style="color: #a0aec0; font-size: 12px; text-align: center;">
              © 2024 LegalConnect. All rights reserved.
            </p>
          </div>
        `,
      });

      if (emailResponse.error) {
        console.error('Error sending rejection email:', emailResponse.error);
        throw new Error('Failed to send rejection notification');
      }

      console.log("Rejection email sent successfully:", emailResponse);
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