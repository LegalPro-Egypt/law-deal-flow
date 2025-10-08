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
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    
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

    console.log('Received proposalId:', proposalId);

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
        )
      `)
      .eq('id', proposalId)
      .single();

    if (proposalError) {
      console.error('Proposal fetch error:', proposalError);
      throw new Error(`Proposal not found: ${proposalError.message}`);
    }
    
    if (!proposal) {
      console.error('Proposal is null for ID:', proposalId);
      throw new Error('Proposal not found');
    }
    
    console.log('Successfully fetched proposal:', proposal.id);

    // Fetch lawyer profile
    const { data: lawyerProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, license_number, national_id_passport, law_firm_name')
      .eq('user_id', proposal.lawyer_id)
      .single();
    
    console.log('Lawyer profile fetched:', lawyerProfile?.first_name);

    // Fetch client profile
    const { data: clientProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, national_id_passport')
      .eq('user_id', proposal.client_id)
      .single();
    
    console.log('Client profile fetched:', clientProfile?.first_name);

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

    // Calculate base legal fee based on payment structure
    let baseLegalFee = 0;
    if (effectivePaymentStructure === 'fixed_fee') {
      baseLegalFee = effectiveRemainingFee || 0;
    } else if (effectivePaymentStructure === 'hybrid') {
      baseLegalFee = effectiveHybridFixedFee || 0;
    }
    // For contingency, base fee is 0 (no upfront payment)

    // Calculate 6% platform fee on base legal fees
    const platformFeeAmount = Math.round(baseLegalFee * 0.06);
    const totalPayable = baseLegalFee + platformFeeAmount;

    const paymentStructureText = 
      effectivePaymentStructure === 'fixed_fee'
        ? `Fixed Fee: ${effectiveRemainingFee} EGP`
        : effectivePaymentStructure === 'contingency'
        ? `Contingency Fee: ${effectiveContingencyPercentage}% of the outcome`
        : `Hybrid: ${effectiveHybridFixedFee} EGP fixed + ${effectiveHybridContingencyPercentage}% contingency`;

    const clientName = clientProfile ? `${clientProfile.first_name} ${clientProfile.last_name}` : 'Client';
    const clientId = clientProfile?.national_id_passport || '[National ID/Passport No.]';
    const lawyerName = lawyerProfile ? `${lawyerProfile.first_name} ${lawyerProfile.last_name}` : 'Lawyer';
    const lawyerBarNo = lawyerProfile?.license_number || '[Bar Registration No.]';
    const lawFirmName = lawyerProfile?.law_firm_name || lawyerName;

    const systemPrompt = `You are an expert Egyptian legal contract writer. Generate a "Lawyer–Client Service Agreement (LegalPro)" following Egyptian law.

CRITICAL INSTRUCTIONS:
- DO NOT include email addresses or phone numbers anywhere in the contract
- Use ONLY the provided names and ID numbers for party identification
- Follow the exact 12-section structure below

CLIENT INFORMATION:
- Full Name: ${clientName}
- National ID/Passport: ${clientId}

LAWYER INFORMATION:
- Full Name/Law Firm: ${lawFirmName}
- Bar Registration No.: ${lawyerBarNo}

CASE DETAILS:
- Case Title: ${proposal.cases.title}
- Category: ${proposal.cases.category}
- Description: ${proposal.cases.description || 'Not provided'}
- Timeline: ${effectiveTimeline || 'To be determined'}
- Strategy/Scope: ${effectiveStrategy || 'As discussed'}
${consultationNotes ? `- Consultation Notes: ${consultationNotes}` : ''}

PAYMENT STRUCTURE:
- Base Legal Fees: ${paymentStructureText}
- Platform Fee: ${platformFeeAmount} EGP (6% of legal fees)
- Payment Processing Fee: (included)
- Client Protection Fee: (included)
- TOTAL AMOUNT PAYABLE: ${effectivePaymentStructure === 'contingency' ? 'Contingency-based (applicable upon settlement)' : `${totalPayable} EGP`}

REQUIRED CONTRACT STRUCTURE (EXACTLY 12 SECTIONS):

**Lawyer–Client Service Agreement (LegalPro)**

**1. Parties and Background**
This Agreement is entered into between:
- Client: ${clientName}, National ID/Passport No. ${clientId}
- Lawyer/Law Firm: ${lawFirmName}, Bar Registration No. ${lawyerBarNo}

Include standard disclaimer: "The Lawyer is an independent practitioner registered with LegalPro, a platform that connects clients with verified lawyers. LegalPro is not a law firm and is not a party to this agreement. Its role is limited to facilitating communication and secure payments through escrow."

**2. Scope of Services**
- Description of Work: [Based on case: ${proposal.cases.title} - ${proposal.cases.category}]
- Deliverables: [Based on strategy and timeline provided]
- Include: "No additional or unrelated services are covered under this agreement without a separate contract."

**3. Fees and Payment**
- Total Agreed Legal Fees: ${paymentStructureText}
- Platform Fee (LegalPro): ${platformFeeAmount} EGP (6% of legal fees)
- Payment Processing Fee: (included)
- Client Protection Fee: (included)
- Total Amount Payable by Client: ${effectivePaymentStructure === 'contingency' ? 'Contingency-based (applicable upon settlement)' : `${totalPayable} EGP`}

Include all standard payment terms:
- All payments through LegalPro's escrow system
- Funds released per LegalPro's Terms of Service after service completion
- Non-refundable except verified malpractice/misconduct
- No direct or off-platform payments permitted

**4. Confidentiality**
Standard mutual confidentiality clause with LegalPro's limited access for management/dispute purposes.

**5. Communication**
All communication through LegalPro's secure platform. Off-platform communication voids protection.

**6. Lawyer's Duties**
- Licensed and in good standing
- Professional care, diligence, integrity
- Compliance with legal/ethical standards

**7. Client's Duties**
- Provide accurate information and documentation
- Full cooperation
- Acknowledgment LegalPro not liable for lawyer's work

**8. Limitation of Liability**
- Lawyer solely responsible for work quality
- LegalPro not responsible for legal services
- Refund limited to confirmed malpractice cases

**9. Dispute Resolution**
- First: LegalPro internal mediation
- Then: Egyptian jurisdiction under Egyptian law

**10. Termination**
- Written notice required
- LegalPro reviews for fair fund allocation based on work completed

**11. Governing Law**
This Agreement is governed by the laws of the Arab Republic of Egypt.

**12. Signatures (Ink Required)**
Both parties confirm understanding and agreement. Physical signatures required (scan/upload permitted).

Client Signature: _________________________  Date: ____________

Lawyer Signature: _________________________  Date: ____________

Generate a complete, professional contract following this exact structure. Be detailed in sections 2 and 3. Use formal legal language appropriate for Egyptian law.`;

    const generateContent = async (lang: 'en' | 'ar') => {
      const startTime = Date.now();
      console.log(`Starting contract generation for ${lang}...`);
      
      const languageInstruction = lang === 'ar' 
        ? 'Write the contract in formal Arabic (العربية الفصحى) appropriate for legal documents in Egypt.'
        : 'Write the contract in formal English appropriate for legal documents.';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

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
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.text();
          console.error(`OpenAI API error (${lang}):`, error);
          throw new Error(`Failed to generate contract in ${lang}: ${response.statusText}`);
        }

        const data = await response.json();
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Contract generation for ${lang} completed in ${elapsedTime}s`);
        
        return data.choices[0].message.content;
      } catch (error) {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`Contract generation for ${lang} failed after ${elapsedTime}s:`, error);
        
        if (error.name === 'AbortError') {
          throw new Error(`Contract generation timed out after 90 seconds for ${lang}`);
        }
        throw error;
      }
    };

    console.log('Starting contract generation with language:', language);
    const generationStartTime = Date.now();
    
    let contentEn = null;
    let contentAr = null;

    // Use parallel generation for "both" to cut time in half
    if (language === 'both') {
      console.log('Generating both languages in parallel...');
      try {
        [contentEn, contentAr] = await Promise.all([
          generateContent('en'),
          generateContent('ar')
        ]);
        const totalTime = ((Date.now() - generationStartTime) / 1000).toFixed(2);
        console.log(`Parallel generation completed in ${totalTime}s`);
      } catch (error) {
        console.error('Parallel generation failed:', error);
        throw error;
      }
    } else if (language === 'en') {
      contentEn = await generateContent('en');
    } else if (language === 'ar') {
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