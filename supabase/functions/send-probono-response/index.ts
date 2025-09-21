import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

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

const handler = async (req: Request): Promise<Response> => {
  console.log('Pro bono response email function called');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const { email, fullName, caseTitle, status, adminResponse }: ResponseRequest = await req.json();
    console.log('Sending response email to:', email, 'Status:', status);

    const isApproved = status === 'approved';
    const statusText = isApproved ? 'Approved' : 'Application Update';
    const statusColor = isApproved ? '#059669' : '#dc2626';
    const statusBg = isApproved ? '#f0fdf4' : '#fef2f2';

    const emailResponse = await resend.emails.send({
      from: 'LegalConnect <noreply@resend.dev>',
      to: [email],
      subject: `Pro Bono Application ${statusText} - LegalConnect`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">LegalConnect</h1>
            <p style="color: #64748b; margin: 5px 0;">Pro Bono Legal Aid Program</p>
          </div>
          
          <div style="background: ${statusBg}; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${statusColor};">
            <h2 style="color: ${statusColor}; margin-top: 0;">
              ${isApproved ? '🎉 Application Approved!' : 'Application Status Update'}
            </h2>
            <p style="color: #374151; line-height: 1.6;">
              Dear ${fullName},
            </p>
            <p style="color: #374151; line-height: 1.6;">
              We have reviewed your pro bono application for "<strong>${caseTitle}</strong>".
            </p>
          </div>
          
          ${adminResponse ? `
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin-top: 0;">Message from our team:</h3>
            <p style="color: #374151; line-height: 1.6; font-style: italic;">
              "${adminResponse}"
            </p>
          </div>
          ` : ''}
          
          ${isApproved ? `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">Next Steps:</h3>
            <ul style="color: #64748b; line-height: 1.6;">
              <li>A qualified pro bono lawyer will be assigned to your case</li>
              <li>You will receive contact information within 2-3 business days</li>
              <li>Your lawyer will reach out to schedule an initial consultation</li>
              <li>All services will be provided completely free of charge</li>
            </ul>
          </div>
          ` : `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #374151;">Other Options:</h3>
            <p style="color: #64748b; line-height: 1.6;">
              While we cannot provide pro bono assistance for this case, you may still use our platform 
              to connect with qualified lawyers. We also have payment plans available to make legal services 
              more accessible.
            </p>
          </div>
          `}
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #64748b; font-size: 14px; margin: 0;">
              If you have any questions about this decision, please don't hesitate to contact us.
            </p>
            <p style="color: #64748b; font-size: 14px; margin: 5px 0;">
              Best regards,<br>
              The LegalConnect Pro Bono Team
            </p>
          </div>
        </div>
      `,
    });

    console.log('Response email sent successfully:', emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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
};

serve(handler);