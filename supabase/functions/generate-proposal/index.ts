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

    // Fetch case data using separate queries (same approach as admin dashboard)
    console.log('Fetching case data for case:', caseId);
    
    // 1. Fetch base case data
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

    console.log('Base case data fetched successfully');

    // 2. Fetch case messages
    const { data: caseMessages } = await supabase
      .from('case_messages')
      .select('content, role, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });

    console.log(`Fetched ${caseMessages?.length || 0} case messages`);

    // 3. Fetch documents
    const { data: documents } = await supabase
      .from('documents')
      .select('file_name, document_category, ocr_text')
      .eq('case_id', caseId);

    console.log(`Fetched ${documents?.length || 0} documents`);

    // 4. Fetch case analysis
    const { data: caseAnalysis } = await supabase
      .from('case_analysis')
      .select('analysis_data, analysis_type')
      .eq('case_id', caseId);

    console.log(`Fetched ${caseAnalysis?.length || 0} case analysis records`);

    // 5. Fetch assigned lawyer profile (if exists)
    let lawyerProfile = null;
    if (caseData.assigned_lawyer_id) {
      console.log('Fetching lawyer profile for ID:', caseData.assigned_lawyer_id);
      const { data: lawyer } = await supabase
        .from('profiles')
        .select(`
          first_name,
          last_name,
          law_firm,
          office_address,
          phone,
          office_phone,
          email,
          license_number,
          specializations,
          years_experience
        `)
        .eq('user_id', caseData.assigned_lawyer_id)
        .maybeSingle();
      
      lawyerProfile = lawyer;
      console.log('Lawyer profile fetched:', !!lawyerProfile);
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
      documents: documents?.map((doc: any) => ({
        name: doc.file_name,
        category: doc.document_category,
        summary: doc.ocr_text?.substring(0, 500) // First 500 chars
      })) || [],
      legal_analysis: caseAnalysis?.map((analysis: any) => analysis.analysis_data) || [],
      conversation_history: caseMessages?.slice(-10) || [] // Last 10 messages
    };

    // Prepare lawyer information
    const lawyerInfo = lawyerProfile ? {
      name: `${lawyerProfile.first_name || ''} ${lawyerProfile.last_name || ''}`.trim(),
      law_firm: lawyerProfile.law_firm,
      office_address: lawyerProfile.office_address,
      phone: lawyerProfile.phone || lawyerProfile.office_phone,
      email: lawyerProfile.email,
      license_number: lawyerProfile.license_number,
      specializations: lawyerProfile.specializations,
      years_experience: lawyerProfile.years_experience
    } : null;

    const systemPrompt = `You are a professional legal proposal generator for the LegalPro platform. Create a comprehensive, bilingual legal proposal in both English and Arabic with identical content structure.

CRITICAL BILINGUAL FORMATTING REQUIREMENTS:
- Generate proposal in BOTH languages (English first, then Arabic)
- Each section must have identical content in both languages
- Use clear section headers to separate languages: "=== ENGLISH VERSION ===" and "=== النسخة العربية ==="
- Timeline sections: Use structured bullet points or numbered lists, NEVER use pipe characters (|) or table formatting
- Payment terms: ALL payments are processed through the LegalPro platform only
- Lawyer information: Use the actual lawyer contact details provided, NEVER use placeholders like [Attorney Name]
- Platform disclaimers: Include specific liability and payment processing disclaimers in both languages

STRUCTURE FOR BOTH LANGUAGES:
1. Executive Summary
2. Legal Analysis & Case Overview
3. Scope of Work & Services
4. Timeline & Milestones (use clean numbered lists or bullet points)
5. Fee Structure & Payment Terms (LegalPro platform only)
6. Terms & Conditions (include platform disclaimers)
7. Next Steps
8. Attorney Contact Information (use real data from assigned lawyer)

MANDATORY PLATFORM DISCLAIMERS (in both languages):
English:
- "LegalPro is not liable for any work commenced by the lawyer"
- "This scope of work contract is between the lawyer and the client only"
- "Payment for security reasons is handled by Egyptlegalpro.com through the LegalPro platform"
- "All payments must be processed through the LegalPro platform - no direct payments, wire transfers, or checks accepted"

Arabic:
- "منصة LegalPro غير مسؤولة عن أي عمل يبدأه المحامي"
- "عقد نطاق العمل هذا بين المحامي والعميل فقط"
- "يتم التعامل مع الدفع لأسباب أمنية من خلال Egyptlegalpro.com عبر منصة LegalPro"
- "يجب معالجة جميع المدفوعات من خلال منصة LegalPro - لا يُقبل أي دفع مباشر أو تحويل مصرفي أو شيكات"

Use formal legal language appropriate for the jurisdiction (${caseData.jurisdiction}). Be specific about the legal issues identified and the proposed approach. Ensure both versions are professional and culturally appropriate.

Case Information:
${JSON.stringify(caseContext, null, 2)}

Assigned Lawyer Information:
${lawyerInfo ? JSON.stringify(lawyerInfo, null, 2) : 'No lawyer assigned yet'}

Lawyer Input:
- Consultation Fee: $${proposalInput.consultation_fee}
- Remaining Fee: $${proposalInput.remaining_fee}
- Total Fee: $${proposalInput.consultation_fee + proposalInput.remaining_fee}
- Timeline: ${proposalInput.timeline}
- Strategy: ${proposalInput.strategy}

Generate a professional proposal document that combines all this information into a cohesive, persuasive legal proposal. Use the actual lawyer contact information in the attorney section, format timelines as clean numbered lists, and include all required platform disclaimers.`;

    // Try multiple models with fallback
    const models = ['gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-4.1-2025-04-14'];
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
            max_completion_tokens: 2000,
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