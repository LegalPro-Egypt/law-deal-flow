import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, clientName } = await req.json();

    if (!caseId) {
      throw new Error('Case ID is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch conversation messages for the case - try multiple approaches
    let conversationData = null;
    let conversationError = null;
    
    // First try to find conversation directly linked to case
    const { data: linkedConversation, error: linkedError } = await supabase
      .from('conversations')
      .select(`
        id,
        messages (
          role,
          content,
          created_at
        )
      `)
      .eq('case_id', caseId)
      .maybeSingle();
    
    if (linkedConversation) {
      conversationData = linkedConversation;
    } else {
      // If no direct link, try to find by user_id and mode
      const { data: caseInfo } = await supabase
        .from('cases')
        .select('user_id')
        .eq('id', caseId)
        .single();
      
      if (caseInfo?.user_id) {
        const { data: userConversation, error: userError } = await supabase
          .from('conversations')
          .select(`
            id,
            messages (
              role,
              content,
              created_at
            )
          `)
          .eq('user_id', caseInfo.user_id)
          .eq('mode', 'intake')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (userConversation) {
          conversationData = userConversation;
          
          // Link this conversation to the case for future reference
          await supabase
            .from('conversations')
            .update({ case_id: caseId })
            .eq('id', userConversation.id);
        } else {
          conversationError = userError || new Error('No conversation found for case');
        }
      } else {
        conversationError = linkedError || new Error('No case found');
      }
    }

    if (conversationError) {
      throw conversationError;
    }

    if (!conversationData?.messages || conversationData.messages.length === 0) {
      throw new Error('No conversation found for this case');
    }

    // Prepare conversation text for summarization
    const conversationText = conversationData.messages
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    // Generate AI summary using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a legal assistant tasked with summarizing conversations between clients and AI legal assistants. Create a concise, professional paragraph summary that captures:
            - The main legal issue or problem discussed
            - Key facts and circumstances
            - Important dates, parties, or documents mentioned
            - The client's primary concerns or goals
            - Any urgent matters or deadlines
            
            CRITICAL: Write the summary in neutral third-person perspective about the CLIENT. ${clientName ? `Refer to the client as "${clientName}"` : 'Use "the client"'} instead of second-person language ("you", "your"). This summary is for admin review, not client communication.
            
            Keep the summary factual, clear, and suitable for legal professionals to quickly understand the case.`
          },
          {
            role: 'user',
            content: `Please summarize the following legal intake conversation:\n\n${conversationText}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const summary = aiResponse.choices[0].message.content;

    // Update the case with the generated summary
    const { error: updateError } = await supabase
      .from('cases')
      .update({ ai_summary: summary })
      .eq('id', caseId);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-conversation-summary function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});