import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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
    console.log('Sending confirmation email to:', email);

    const emailResponse = await resend.emails.send({
      from: 'LegalConnect <noreply@resend.dev>',
      to: [email],
      subject: 'Pro Bono Application Received - LegalConnect',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">LegalConnect</h1>
            <p style="color: #64748b; margin: 5px 0;">Pro Bono Legal Aid Program</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #059669; margin-top: 0;">Application Received Successfully!</h2>
            <p style="color: #374151; line-height: 1.6;">
              Dear ${fullName},
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Thank you for submitting your pro bono application for "<strong>${caseTitle}</strong>". 
              We have received your request and our team will review it carefully.
            </p>
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">What happens next?</h3>
            <ul style="color: #64748b; line-height: 1.6;">
              <li>Our team will review your application within 5-7 business days</li>
              <li>We will evaluate your case based on our acceptance criteria</li>
              <li>You will receive an email notification with our decision</li>
              <li>If approved, we will connect you with a qualified pro bono lawyer</li>
            </ul>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Important:</strong> Due to limited resources, not all applications can be accepted. 
              We prioritize cases based on urgency, merit, and available capacity.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              If you have any questions, please don't hesitate to contact us.
            </p>
            <p style="color: #64748b; font-size: 14px; margin: 5px 0;">
              Best regards,<br>
              The LegalConnect Pro Bono Team
            </p>
          </div>
        </div>
      `,
    });

    console.log('Confirmation email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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