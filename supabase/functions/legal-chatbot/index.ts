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
        max_tokens: 300,
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

          // Validate jurisdiction before creating/updating case
          const isEgyptCase = validateJurisdiction(extractedData);
          
          if (!isEgyptCase) {
            console.log('Case rejected - not in Egypt jurisdiction:', extractedData.entities?.location);
            // Don't create case, but still save the conversation for tracking
            return new Response(
              JSON.stringify({ 
                response: getJurisdictionDeclineMessage(language),
                extractedData: undefined,
                conversation_id: conversation_id,
                jurisdictionRejected: true
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Create or update draft case when AI extracts data (only for Egypt cases)
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
                  
                  console.log('Created new Egypt case:', caseId);
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
                
                console.log('Updated existing Egypt case:', caseId);
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
      
      // First verify the conversation exists and is accessible
      const { data: conversationCheck } = await supabase
        .from('conversations')
        .select('id, user_id, case_id')
        .eq('id', conversation_id)
        .single();
      
      if (!conversationCheck) {
        throw new Error('Conversation not found or not accessible');
      }
      
      // Attempt to save messages with retry logic for race conditions
      let retryCount = 0;
      const maxRetries = 3;
      let saveSuccess = false;
      
      while (!saveSuccess && retryCount < maxRetries) {
        try {
          // Always save to messages table for conversation continuity
          const { error: insertError } = await supabase.from('messages').insert([
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
          
          if (insertError) {
            console.error(`Message insert attempt ${retryCount + 1} failed:`, insertError);
            if (retryCount < maxRetries - 1) {
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
              retryCount++;
              continue;
            } else {
              throw insertError;
            }
          }

          // Also save to case_messages table if conversation has a linked case
          if (conversationCheck.case_id) {
            console.log('Also saving messages to case_messages for case:', conversationCheck.case_id);
            try {
              await supabase.from('case_messages').insert([
                {
                  case_id: conversationCheck.case_id,
                  role: 'user',
                  content: message,  
                  message_type: 'text',
                  metadata: { timestamp: new Date().toISOString() }
                },
                {
                  case_id: conversationCheck.case_id,
                  role: 'assistant',
                  content: aiResponse,
                  message_type: 'text',
                  metadata: { 
                    timestamp: new Date().toISOString(),
                    mode,
                    extractedData: mode === 'intake' ? extractedData : undefined
                  }
                }
              ]);
              console.log('Messages also saved to case_messages successfully');
            } catch (caseMessageError) {
              console.error('Failed to save to case_messages, but continuing:', caseMessageError);
              // Don't fail the whole operation if case_messages save fails
            }
          }

          saveSuccess = true;
          console.log('Messages saved successfully');
        } catch (error) {
          console.error(`Message insert attempt ${retryCount + 1} error:`, error);
          if (retryCount < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
            retryCount++;
          } else {
            throw error;
          }
        }
      }
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
    en: "You are a helpful AI assistant providing brief legal information about Egyptian law. Keep responses to 2-3 sentences maximum. Be concise and direct. Always mention this is not legal advice - consult a qualified Egyptian lawyer for specific cases.",
    ar: "أنت مساعد ذكي يقدم معلومات قانونية مختصرة عن القانون المصري. احتفظ بالإجابات في 2-3 جمل كحد أقصى. كن مختصراً ومباشراً. اذكر دائماً أن هذه ليست استشارة قانونية - استشر محامياً مصرياً مؤهلاً للحالات المحددة.",
    de: "Sie sind ein hilfreicher KI-Assistent, der kurze Rechtsinformationen zum ägyptischen Recht bereitstellt. Halten Sie Antworten auf maximal 2-3 Sätze. Seien Sie prägnant und direkt. Erwähnen Sie immer, dass dies keine Rechtsberatung ist - konsultieren Sie einen qualifizierten ägyptischen Anwalt für spezielle Fälle."
  };

  return prompts[language as keyof typeof prompts] || prompts.en;
}

function buildIntakeSystemPrompt(language: string): string {
  const prompts = {
    en: `You are a professional legal intake specialist for a law firm that ONLY operates in Egypt. Your goal is to:

1. IMMEDIATELY after greeting, ask where the user is located/which country their legal matter involves
2. If the location is NOT Egypt, politely inform them that you only handle cases within Egypt and cannot assist with matters in other jurisdictions. Suggest they seek local legal counsel in their country.
3. For Egypt-based cases, gather case information professionally:
   - Ask direct, factual questions to understand their situation (never ask about emotions or feelings)
   - Automatically determine and categorize their case based on their description (e.g., "Marriage/Divorce", "Visas/Residency", "Real Estate", "Business Law", "Criminal Law", etc.)
   - Extract key information like parties involved, important dates, location within Egypt, and urgency level
   - Create a case summary for admin review
   - When you have comprehensive information (category, summary, urgency, key parties/dates), set readyForNextStep to true

JURISDICTION VALIDATION: 
- You MUST ask about location in your first or second message
- Only proceed with case intake if the matter involves Egypt
- For non-Egypt cases, politely decline and end the conversation professionally

CRITICAL: Never ask users to confirm categories - determine them automatically from context. For example:
- Squatting/property disputes = "Real Estate"
- Divorce/marriage issues = "Marriage/Divorce" 
- Immigration/visa problems = "Visas/Residency"
- Employment disputes = "Employment Law"
- Criminal charges = "Criminal Law"

Focus on gathering facts efficiently for Egypt-based cases only. Ask one or two relevant questions at a time about what happened, when it occurred, who was involved, and what outcome they're seeking. Maintain professional courtesy without emotional language.

IMPORTANT DISCLAIMER: Always remind users that you're not providing legal advice, only gathering information for lawyers to review, and that your services are limited to Egyptian jurisdiction only.`,

    ar: `أنت متخصص استقبال قانوني محترف لمكتب محاماة يعمل فقط في مصر. هدفك هو:

1. فوراً بعد الترحيب، اسأل أين يقع المستخدم/أي دولة تتعلق بها مسألتهم القانونية
2. إذا كان الموقع ليس مصر، أخبرهم بأدب أنك تتعامل فقط مع القضايا داخل مصر ولا يمكنك المساعدة في مسائل في ولايات قضائية أخرى. اقترح عليهم طلب المشورة القانونية المحلية في بلدهم.
3. للقضايا المصرية، اجمع معلومات القضية بمهنية:
   - طرح أسئلة مباشرة وواقعية لفهم وضعهم (لا تسأل أبداً عن المشاعر أو العواطف)
   - تحديد وتصنيف قضيتهم تلقائياً بناءً على وصفهم (مثل "الزواج/الطلاق"، "التأشيرات/الإقامة"، "العقارات"، "قانون الأعمال"، "القانون الجنائي"، إلخ)
   - استخراج المعلومات الرئيسية مثل الأطراف المعنية، التواريخ المهمة، الموقع داخل مصر، ومستوى الإلحاح
   - إنشاء ملخص للقضية لمراجعة الإدارة
   - عندما تحصل على معلومات شاملة (الفئة، الملخص، الإلحاح، الأطراف/التواريخ الرئيسية)، اضبط readyForNextStep على true

التحقق من الولاية القضائية:
- يجب أن تسأل عن الموقع في رسالتك الأولى أو الثانية
- تابع فقط مع استقبال القضية إذا كانت المسألة تتعلق بمصر
- للقضايا غير المصرية، ارفض بأدب وأنهي المحادثة بمهنية

ركز على جمع الحقائق بكفاءة للقضايا المصرية فقط. اطرح سؤالاً أو سؤالين ذا صلة في المرة الواحدة حول ما حدث، ومتى حدث، ومن كان متورطاً، وما النتيجة التي يسعون إليها. حافظ على اللياقة المهنية دون استخدام لغة عاطفية.

تنبيه مهم: ذكّر المستخدمين دائماً أنك لا تقدم استشارة قانونية، بل تجمع المعلومات فقط للمحامين لمراجعتها، وأن خدماتك مقتصرة على الولاية القضائية المصرية فقط.`,

    de: `Sie sind ein professioneller juristischer Aufnahmespezialist, der Fallinformationen sammelt. Ihr Ziel ist es:

1. Benutzer professionell zu begrüßen und nach ihrer rechtlichen Angelegenheit zu fragen
2. Direkte, sachliche Fragen zu stellen, um ihre Situation zu verstehen (fragen Sie niemals nach Gefühlen oder Emotionen)
3. Ihren Fall automatisch zu bestimmen und zu kategorisieren basierend auf ihrer Beschreibung (z.B. "Ehe/Scheidung", "Visa/Aufenthalt", "Immobilien", "Wirtschaftsrecht", "Strafrecht", etc.)
4. Wichtige Informationen wie beteiligte Parteien, wichtige Daten, Ort und Dringlichkeitsstufe zu extrahieren
5. Eine Fallzusammenfassung für die Administratorprüfung zu erstellen
6. Wenn Sie umfassende Informationen haben (Kategorie, Zusammenfassung, Dringlichkeit, wichtige Parteien/Daten), setzen Sie readyForNextStep auf true

Konzentrieren Sie sich darauf, Fakten effizient zu sammeln. Stellen Sie ein oder zwei relevante Fragen zur Zeit darüber, was passiert ist, wann es passiert ist, wer beteiligt war und welches Ergebnis sie anstreben. Wahren Sie professionelle Höflichkeit ohne emotionale Sprache.

WICHTIGER HAFTUNGSAUSSCHLUSS: Erinnern Sie Benutzer immer daran, dass Sie keine Rechtsberatung geben, sondern nur Informationen für Anwälte zur Überprüfung sammeln.`
  };

  return prompts[language as keyof typeof prompts] || prompts.en;
}

// Validate if the case is within Egypt jurisdiction
function validateJurisdiction(extractedData: CaseData): boolean {
  const location = extractedData.entities?.location?.toLowerCase();
  
  if (!location) {
    return false; // No location provided
  }
  
  // Check for Egypt-related keywords
  const egyptKeywords = [
    'egypt', 'egyptian', 'cairo', 'alexandria', 'giza', 'luxor', 'aswan', 
    'شرم الشيخ', 'الغردقة', 'مصر', 'القاهرة', 'الاسكندرية', 'الجيزة', 
    'الأقصر', 'أسوان', 'بورسعيد', 'السويس', 'طنطا', 'المنيا',
    'ägypten', 'kairo', 'alexandria'
  ];
  
  // Check for non-Egypt countries/keywords that should be rejected
  const nonEgyptKeywords = [
    'kuwait', 'saudi', 'uae', 'emirates', 'qatar', 'bahrain', 'oman',
    'jordan', 'lebanon', 'syria', 'iraq', 'morocco', 'tunisia', 'algeria',
    'libya', 'sudan', 'usa', 'america', 'uk', 'britain', 'france', 'germany',
    'الكويت', 'السعودية', 'الإمارات', 'قطر', 'البحرين', 'عمان',
    'الأردن', 'لبنان', 'سوريا', 'العراق', 'المغرب', 'تونس', 'الجزائر',
    'ليبيا', 'السودان'
  ];
  
  // If location mentions non-Egypt country, reject
  const hasNonEgyptKeyword = nonEgyptKeywords.some(keyword => 
    location.includes(keyword)
  );
  
  if (hasNonEgyptKeyword) {
    return false;
  }
  
  // If location mentions Egypt, accept
  const hasEgyptKeyword = egyptKeywords.some(keyword => 
    location.includes(keyword)
  );
  
  return hasEgyptKeyword;
}

// Get jurisdiction decline message in appropriate language
function getJurisdictionDeclineMessage(language: string): string {
  const messages = {
    en: `I appreciate you reaching out to us. However, our law firm only provides services within Egypt's jurisdiction. Since your legal matter involves a different country, I'm unable to assist you with this case.

I recommend seeking legal counsel in your local jurisdiction, as they will be better equipped to handle matters under the laws of your country. You can typically find qualified lawyers through your local bar association or legal directories.

Thank you for your understanding, and I wish you the best in resolving your legal matter.`,

    ar: `أشكرك لتواصلك معنا. لكن مكتب المحاماة الخاص بنا يقدم الخدمات فقط داخل الولاية القضائية المصرية. نظراً لأن مسألتك القانونية تتعلق بدولة أخرى، لا يمكنني مساعدتك في هذه القضية.

أوصي بطلب المشورة القانونية في ولايتك القضائية المحلية، حيث سيكونون أكثر قدرة على التعامل مع المسائل تحت قوانين بلدك. يمكنك عادة العثور على محامين مؤهلين من خلال نقابة المحامين المحلية أو الأدلة القانونية.

شكراً لتفهمك، وأتمنى لك التوفيق في حل مسألتك القانونية.`,

    de: `Ich schätze es, dass Sie sich an uns gewandt haben. Unsere Anwaltskanzlei bietet jedoch nur Dienstleistungen innerhalb der ägyptischen Jurisdiktion an. Da Ihre rechtliche Angelegenheit ein anderes Land betrifft, kann ich Ihnen bei diesem Fall nicht behilflich sein.

Ich empfehle, Rechtsberatung in Ihrer örtlichen Jurisdiktion zu suchen, da diese besser ausgerüstet sind, um Angelegenheiten unter den Gesetzen Ihres Landes zu behandeln. Sie können normalerweise qualifizierte Anwälte über Ihre örtliche Anwaltskammer oder rechtliche Verzeichnisse finden.

Vielen Dank für Ihr Verständnis, und ich wünsche Ihnen alles Gute bei der Lösung Ihrer rechtlichen Angelegenheit.`
  };
  
  return messages[language as keyof typeof messages] || messages.en;
}

function getIntakeFunctions(): any[] {
  return [{
    name: 'extract_case_data',
    description: 'Automatically extract and structure case information from the conversation. Call this when you have determined the case category and gathered sufficient information. CRITICAL: Only extract data for cases within Egypt - reject cases from other countries.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Legal case category automatically determined from context (e.g., Marriage/Divorce, Visas/Residency, Real Estate, Business Law, Criminal Law). Never ask user to confirm - determine from their description.',
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
              description: 'Location or jurisdiction relevant to the case - MUST be within Egypt for case to proceed',
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