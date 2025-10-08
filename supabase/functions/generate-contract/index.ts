import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      proposalId, 
      consultationNotes, 
      language = 'both',
      // New fields from contract creation dialog
      paymentStructure,
      consultationFee,
      remainingFee,
      contingencyPercentage,
      hybridFixedFee,
      hybridContingencyPercentage,
      timeline,
      strategy
    } = await req.json();

    if (!proposalId) {
      throw new Error('proposalId is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Fetch proposal details
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select(`
        *,
        cases (
          id,
          case_number,
          title,
          description,
          category,
          user_id
        ),
        profiles!proposals_lawyer_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError || !proposal) {
      throw new Error('Proposal not found');
    }

    // Fetch case documents
    const { data: documents } = await supabaseClient
      .from('documents')
      .select('file_name, document_category')
      .eq('case_id', proposal.case_id);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Use provided values if present, otherwise fall back to proposal data
    const effectivePaymentStructure = paymentStructure || proposal.payment_structure;
    const effectiveConsultationFee = consultationFee ?? proposal.consultation_fee;
    const effectiveRemainingFee = remainingFee ?? proposal.remaining_fee;
    const effectiveContingencyPercentage = contingencyPercentage ?? proposal.contingency_percentage;
    const effectiveHybridFixedFee = hybridFixedFee ?? proposal.hybrid_fixed_fee;
    const effectiveHybridContingencyPercentage = hybridContingencyPercentage ?? proposal.hybrid_contingency_percentage;
    const effectiveTimeline = timeline || proposal.timeline;
    const effectiveStrategy = strategy || proposal.strategy;

    const paymentStructureText = 
      effectivePaymentStructure === 'fixed_fee'
        ? `Fixed Fee: ${effectiveRemainingFee} EGP`
        : effectivePaymentStructure === 'contingency'
        ? `Contingency Fee: ${effectiveContingencyPercentage}% of the outcome`
        : `Hybrid: ${effectiveHybridFixedFee} EGP fixed + ${effectiveHybridContingencyPercentage}% contingency`;

    const systemPrompt = `You are an expert Egyptian legal contract writer. Generate a comprehensive, legally binding contract based on the provided case details and proposal.

PAYMENT STRUCTURE: ${paymentStructureText}
TIMELINE: ${effectiveTimeline || 'Not specified'}
STRATEGY: ${effectiveStrategy || 'Not specified'}
${consultationNotes ? `CONSULTATION NOTES: ${consultationNotes}` : ''}

The contract must include:
1. Parties (Client and Lawyer identification)
2. Scope of Legal Services
3. Payment Terms and Schedule (based on ${proposal.payment_structure})
4. Timeline and Deliverables
5. Confidentiality Clause
6. Termination Conditions
7. Dispute Resolution
8. Governing Law (Egyptian Law)
9. Client and Lawyer Obligations
10. Additional fees and expenses policy

Format the contract professionally with clear sections. Be specific about the payment structure and terms.`;

    const generateContent = async (lang: 'en' | 'ar') => {
      const languageInstruction = lang === 'ar' 
        ? 'Write the contract in formal Arabic (العربية الفصحى) appropriate for legal documents in Egypt.'
        : 'Write the contract in formal English appropriate for legal documents.';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt + '\n\n' + languageInstruction },
            {
              role: 'user',
              content: `Generate a legal contract for:
Case: ${proposal.cases.title}
Category: ${proposal.cases.category}
Description: ${proposal.cases.description || 'Not provided'}
Documents: ${documents?.map(d => d.file_name).join(', ') || 'None'}

Ensure all contract terms are clear, specific, and legally binding under Egyptian law.`
            }
          ],
          temperature: 0.7,
          max_tokens: 3000
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`OpenAI API error (${lang}):`, error);
        throw new Error(`Failed to generate contract in ${lang}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    };

    let contentEn = null;
    let contentAr = null;

    if (language === 'both' || language === 'en') {
      contentEn = await generateContent('en');
    }

    if (language === 'both' || language === 'ar') {
      contentAr = await generateContent('ar');
    }

    return new Response(
      JSON.stringify({
        success: true,
        content_en: contentEn,
        content_ar: contentAr,
        proposal_id: proposalId,
        case_id: proposal.case_id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-contract function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});