import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    const { messages = [], category = 'General', language = 'en', caseId } = await req.json();

    console.log('Generating legal analysis for case:', caseId);
    
    // Create Supabase client with service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // If caseId is provided, fetch the case language
    let caseLanguage = language;
    if (caseId) {
      const { data: caseInfo } = await supabase
        .from('cases')
        .select('language')
        .eq('id', caseId)
        .single();
      
      if (caseInfo?.language) {
        caseLanguage = caseInfo.language;
        console.log('Using case language:', caseLanguage);
      }
    }

    // If caseId is provided, create a pending analysis record first
    if (caseId) {
      const { error: insertError } = await supabase
        .from('case_analysis')
        .insert({
          case_id: caseId,
          analysis_data: {},
          analysis_type: 'comprehensive',
          status: 'pending'
        });

      if (insertError) {
        console.error('Error creating pending analysis record:', insertError);
      }
    }

    const getSystemPrompt = (language: string, category: string) => {
      switch (language) {
        case 'ar':
          return `أنت مساعد ذكي متخصص في الاستشارات القانونية المصرية. ستقوم بتحليل المحادثات القانونية وتقديم تحليل قانوني شامل بصيغة JSON.

يجب أن تكون إجابتك عبارة عن كائن JSON صحيح بالهيكل التالي:
{
  "caseSummary": "ملخص موجز للقضية القانونية",
  "applicableLaws": [
    {
      "law": "اسم القانون",
      "articles": ["أرقام المواد"],
      "relevance": "كيفية تطبيق هذا القانون"
    }
  ],
  "recommendedSpecialization": {
    "primaryArea": "المجال القانوني الأساسي",
    "secondaryAreas": ["قائمة المجالات الثانوية"],
    "reasoning": "سبب توصية هذه المجالات"
  },
  "legalStrategy": {
    "immediateSteps": ["قائمة الإجراءات الفورية"],
    "documentation": ["الوثائق المطلوبة"],
    "timeline": "الجدول الزمني المتوقع",
    "risks": ["المخاطر المحتملة"],
    "opportunities": ["الجوانب المؤاتية"]
  },
  "caseComplexity": {
    "level": "منخفض|متوسط|مرتفع",
    "factors": ["عوامل التعقيد"],
    "estimatedCost": "تقدير التكلفة"
  },
  "jurisdiction": "مصر",
  "urgency": "منخفض|متوسط|مرتفع"
}

ركز على القانون المصري عند الإمكان. قدم نصائح عملية وقابلة للتنفيذ. اعتبر السياق الثقافي والقانوني لمصر.

الفئة: ${category}
اللغة: ${language}`;

        case 'de':
          return `Sie sind ein Experte für ägyptische Rechtsberatung. Sie werden Rechtsgespräche analysieren und eine umfassende Rechtsanalyse im JSON-Format bereitstellen.

Ihre Antwort muss ein gültiges JSON-Objekt mit der folgenden Struktur sein:
{
  "caseSummary": "Kurze Zusammenfassung des Rechtsproblems",
  "applicableLaws": [
    {
      "law": "Gesetzesname",
      "articles": ["Artikelnummern"],
      "relevance": "Wie dieses Gesetz gilt"
    }
  ],
  "recommendedSpecialization": {
    "primaryArea": "Primärer Rechtsbereich",
    "secondaryAreas": ["Liste sekundärer Bereiche"],
    "reasoning": "Warum diese Bereiche empfohlen werden"
  },
  "legalStrategy": {
    "immediateSteps": ["Liste sofortiger Maßnahmen"],
    "documentation": ["erforderliche Dokumente"],
    "timeline": "erwarteter Zeitplan",
    "risks": ["potentielle Risiken"],
    "opportunities": ["günstige Aspekte"]
  },
  "caseComplexity": {
    "level": "niedrig|mittel|hoch",
    "factors": ["Komplexitätsfaktoren"],
    "estimatedCost": "Kostenschätzung"
  },
  "jurisdiction": "ägypten",
  "urgency": "niedrig|mittel|hoch"
}

Konzentrieren Sie sich auf ägyptisches Recht, wenn zutreffend. Geben Sie praktische, umsetzbare Ratschläge. Berücksichtigen Sie den kulturellen und rechtlichen Kontext für Ägypten.

Kategorie: ${category}
Sprache: ${language}`;

        default: // English
          return `You are an expert Egyptian legal consultant AI assistant. You will analyze legal conversations and provide comprehensive legal analysis in JSON format.

Your response must be a valid JSON object with the following structure:
{
  "caseSummary": "Brief summary of the legal issue",
  "applicableLaws": [
    {
      "law": "Law Name",
      "articles": ["article numbers"],
      "relevance": "How this law applies"
    }
  ],
  "recommendedSpecialization": {
    "primaryArea": "Primary legal area",
    "secondaryAreas": ["list of secondary areas"],
    "reasoning": "Why these areas are recommended"
  },
  "legalStrategy": {
    "immediateSteps": ["list of immediate actions"],
    "documentation": ["required documents"],
    "timeline": "expected timeline",
    "risks": ["potential risks"],
    "opportunities": ["favorable aspects"]
  },
  "caseComplexity": {
    "level": "low|medium|high",
    "factors": ["complexity factors"],
    "estimatedCost": "cost estimate"
  },
  "jurisdiction": "egypt",
  "urgency": "low|medium|high"
}

Focus on Egyptian law when applicable. Provide practical, actionable advice. Consider cultural and legal context for Egypt.

Category: ${category}
Language: ${caseLanguage}`;
      }
    };

    const systemPrompt = getSystemPrompt(caseLanguage, category);

    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      { 
        role: 'user', 
        content: `Please analyze this legal conversation and provide a comprehensive analysis:

Conversation Messages:
${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}

Please provide your analysis in the exact JSON format specified.`
      }
    ];

    console.log('Calling OpenAI API for legal analysis...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: conversationMessages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('OpenAI API Error:', response.status, errorDetails);
      throw new Error(`OpenAI API error: ${response.status} - ${errorDetails}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received');

    let legalAnalysis;
    try {
      // Parse the AI response as JSON
      const aiResponse = data.choices[0].message.content;
      console.log('Raw AI response:', aiResponse);
      
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        legalAnalysis = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed legal analysis JSON');
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response as JSON:', parseError);
      // Fallback analysis structure
      legalAnalysis = {
        caseSummary: messages.length > 0 
          ? messages.filter(m => m.role === 'user').map(m => m.content).join(' ').slice(0, 500)
          : 'Legal matter requiring professional consultation',
        applicableLaws: [],
        recommendedSpecialization: {
          primaryArea: category || 'General Legal',
          secondaryAreas: [],
          reasoning: "Based on case category and initial assessment"
        },
        legalStrategy: {
          immediateSteps: ["Consult with qualified lawyer", "Gather relevant documents"],
          documentation: [],
          timeline: "To be determined upon legal consultation",
          risks: [],
          opportunities: []
        },
        caseComplexity: {
          level: 'medium',
          factors: ["Requires professional legal assessment"],
          estimatedCost: "To be determined"
        },
        jurisdiction: "egypt",
        urgency: 'medium'
      };
    }

    // If caseId is provided, save the analysis to the database
    if (caseId) {
      console.log('Saving legal analysis to database for case:', caseId);
      
      const { error: updateError } = await supabase
        .from('case_analysis')
        .update({
          analysis_data: legalAnalysis,
          status: 'completed',
          generated_at: new Date().toISOString()
        })
        .eq('case_id', caseId)
        .eq('status', 'pending');

      if (updateError) {
        console.error('Error saving analysis to database:', updateError);
        // Continue anyway - analysis was generated successfully
      } else {
        console.log('Legal analysis saved successfully to database');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      legalAnalysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-legal-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate legal analysis', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});