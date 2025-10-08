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

    if (proposalError || !proposal) {
      console.error('Proposal fetch error:', proposalError);
      throw new Error(`Proposal not found: ${proposalError?.message}`);
    }
    
    console.log('Successfully fetched proposal:', proposal.id);

    // Fetch lawyer and client profiles
    const { data: lawyerProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, license_number, national_id_passport, law_firm_name')
      .eq('user_id', proposal.lawyer_id)
      .single();
    
    const { data: clientProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name, national_id_passport')
      .eq('user_id', proposal.client_id)
      .single();
    
    const { data: documents } = await supabaseClient
      .from('documents')
      .select('file_name, document_category')
      .eq('case_id', proposal.case_id);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
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

    // Calculate 6% platform fee on base legal fees
    const platformFeeAmount = Math.round(baseLegalFee * 0.06);
    const totalPayable = baseLegalFee + platformFeeAmount;

    const clientName = clientProfile ? `${clientProfile.first_name} ${clientProfile.last_name}` : 'Client';
    const clientId = clientProfile?.national_id_passport || '[National ID/Passport No.]';
    const lawyerName = lawyerProfile ? `${lawyerProfile.first_name} ${lawyerProfile.last_name}` : 'Lawyer';
    const lawyerBarNo = lawyerProfile?.license_number || '[Bar Registration No.]';
    const lawFirmName = lawyerProfile?.law_firm_name || lawyerName;

    // Generate scope using AI (only the dynamic part)
    const generateScope = async (lang: 'en' | 'ar') => {
      const startTime = Date.now();
      console.log(`Starting scope generation for ${lang}...`);
      
      const scopePrompt = lang === 'ar'
        ? `أنت كاتب عقود قانونية خبير. اكتب فقرة واحدة موجزة ومهنية (2-3 جمل فقط) تصف نطاق الخدمات القانونية بناءً على:

العنوان: ${proposal.cases.title}
الفئة: ${proposal.cases.category}
الوصف: ${proposal.cases.description || 'غير محدد'}
الجدول الزمني: ${effectiveTimeline || 'سيتم تحديده'}
الاستراتيجية: ${effectiveStrategy || 'حسب الاتفاق'}
${consultationNotes ? `ملاحظات: ${consultationNotes}` : ''}

اكتب بصيغة رسمية مناسبة للعقود القانونية المصرية. ركز على المهام الرئيسية والنتائج المتوقعة فقط.`
        : `You are an expert legal contract writer. Write ONE concise, professional paragraph (2-3 sentences only) describing the scope of legal services based on:

Case Title: ${proposal.cases.title}
Category: ${proposal.cases.category}
Description: ${proposal.cases.description || 'Not provided'}
Timeline: ${effectiveTimeline || 'To be determined'}
Strategy: ${effectiveStrategy || 'As discussed'}
${consultationNotes ? `Notes: ${consultationNotes}` : ''}

Write in formal language appropriate for Egyptian legal contracts. Focus only on key deliverables and expected outcomes.`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: scopePrompt }
            ],
            max_tokens: 500
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Lovable AI error (${lang}):`, response.status, errorText);
          
          if (response.status === 429) {
            throw new Error('RATE_LIMIT');
          }
          if (response.status === 402) {
            throw new Error('PAYMENT_REQUIRED');
          }
          throw new Error(`AI_ERROR: ${response.statusText}`);
        }

        const data = await response.json();
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`Scope generation for ${lang} completed in ${elapsedTime}s`);
        
        return data.choices[0].message.content.trim();
      } catch (error) {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`Scope generation for ${lang} failed after ${elapsedTime}s:`, error);
        
        if (error.name === 'AbortError') {
          throw new Error('TIMEOUT');
        }
        throw error;
      }
    };

    // Generate scopes
    console.log('Starting scope generation with language:', language);
    const scopeStartTime = Date.now();
    
    let scopeEn = null;
    let scopeAr = null;
    let scopeError = null;

    try {
      if (language === 'both') {
        console.log('Generating both scopes in parallel...');
        [scopeEn, scopeAr] = await Promise.all([
          generateScope('en').catch(err => { throw err; }),
          generateScope('ar').catch(err => { throw err; })
        ]);
      } else if (language === 'en') {
        scopeEn = await generateScope('en');
      } else if (language === 'ar') {
        scopeAr = await generateScope('ar');
      }
      
      const totalTime = ((Date.now() - scopeStartTime) / 1000).toFixed(2);
      console.log(`Scope generation completed in ${totalTime}s`);
    } catch (error: any) {
      console.error('Scope generation failed:', error);
      scopeError = error.message;
      
      // Use fallback scopes
      const fallbackScopeEn = `Based on the case details provided (${proposal.cases.title} - ${proposal.cases.category}), the Lawyer will provide comprehensive legal services including consultation, document preparation, and representation as needed. ${effectiveTimeline ? `Expected timeline: ${effectiveTimeline}.` : ''} ${effectiveStrategy ? `Legal strategy: ${effectiveStrategy}.` : ''}`;
      
      const fallbackScopeAr = `بناءً على تفاصيل القضية المقدمة (${proposal.cases.title} - ${proposal.cases.category})، سيقدم المحامي خدمات قانونية شاملة تشمل الاستشارة وإعداد المستندات والتمثيل القانوني حسب الحاجة. ${effectiveTimeline ? `الجدول الزمني المتوقع: ${effectiveTimeline}.` : ''} ${effectiveStrategy ? `الاستراتيجية القانونية: ${effectiveStrategy}.` : ''}`;
      
      if (language === 'both' || language === 'en') scopeEn = fallbackScopeEn;
      if (language === 'both' || language === 'ar') scopeAr = fallbackScopeAr;
      
      console.log('Using fallback scopes');
    }

    // Build deterministic contract templates
    const buildContractEn = (scope: string) => {
      const paymentStructureText = 
        effectivePaymentStructure === 'fixed_fee'
          ? `Fixed Fee: ${effectiveRemainingFee} EGP`
          : effectivePaymentStructure === 'contingency'
          ? `Contingency Fee: ${effectiveContingencyPercentage}% of the outcome`
          : `Hybrid: ${effectiveHybridFixedFee} EGP fixed + ${effectiveHybridContingencyPercentage}% contingency`;

      return `**Lawyer–Client Service Agreement (LegalPro)**

**1. Parties and Background**

This Agreement is entered into between:
- **Client:** ${clientName}, National ID/Passport No. ${clientId}
- **Lawyer/Law Firm:** ${lawFirmName}, Bar Registration No. ${lawyerBarNo}

The Lawyer is an independent practitioner registered with LegalPro, a platform that connects clients with verified lawyers. LegalPro is not a law firm and is not a party to this agreement. Its role is limited to facilitating communication and secure payments through escrow.

**2. Scope of Services**

**Case:** ${proposal.cases.title}
**Category:** ${proposal.cases.category}

${scope}

No additional or unrelated services are covered under this agreement without a separate contract.

**3. Fees and Payment**

- **Total Agreed Legal Fees:** ${paymentStructureText}
- **Platform Fee (LegalPro):** ${platformFeeAmount} EGP (6% of legal fees)
- **Payment Processing Fee:** (included)
- **Client Protection Fee:** (included)
- **Total Amount Payable by Client:** ${effectivePaymentStructure === 'contingency' ? 'Contingency-based (applicable upon settlement)' : `${totalPayable} EGP`}

All payments shall be made through LegalPro's escrow system. Funds will be released per LegalPro's Terms of Service after service completion and mutual agreement. Fees are non-refundable except in cases of verified malpractice or misconduct. Direct or off-platform payments are strictly prohibited.

**4. Confidentiality**

Both parties agree to maintain the confidentiality of all information exchanged during the course of this engagement. LegalPro may access communications for case management, quality assurance, and dispute resolution purposes only.

**5. Communication**

All communication between the Client and Lawyer must occur through LegalPro's secure platform. Off-platform communication voids client protection and may result in account suspension.

**6. Lawyer's Duties**

The Lawyer confirms that they are duly licensed and in good standing with the relevant bar association. The Lawyer agrees to:
- Provide services with professional care, diligence, and integrity
- Comply with all applicable legal and ethical standards
- Keep the Client informed of case progress

**7. Client's Duties**

The Client agrees to:
- Provide accurate and complete information
- Cooperate fully with the Lawyer
- Acknowledge that LegalPro is not responsible for the Lawyer's work product or professional conduct

**8. Limitation of Liability**

The Lawyer is solely responsible for the quality and outcome of legal services. LegalPro is not responsible for any legal services, advice, or representation provided by the Lawyer. Refunds are limited to confirmed cases of malpractice or misconduct as determined by LegalPro's review process.

**9. Dispute Resolution**

Any disputes arising from this Agreement shall first be submitted to LegalPro's internal mediation process. If unresolved, disputes shall be subject to Egyptian jurisdiction under Egyptian law.

**10. Termination**

Either party may terminate this Agreement with written notice. LegalPro will review the circumstances to ensure fair allocation of funds based on work completed.

**11. Governing Law**

This Agreement is governed by the laws of the Arab Republic of Egypt.

**12. Signatures (Ink Required)**

Both parties confirm their understanding and agreement to the terms outlined above. Physical signatures are required (scan/upload permitted).

**Client Signature:** _________________________  **Date:** ____________

**Lawyer Signature:** _________________________  **Date:** ____________`;
    };

    const buildContractAr = (scope: string) => {
      const paymentStructureText = 
        effectivePaymentStructure === 'fixed_fee'
          ? `رسوم ثابتة: ${effectiveRemainingFee} جنيه مصري`
          : effectivePaymentStructure === 'contingency'
          ? `رسوم طوارئ: ${effectiveContingencyPercentage}٪ من النتيجة`
          : `مختلط: ${effectiveHybridFixedFee} جنيه مصري ثابت + ${effectiveHybridContingencyPercentage}٪ طوارئ`;

      return `**اتفاقية خدمات المحامي والعميل (ليجال برو)**

**1. الأطراف والخلفية**

تم إبرام هذه الاتفاقية بين:
- **العميل:** ${clientName}، رقم الهوية الوطنية/جواز السفر ${clientId}
- **المحامي/مكتب المحاماة:** ${lawFirmName}، رقم التسجيل ${lawyerBarNo}

المحامي هو ممارس مستقل مسجل لدى ليجال برو، وهي منصة تربط العملاء بمحامين موثقين. ليجال برو ليست مكتب محاماة وليست طرفًا في هذه الاتفاقية. دورها يقتصر على تسهيل التواصل والدفعات الآمنة من خلال نظام الضمان.

**2. نطاق الخدمات**

**القضية:** ${proposal.cases.title}
**الفئة:** ${proposal.cases.category}

${scope}

لا تغطي هذه الاتفاقية أي خدمات إضافية أو غير ذات صلة دون عقد منفصل.

**3. الرسوم والدفع**

- **إجمالي الرسوم القانونية المتفق عليها:** ${paymentStructureText}
- **رسوم المنصة (ليجال برو):** ${platformFeeAmount} جنيه مصري (6٪ من الرسوم القانونية)
- **رسوم معالجة الدفع:** (مشمولة)
- **رسوم حماية العميل:** (مشمولة)
- **المبلغ الإجمالي المستحق على العميل:** ${effectivePaymentStructure === 'contingency' ? 'على أساس الطوارئ (تطبق عند التسوية)' : `${totalPayable} جنيه مصري`}

يجب أن تتم جميع المدفوعات من خلال نظام الضمان الخاص بليجال برو. سيتم إطلاق الأموال وفقًا لشروط خدمة ليجال برو بعد إتمام الخدمة والاتفاق المتبادل. الرسوم غير قابلة للاسترداد إلا في حالات سوء الممارسة أو السلوك غير المهني الموثق. الدفعات المباشرة أو خارج المنصة محظورة تمامًا.

**4. السرية**

يوافق كلا الطرفين على الحفاظ على سرية جميع المعلومات المتبادلة خلال هذا العمل. قد تصل ليجال برو إلى الاتصالات لأغراض إدارة الحالة وضمان الجودة وحل النزاعات فقط.

**5. التواصل**

يجب أن يتم جميع التواصل بين العميل والمحامي من خلال منصة ليجال برو الآمنة. التواصل خارج المنصة يلغي حماية العميل وقد يؤدي إلى تعليق الحساب.

**6. واجبات المحامي**

يؤكد المحامي أنه مرخص حسب الأصول وبوضع جيد مع نقابة المحامين ذات الصلة. يوافق المحامي على:
- تقديم الخدمات بعناية مهنية وحرص ونزاهة
- الامتثال لجميع المعايير القانونية والأخلاقية المعمول بها
- إبقاء العميل على اطلاع بتقدم القضية

**7. واجبات العميل**

يوافق العميل على:
- تقديم معلومات دقيقة وكاملة
- التعاون الكامل مع المحامي
- الإقرار بأن ليجال برو غير مسؤولة عن عمل المحامي أو سلوكه المهني

**8. تحديد المسؤولية**

المحامي هو المسؤول الوحيد عن جودة ونتيجة الخدمات القانونية. ليجال برو غير مسؤولة عن أي خدمات قانونية أو استشارات أو تمثيل يقدمه المحامي. تقتصر المبالغ المستردة على حالات سوء الممارسة أو السلوك غير المهني المؤكدة كما تحددها عملية المراجعة الخاصة بليجال برو.

**9. حل النزاعات**

يجب أولاً تقديم أي نزاعات ناشئة عن هذه الاتفاقية إلى عملية الوساطة الداخلية لليجال برو. إذا لم يتم حلها، تخضع النزاعات للاختصاص المصري بموجب القانون المصري.

**10. الإنهاء**

يجوز لأي من الطرفين إنهاء هذه الاتفاقية بإشعار كتابي. ستراجع ليجال برو الظروف لضمان التخصيص العادل للأموال بناءً على العمل المنجز.

**11. القانون الحاكم**

تخضع هذه الاتفاقية لقوانين جمهورية مصر العربية.

**12. التوقيعات (مطلوب بالحبر)**

يؤكد كلا الطرفين فهمهما وموافقتهما على الشروط الموضحة أعلاه. التوقيعات الفعلية مطلوبة (يُسمح بالمسح الضوئي/التحميل).

**توقيع العميل:** _________________________  **التاريخ:** ____________

**توقيع المحامي:** _________________________  **التاريخ:** ____________`;
    };

    // Build final contracts
    let contentEn = null;
    let contentAr = null;

    if (scopeEn) contentEn = buildContractEn(scopeEn);
    if (scopeAr) contentAr = buildContractAr(scopeAr);

    const totalTime = ((Date.now() - scopeStartTime) / 1000).toFixed(2);
    console.log(`Total contract assembly completed in ${totalTime}s`);

    return new Response(
      JSON.stringify({
        success: true,
        content_en: contentEn,
        content_ar: contentAr,
        proposal_id: proposalId,
        case_id: proposal.case_id,
        generation_time: totalTime,
        used_fallback: !!scopeError,
        error_code: scopeError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-contract function:', error);
    
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message === 'RATE_LIMIT') {
      errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
      statusCode = 429;
    } else if (error.message === 'PAYMENT_REQUIRED') {
      errorMessage = 'AI credits required. Please add credits to continue.';
      statusCode = 402;
    } else if (error.message === 'TIMEOUT') {
      errorMessage = 'Contract generation timed out. Please try again.';
      statusCode = 408;
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
