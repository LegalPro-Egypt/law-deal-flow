import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CaseData {
  category?: string;
  urgency?: string;
  entities?: {
    parties?: string[];
    dates?: string[];
    location?: string;
  };
  personalDetailsNeeded?: boolean;
  summary?: string;
  readyForNextStep?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_id, mode = 'intake', language = 'en' } = await req.json();

    console.log('Legal Chatbot Request:', { message, conversation_id, mode, language });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize chat history
    let chatHistory: ChatMessage[] = [];
    
    // If we have a conversation_id, fetch existing messages
    if (conversation_id) {
      console.log('Fetching existing messages for conversation:', conversation_id);
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversation_id)
        .order('created_at', { ascending: true });
      
      if (existingMessages && existingMessages.length > 0) {
        chatHistory = existingMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
        console.log('Loaded chat history with', chatHistory.length, 'messages');
      }
    }

    // Build simple system prompt based on mode
    let systemPrompt = '';
    
    if (mode === 'qa') {
      systemPrompt = buildQASystemPrompt(language);
    } else {
      systemPrompt = buildIntakeSystemPrompt(language);
    }

    // Prepare messages for OpenAI
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message }
    ];

    console.log('Sending to OpenAI with system prompt length:', systemPrompt.length);

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 800,
        temperature: 0.9,
        functions: mode === 'intake' ? getIntakeFunctions() : undefined,
        function_call: mode === 'intake' ? 'auto' : undefined,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Handle OpenAI errors gracefully with fallback response
      const fallbackMessage = language === 'ar' 
        ? 'أعتذر، أواجه صعوبة تقنية مؤقتة. يرجى مشاركة: اسمك الكامل، أفضل بريد إلكتروني، رقم هاتف، ووصف مختصر لحالتك القانونية حتى أتمكن من مساعدتك.'
        : language === 'de'
        ? 'Entschuldigung, ich habe momentan technische Schwierigkeiten. Bitte teilen Sie mit: Ihren vollständigen Namen, beste E-Mail-Adresse, Telefonnummer und eine kurze Beschreibung Ihres Rechtsfalls, damit ich Ihnen helfen kann.'
        : 'I apologize, but I\'m experiencing temporary technical difficulties. Please share: your full name, best email address, phone number, and a brief description of your legal matter so I can assist you.';
      
      return new Response(
        JSON.stringify({ 
          response: fallbackMessage,
          extractedData: undefined,
          conversation_id: conversation_id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI Response:', openAIData);

    let aiResponse = openAIData.choices[0].message.content;
    if (!aiResponse) {
      aiResponse = language === 'ar'
        ? 'شكراً لك، سأقوم الآن بطرح بعض الأسئلة لتوضيح التفاصيل.'
        : language === 'de'
        ? 'Danke, ich stelle nun einige Fragen, um Details zu klären.'
        : 'Thank you, I will now ask a few questions to clarify the details.';
    }

    let extractedData: CaseData = {};

    // Handle function calls in intake mode
    if (openAIData.choices[0].message.function_call && mode === 'intake') {
      const functionCall = openAIData.choices[0].message.function_call;
      console.log('Function call:', functionCall);

      if (functionCall.name === 'extract_case_data') {
        try {
          extractedData = JSON.parse(functionCall.arguments);
          console.log('Extracted case data:', extractedData);

          // Create or update draft case when AI extracts data
          if (conversation_id && extractedData) {
            try {
              // Get conversation to check if it already has a case linked
              const { data: conversation } = await supabase
                .from('conversations')
                .select('case_id, user_id')
                .eq('id', conversation_id)
                .single();

              let caseId = conversation?.case_id;

              if (!caseId && conversation?.user_id) {
                // Create new draft case for authenticated user
                const { data: newCase, error: caseError } = await supabase
                  .from('cases')
                  .insert({
                    user_id: conversation.user_id,
                    title: extractedData.category || 'New Legal Case',
                    description: extractedData.summary || 'Case created from AI intake conversation',
                    category: extractedData.category || 'General',
                    urgency: extractedData.urgency || 'medium',
                    status: 'draft',
                    step: 1,
                    language: language || 'en',
                    jurisdiction: 'egypt',
                    extracted_entities: extractedData.entities || {}
                  })
                  .select()
                  .single();

                if (!caseError && newCase) {
                  caseId = newCase.id;
                  // Link conversation to the case
                  await supabase
                    .from('conversations')
                    .update({ case_id: caseId })
                    .eq('id', conversation_id);
                }
              } else if (caseId) {
                // Update existing draft case
                await supabase
                  .from('cases')
                  .update({
                    category: extractedData.category || 'General',
                    urgency: extractedData.urgency || 'medium',
                    extracted_entities: extractedData.entities || {},
                    description: extractedData.summary || 'Updated from AI conversation'
                  })
                  .eq('id', caseId);
              }
            } catch (error) {
              console.error('Error handling draft case:', error);
            }
          }
        } catch (e) {
          console.error('Error parsing function arguments:', e);
        }
      }
    }

    // Save conversation to database if conversation_id provided
    if (conversation_id) {
      console.log('Saving messages to conversation:', conversation_id);
      await supabase.from('messages').insert([
        {
          conversation_id: conversation_id,
          role: 'user',
          content: message,
          metadata: { timestamp: new Date().toISOString() }
        },
        {
          conversation_id: conversation_id,
          role: 'assistant',
          content: aiResponse,
          metadata: { 
            timestamp: new Date().toISOString(),
            mode,
            extractedData: mode === 'intake' ? extractedData : undefined
          }
        }
      ]);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        extractedData: mode === 'intake' ? extractedData : undefined,
        needsPersonalDetails: mode === 'intake' ? extractedData?.personalDetailsNeeded : false,
        conversation_id: conversation_id,
        conversationId: conversation_id // backward compatibility
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in legal-chatbot function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function buildQASystemPrompt(language: string): string {
  const prompts = {
    en: "You are a helpful AI assistant that provides general legal information about Egyptian law. You are friendly and informative but always emphasize that you're not providing legal advice and users should consult with a qualified lawyer for their specific situation.",
    ar: "أنت مساعد ذكي مفيد يقدم معلومات قانونية عامة حول القانون المصري. أنت ودود ومفيد لكن تؤكد دائماً أنك لا تقدم استشارة قانونية وأن المستخدمين يجب أن يستشيروا محامي مؤهل لحالتهم المحددة.",
    de: "Sie sind ein hilfreicher KI-Assistent, der allgemeine Rechtsinformationen zum ägyptischen Recht bereitstellt. Sie sind freundlich und informativ, betonen aber immer, dass Sie keine Rechtsberatung geben und Benutzer einen qualifizierten Anwalt für ihre spezielle Situation konsultieren sollten."
  };

  return prompts[language as keyof typeof prompts] || prompts.en;
}

function buildIntakeSystemPrompt(language: string): string {
  const prompts = {
    en: `You are a friendly AI assistant helping people describe their legal situation. Your goal is to:

1. Greet users warmly and ask about their legal matter
2. Ask natural, empathetic questions to understand their situation  
3. Help categorize their case (e.g., "Marriage/Divorce", "Visas/Residency", "Real Estate", "Business Law", "Criminal Law", etc.)
4. Extract key information like parties involved, important dates, location, and urgency level
5. Create a case summary for admin review
6. When you have comprehensive information (category, summary, urgency, key parties/dates), set readyForNextStep to true

Be conversational and supportive. Ask one or two questions at a time. When you have enough information about their legal matter, use the extract_case_data function with readyForNextStep set to true to signal that you're ready to proceed to personal details collection.

IMPORTANT DISCLAIMER: Always remind users that you're not providing legal advice, only gathering information for lawyers to review.`,

    ar: `أنت مساعد ذكي ودود تساعد الناس في وصف وضعهم القانوني. هدفك هو:

1. الترحيب بالمستخدمين بحرارة والسؤال عن مسألتهم القانونية
2. طرح أسئلة طبيعية ومتفهمة لفهم وضعهم
3. المساعدة في تصنيف قضيتهم (مثل "الزواج/الطلاق"، "التأشيرات/الإقامة"، "العقارات"، "قانون الأعمال"، "القانون الجنائي"، إلخ)
4. استخراج المعلومات الرئيسية مثل الأطراف المعنية، التواريخ المهمة، الموقع، ومستوى الإلحاح
5. إنشاء ملخص للقضية لمراجعة الإدارة
6. عندما تحصل على معلومات شاملة (الفئة، الملخص، الإلحاح، الأطراف/التواريخ الرئيسية)، اضبط readyForNextStep على true

كن محادثاً وداعماً. اطرح سؤالاً أو سؤالين في المرة الواحدة. عندما تحصل على معلومات كافية حول مسألتهم القانونية، استخدم وظيفة extract_case_data مع تعيين readyForNextStep إلى true للإشارة إلى أنك مستعد للانتقال إلى جمع التفاصيل الشخصية.

تنبيه مهم: ذكّر المستخدمين دائماً أنك لا تقدم استشارة قانونية، بل تجمع المعلومات فقط للمحامين لمراجعتها.`,

    de: `Sie sind ein freundlicher KI-Assistent, der Menschen dabei hilft, ihre rechtliche Situation zu beschreiben. Ihr Ziel ist es:

1. Benutzer herzlich zu begrüßen und nach ihrer rechtlichen Angelegenheit zu fragen
2. Natürliche, einfühlsame Fragen zu stellen, um ihre Situation zu verstehen
3. Bei der Kategorisierung ihres Falls zu helfen (z.B. "Ehe/Scheidung", "Visa/Aufenthalt", "Immobilien", "Wirtschaftsrecht", "Strafrecht", etc.)
4. Wichtige Informationen wie beteiligte Parteien, wichtige Daten, Ort und Dringlichkeitsstufe zu extrahieren
5. Eine Fallzusammenfassung für die Administratorprüfung zu erstellen
6. Wenn Sie umfassende Informationen haben (Kategorie, Zusammenfassung, Dringlichkeit, wichtige Parteien/Daten), setzen Sie readyForNextStep auf true

Seien Sie gesprächig und unterstützend. Stellen Sie ein oder zwei Fragen zur Zeit. Wenn Sie genügend Informationen über ihre rechtliche Angelegenheit haben, verwenden Sie die extract_case_data-Funktion mit readyForNextStep auf true, um zu signalisieren, dass Sie bereit sind, zur Sammlung persönlicher Daten überzugehen.

WICHTIGER HAFTUNGSAUSSCHLUSS: Erinnern Sie Benutzer immer daran, dass Sie keine Rechtsberatung geben, sondern nur Informationen für Anwälte zur Überprüfung sammeln.`
  };

  return prompts[language as keyof typeof prompts] || prompts.en;
}

function getIntakeFunctions(): any[] {
  return [{
    name: 'extract_case_data',
    description: 'Extract and structure case information from the conversation',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Legal case category (e.g., Marriage/Divorce, Visas/Residency, Real Estate, Business Law, Criminal Law)',
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'emergency'],
          description: 'Urgency level of the case',
        },
        entities: {
          type: 'object',
          properties: {
            parties: {
              type: 'array',
              items: { type: 'string' },
              description: 'Names of parties involved in the case',
            },
            dates: {
              type: 'array',
              items: { type: 'string' },
              description: 'Important dates mentioned',
            },
            location: {
              type: 'string',
              description: 'Location or jurisdiction relevant to the case',
            }
          }
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the legal matter for admin review',
        },
        personalDetailsNeeded: {
          type: 'boolean',
          description: 'Whether personal contact details still need to be collected',
        },
        readyForNextStep: {
          type: 'boolean',
          description: 'Set to true when sufficient case information has been gathered and ready to proceed to personal details collection',
        }
      },
      required: ['category', 'urgency', 'summary']
    }
  }];
}