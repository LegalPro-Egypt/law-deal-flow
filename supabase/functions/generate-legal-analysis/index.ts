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

    // Generate English system prompt
    const englishSystemPrompt = `You are an expert Egyptian legal consultant AI assistant. You will analyze legal conversations and provide comprehensive legal analysis in JSON format.

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
    "factors": ["complexity factors"]
  },
  "jurisdiction": "egypt",
  "urgency": "low|medium|high"
}

Focus on Egyptian law when applicable. Provide practical, actionable advice. Consider cultural and legal context for Egypt.

Category: ${category}`;

    // Generate Arabic system prompt
    const arabicSystemPrompt = `أنت مساعد ذكي متخصص في الاستشارات القانونية المصرية. ستقوم بتحليل المحادثات القانونية وتقديم تحليل قانوني شامل بصيغة JSON.

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
    "factors": ["عوامل التعقيد"]
  },
  "jurisdiction": "مصر",
  "urgency": "منخفض|متوسط|مرتفع"
}

ركز على القانون المصري عند الإمكان. قدم نصائح عملية وقابلة للتنفيذ. اعتبر السياق الثقافي والقانوني لمصر.

الفئة: ${category}`;

    const conversationText = `Please analyze this legal conversation and provide a comprehensive analysis:

Conversation Messages:
${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}

Please provide your analysis in the exact JSON format specified.`;

    console.log('Calling OpenAI API for legal analysis in both languages...');
    
    // Generate analysis in both languages simultaneously
    const [englishResponse, arabicResponse] = await Promise.all([
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: englishSystemPrompt },
            { role: 'user', content: conversationText }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      }),
      fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: arabicSystemPrompt },
            { role: 'user', content: conversationText }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      })
    ]);

    if (!englishResponse.ok || !arabicResponse.ok) {
      const englishError = englishResponse.ok ? '' : await englishResponse.text();
      const arabicError = arabicResponse.ok ? '' : await arabicResponse.text();
      console.error('OpenAI API Error:', englishResponse.status, englishError, arabicResponse.status, arabicError);
      throw new Error(`OpenAI API error: ${englishResponse.status} or ${arabicResponse.status}`);
    }

    const [englishData, arabicData] = await Promise.all([
      englishResponse.json(),
      arabicResponse.json()
    ]);

    let englishAnalysis, arabicAnalysis;

    // Parse English analysis
    try {
      const englishRawContent = englishData.choices[0].message.content;
      console.log('Raw English OpenAI response:', englishRawContent);
      
      const englishJsonMatch = englishRawContent.match(/\{[\s\S]*\}/);
      if (englishJsonMatch) {
        englishAnalysis = JSON.parse(englishJsonMatch[0]);
      } else {
        throw new Error('No JSON found in English response');
      }
    } catch (parseError) {
      console.error('Error parsing English OpenAI response:', parseError);
      englishAnalysis = {
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
          factors: ["Requires professional legal assessment"]
        },
        jurisdiction: "egypt",
        urgency: 'medium'
      };
    }

    // Parse Arabic analysis
    try {
      const arabicRawContent = arabicData.choices[0].message.content;
      console.log('Raw Arabic OpenAI response:', arabicRawContent);
      
      const arabicJsonMatch = arabicRawContent.match(/\{[\s\S]*\}/);
      if (arabicJsonMatch) {
        arabicAnalysis = JSON.parse(arabicJsonMatch[0]);
      } else {
        throw new Error('No JSON found in Arabic response');
      }
    } catch (parseError) {
      console.error('Error parsing Arabic OpenAI response:', parseError);
      arabicAnalysis = {
        caseSummary: "مسألة قانونية تتطلب استشارة مهنية",
        applicableLaws: [],
        recommendedSpecialization: {
          primaryArea: category || 'قانوني عام',
          secondaryAreas: [],
          reasoning: "بناءً على فئة القضية والتقييم الأولي"
        },
        legalStrategy: {
          immediateSteps: ["استشارة محامي مؤهل", "جمع المستندات ذات الصلة"],
          documentation: [],
          timeline: "يتم تحديدها عند الاستشارة القانونية",
          risks: [],
          opportunities: []
        },
        caseComplexity: {
          level: 'متوسط',
          factors: ["يتطلب تقييم قانوني مهني"]
        },
        jurisdiction: "مصر",
        urgency: 'متوسط'
      };
    }

    // Create bilingual analysis data
    const bilingualAnalysis = {
      en: englishAnalysis,
      ar: arabicAnalysis
    };

    console.log('Bilingual analysis generated successfully');

    // If caseId is provided, update the case_analysis table
    if (caseId) {
      console.log('Updating case analysis in database...');
      
      const { error: updateError } = await supabase
        .from('case_analysis')
        .update({
          analysis_data: bilingualAnalysis,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('case_id', caseId)
        .eq('status', 'pending');

      if (updateError) {
        console.error('Error updating case analysis:', updateError);
        // Continue anyway - analysis was generated successfully
      } else {
        console.log('Case analysis updated successfully with bilingual data');
      }
    }

    // Return the appropriate language version for backward compatibility
    const displayAnalysis = caseLanguage === 'ar' ? arabicAnalysis : englishAnalysis;

    return new Response(JSON.stringify({ 
      success: true, 
      legalAnalysis: displayAnalysis,
      analysisEn: englishAnalysis,
      analysisAr: arabicAnalysis
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