import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupNotificationRequest {
  email: string;
  source: string;
  created_at: string;
  metadata?: any;
  user_agent?: string;
  ip_address?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signupData: SignupNotificationRequest = await req.json();
    
    console.log("Processing new signup notification:", signupData);

    // Send notification email to support
    const supportEmailResponse = await resend.emails.send({
      from: "Egypt Legal Pro <noreply@egyptlegalpro.com>",
      to: ["support@egyptlegalpro.com"],
      subject: "New Waitlist Signup - Egypt Legal Pro",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a365d; margin-bottom: 20px;">New Waitlist Signup</h2>
          
          <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #2d3748;">Signup Details:</h3>
            <p><strong>Email:</strong> ${signupData.email}</p>
            <p><strong>Source:</strong> ${signupData.source}</p>
            <p><strong>Date:</strong> ${new Date(signupData.created_at).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}</p>
            ${signupData.user_agent ? `<p><strong>Device/Browser:</strong> ${signupData.user_agent}</p>` : ''}
            ${signupData.ip_address ? `<p><strong>IP Address:</strong> ${signupData.ip_address}</p>` : ''}
          </div>

          <div style="background: #e6fffa; padding: 15px; border-radius: 8px; border-left: 4px solid #38b2ac;">
            <p style="margin: 0; color: #2d3748;">
              <strong>Action Required:</strong> Consider reaching out to this potential client or adding them to your marketing campaigns.
            </p>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          
          <p style="color: #718096; font-size: 14px; margin: 0;">
            This is an automated notification from your Egypt Legal Pro platform.
          </p>
        </div>
      `,
    });

    console.log("Support notification email sent:", supportEmailResponse);

    // Send confirmation email to the new subscriber
    const confirmationEmailResponse = await resend.emails.send({
      from: "Egypt Legal Pro <noreply@egyptlegalpro.com>",
      to: [signupData.email],
      subject: "Welcome to Egypt Legal Pro - You're on the List!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1a365d; margin-bottom: 10px;">Egypt Legal Pro</h1>
            <p style="color: #718096; font-size: 18px;">Professional Legal Services</p>
          </div>

          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0; font-size: 28px;">Welcome to Our Waitlist!</h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">You're among the first to know when we launch</p>
          </div>

          <div style="background: #f7fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #2d3748; margin-top: 0;">What happens next?</h3>
            <ul style="color: #4a5568; line-height: 1.6;">
              <li>You'll be the first to know when Egypt Legal Pro launches</li>
              <li>Get exclusive early access to our platform</li>
              <li>Receive special launch offers and promotions</li>
              <li>Access to our legal expertise and AI-powered tools</li>
            </ul>
          </div>

          <div style="background: #e6fffa; padding: 20px; border-radius: 8px; border-left: 4px solid #38b2ac; margin-bottom: 25px;">
            <h4 style="color: #2d3748; margin-top: 0;">Need Legal Help Right Now?</h4>
            <p style="color: #4a5568; margin-bottom: 0;">
              While we're preparing our full platform, our team is available for urgent legal consultations. 
              Contact us at support@egyptlegalpro.com for immediate assistance.
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 30px;">
            <a href="https://egyptlegalpro.com" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Visit Our Website
            </a>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          
          <p style="color: #718096; font-size: 14px; text-align: center; margin: 0;">
            Thank you for your interest in Egypt Legal Pro<br>
            Professional Legal Services Made Simple
          </p>
        </div>
      `,
    });

    console.log("Confirmation email sent to subscriber:", confirmationEmailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      supportEmail: supportEmailResponse,
      confirmationEmail: confirmationEmailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in notify-new-signup function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
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