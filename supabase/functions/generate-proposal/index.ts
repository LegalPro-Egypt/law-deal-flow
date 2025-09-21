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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { caseId, proposalInput } = await req.json();
    
    if (!caseId || !proposalInput) {
      throw new Error('Missing caseId or proposalInput');
    }

    console.log('Generating proposal for case:', caseId);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch comprehensive case data
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        *,
        documents(file_name, document_category, ocr_text),
        case_analysis(analysis_data, analysis_type),
        case_messages(content, role, created_at),
        conversations!inner(messages(content, role, created_at))
      `)
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      throw new Error(`Failed to fetch case data: ${caseError?.message}`);
    }

    // Prepare context for AI
    const caseContext = {
      case_number: caseData.case_number,
      title: caseData.title,
      category: caseData.category,
      description: caseData.description,
      urgency: caseData.urgency,
      client_name: caseData.client_name,
      jurisdiction: caseData.jurisdiction,
      language: caseData.language,
      applicable_laws: caseData.applicable_laws,
      documents: caseData.documents?.map((doc: any) => ({
        name: doc.file_name,
        category: doc.document_category,
        summary: doc.ocr_text?.substring(0, 500) // First 500 chars
      })) || [],
      legal_analysis: caseData.case_analysis?.map((analysis: any) => analysis.analysis_data) || [],
      conversation_history: caseData.conversations?.[0]?.messages?.slice(-10) || [] // Last 10 messages
    };

    const systemPrompt = `You are a professional legal proposal generator. Create a comprehensive, professional legal proposal based on the provided case information and lawyer input.

The proposal should be structured, professional, and include:
1. Executive Summary
2. Legal Analysis & Case Overview
3. Scope of Work & Services
4. Timeline & Milestones
5. Fee Structure & Payment Terms
6. Terms & Conditions
7. Next Steps

Use formal legal language appropriate for the jurisdiction (${caseData.jurisdiction}). Be specific about the legal issues identified and the proposed approach.

Case Information:
${JSON.stringify(caseContext, null, 2)}

Lawyer Input:
- Consultation Fee: $${proposalInput.consultation_fee}
- Remaining Fee: $${proposalInput.remaining_fee}
- Total Fee: $${proposalInput.consultation_fee + proposalInput.remaining_fee}
- Timeline: ${proposalInput.timeline}
- Strategy: ${proposalInput.strategy}

Generate a professional proposal document that combines all this information into a cohesive, persuasive legal proposal.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the professional legal proposal based on the provided information.' }
        ],
        max_completion_tokens: 2000,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const generatedProposal = data.choices[0].message.content;

    console.log('Successfully generated proposal');

    return new Response(JSON.stringify({ 
      generatedProposal,
      caseContext: {
        case_number: caseData.case_number,
        title: caseData.title,
        client_name: caseData.client_name
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-proposal function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});