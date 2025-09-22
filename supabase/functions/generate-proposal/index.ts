import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

if (!openAIApiKey) {
  console.error('OPENAI_API_KEY environment variable is not set');
}
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
      console.error('Missing required parameters:', { caseId: !!caseId, proposalInput: !!proposalInput });
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: caseId and proposalInput are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured. Please contact support.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating proposal for case:', caseId, 'with input:', {
      consultation_fee: proposalInput.consultation_fee,
      remaining_fee: proposalInput.remaining_fee,
      timeline: proposalInput.timeline,
      strategy: proposalInput.strategy?.substring(0, 100) + '...'
    });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch case data with separate simple queries
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error('Failed to fetch case data:', caseError);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch case data: ${caseError?.message || 'Case not found'}` 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch related data separately
    const [documentsResult, analysisResult, messagesResult, lawyerResult] = await Promise.all([
      supabase
        .from('documents')
        .select('file_name, document_category, ocr_text')
        .eq('case_id', caseId),
      
      supabase
        .from('case_analysis')
        .select('analysis_data, analysis_type')
        .eq('case_id', caseId),
      
      supabase
        .from('case_messages')
        .select('content, role, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      caseData.assigned_lawyer_id ? supabase
        .from('profiles')
        .select('first_name, last_name, law_firm, office_address, phone, office_phone, email, license_number, specializations, years_experience')
        .eq('user_id', caseData.assigned_lawyer_id)
        .single() : { data: null, error: null }
    ]);

    console.log('Fetched related data:', {
      documents: documentsResult.data?.length || 0,
      analysis: analysisResult.data?.length || 0,
      messages: messagesResult.data?.length || 0,
      lawyer: lawyerResult.data ? 'found' : 'not found'
    });

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
      documents: documentsResult.data?.map((doc: any) => ({
        name: doc.file_name,
        category: doc.document_category,
        summary: doc.ocr_text?.substring(0, 500) // First 500 chars
      })) || [],
      legal_analysis: analysisResult.data?.map((analysis: any) => analysis.analysis_data) || [],
      conversation_history: messagesResult.data || [] // Last 10 messages from case_messages
    };

    // Prepare lawyer information (privacy-protected)
    const lawyerInfo = lawyerResult.data ? {
      name: `${lawyerResult.data.first_name || ''} ${lawyerResult.data.last_name || ''}`.trim(),
      law_firm: lawyerResult.data.law_firm,
      specializations: lawyerResult.data.specializations,
      years_experience: lawyerResult.data.years_experience
    } : null;

    const systemPrompt = `Create a bilingual legal proposal (English first, then Arabic) with sections: Executive Summary, Legal Analysis, Scope of Work, Timeline, Fee Structure, Terms, Next Steps, Attorney Contact.

REQUIREMENTS:
- Use "=== ENGLISH VERSION ===" and "=== النسخة العربية ==="
- Timeline: numbered lists only, no tables
- Payment: LegalPro platform only
- Include disclaimers: "LegalPro is not liable for lawyer's work", "Contract between lawyer and client only", "Payments through LegalPro platform only"
- Use real lawyer data: ${lawyerInfo ? `${lawyerInfo.name}${lawyerInfo.law_firm ? `, ${lawyerInfo.law_firm}` : ''}` : 'TBD'}

Case: ${caseData.title} (${caseData.category})
Details: ${caseData.description}
Documents: ${caseContext.documents?.length || 0} files
Analysis: ${JSON.stringify(caseContext.analysis)}
Messages: ${caseContext.messages?.length || 0} exchanges

Fees: Consultation $${proposalInput.consultation_fee}, Remaining $${proposalInput.remaining_fee}
Timeline: ${proposalInput.timeline}
Strategy: ${proposalInput.strategy}`;

    // Try multiple models with fallback - prioritize working model
    const models = ['gpt-4.1-2025-04-14', 'gpt-4o', 'gpt-4o-mini'];
    let generatedProposal = null;
    let lastError = null;

    for (const model of models) {
      try {
        console.log(`Attempting proposal generation with model: ${model}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Generate the professional legal proposal based on the provided information.' }
            ],
            max_tokens: 3500,
          }),
        });

        const data = await response.json();
        console.log(`Model ${model} response status:`, response.status);
        
        if (!response.ok) {
          console.error(`OpenAI API error with ${model}:`, data);
          lastError = new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
          continue; // Try next model
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
          console.error(`Invalid response structure from ${model}:`, data);
          lastError = new Error(`Invalid response from ${model}`);
          continue;
        }

        generatedProposal = data.choices[0].message.content.trim();
        
        if (!generatedProposal || generatedProposal.length < 100) {
          console.error(`Generated proposal too short from ${model}:`, generatedProposal?.length || 0, 'characters');
          lastError = new Error(`Generated proposal is too short (${generatedProposal?.length || 0} characters)`);
          continue;
        }

        console.log(`Successfully generated proposal with ${model}, length:`, generatedProposal.length);
        break; // Success, exit loop
        
      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        lastError = error;
        continue;
      }
    }

    if (!generatedProposal) {
      console.error('All models failed to generate proposal:', lastError);
      return new Response(JSON.stringify({ 
        error: `Failed to generate proposal: ${lastError?.message || 'All AI models failed'}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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