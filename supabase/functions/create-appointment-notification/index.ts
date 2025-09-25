import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { appointmentId } = await req.json();

    // Get the appointment details with case information
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        cases (
          title,
          case_number,
          user_id
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError) throw appointmentError;

    // Create notification for the client
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: appointment.cases.user_id,
        case_id: appointment.case_id,
        type: 'appointment_scheduled',
        category: 'appointment',
        title: 'New Appointment Scheduled',
        message: `Your lawyer has scheduled a ${appointment.appointment_type} for ${new Date(appointment.scheduled_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`,
        action_required: false,
        metadata: {
          appointment_id: appointmentId,
          appointment_type: appointment.appointment_type,
          scheduled_date: appointment.scheduled_date,
          case_number: appointment.cases.case_number
        }
      });

    if (notificationError) throw notificationError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating appointment notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});