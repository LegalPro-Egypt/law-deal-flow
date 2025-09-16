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

interface LegalKnowledge {
  category: string;
  title: string;
  content: string;
  law_reference?: string;
}

interface CaseData {
  category?: string;
  urgency?: string;
  entities?: any;
  nextQuestions?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      conversationId, 
      mode = 'intake', 
      language = 'en', 
      chatHistory = [] 
    } = await req.json();

    console.log('Legal Chatbot Request:', { message, conversationId, mode, language });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch relevant legal knowledge based on message content
    const { data: legalKnowledge } = await supabase
      .from('legal_knowledge')
      .select('*')
      .eq('language', language === 'ar' ? 'ar' : 'en')
      .or(`content.ilike.%${message}%,title.ilike.%${message}%,keywords.cs.{${extractKeywords(message)}}`)
      .limit(5);

    // Fetch case categories for intake mode
    const { data: categories } = await supabase
      .from('case_categories')
      .select('*')
      .eq('is_active', true);

    // Build system prompt based on mode
    let systemPrompt = '';
    
    if (mode === 'qa') {
      systemPrompt = buildQASystemPrompt(language, legalKnowledge || []);
    } else {
      systemPrompt = buildIntakeSystemPrompt(language, categories || [], legalKnowledge || []);
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
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_completion_tokens: 800,
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
      
      // Return a graceful fallback instead of throwing error
      aiResponse = fallbackMessage;
      
      // Save conversation to database if conversationId provided
      if (conversationId) {
        await supabase.from('messages').insert([
          {
            conversation_id: conversationId,
            role: 'user',
            content: message,
            metadata: { timestamp: new Date().toISOString() }
          },
          {
            conversation_id: conversationId,
            role: 'assistant',
            content: aiResponse,
            metadata: { 
              timestamp: new Date().toISOString(),
              mode,
              fallback: true,
              openai_error: errorText
            }
          }
        ]);
      }

      return new Response(
        JSON.stringify({ 
          response: aiResponse,
          extractedData: undefined,
          needsPersonalDetails: false,
          nextQuestions: undefined,
          conversationId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI Response:', openAIData);

    let aiResponse = openAIData.choices[0].message.content;
    let extractedData: CaseData = {};
    let nextQuestions: string[] = [];

    // Handle function calls in intake mode
    if (openAIData.choices[0].message.function_call && mode === 'intake') {
      const functionCall = openAIData.choices[0].message.function_call;
      console.log('Function call:', functionCall);

      if (functionCall.name === 'extract_case_data') {
        try {
          extractedData = JSON.parse(functionCall.arguments);
          console.log('Extracted case data:', extractedData);

          // Create or update draft case when AI extracts data
          if (conversationId && extractedData) {
            try {
              // Get conversation to check if it already has a case linked
              const { data: conversation } = await supabase
                .from('conversations')
                .select('case_id, user_id')
                .eq('id', conversationId)
                .single();

              let caseId = conversation?.case_id;

              if (!caseId) {
                // Create new draft case
                const { data: newCase, error: caseError } = await supabase
                  .from('cases')
                  .insert({
                    user_id: conversation?.user_id,
                    title: extractedData.category || 'Draft Case',
                    description: 'Case created from AI intake conversation',
                    category: extractedData.category || 'General',
                    subcategory: extractedData.subcategory,
                    urgency: extractedData.urgency || 'medium',  
                    status: 'draft',
                    step: 1,
                    language: language || 'en',
                    jurisdiction: 'egypt',
                    extracted_entities: extractedData.entities || {},
                    draft_data: {
                      extractedData,
                      currentStep: 1,
                      lastUpdated: new Date().toISOString()
                    }
                  })
                  .select()
                  .single();

                if (caseError) {
                  console.error('Error creating draft case:', caseError);
                } else {
                  caseId = newCase.id;
                  
                  // Link conversation to the case
                  await supabase
                    .from('conversations')
                    .update({ case_id: caseId })
                    .eq('id', conversationId);
                }
              } else {
                // Update existing draft case
                await supabase
                  .from('cases')
                  .update({
                    category: extractedData.category || 'General',
                    subcategory: extractedData.subcategory,
                    urgency: extractedData.urgency || 'medium',
                    extracted_entities: extractedData.entities || {},
                    draft_data: {
                      extractedData,
                      currentStep: 1,
                      lastUpdated: new Date().toISOString()
                    }
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

    // Save conversation to database if conversationId provided
    if (conversationId) {
      await supabase.from('messages').insert([
        {
          conversation_id: conversationId,
          role: 'user',
          content: message,
          metadata: { timestamp: new Date().toISOString() }
        },
        {
          conversation_id: conversationId,
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
        needsPersonalDetails: mode === 'intake' ? extractedData?.needsPersonalDetails : false,
        nextQuestions: mode === 'intake' ? nextQuestions : undefined,
        conversationId
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

function extractKeywords(text: string): string {
  const keywords = text.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 5)
    .join(',');
  return keywords;
}

function buildQASystemPrompt(language: string, legalKnowledge: LegalKnowledge[]): string {
  const knowledgeContext = legalKnowledge.map(kb => 
    `${kb.title}: ${kb.content} (Reference: ${kb.law_reference || 'N/A'})`
  ).join('\n\n');

  return `You are Lexa, an AI legal assistant specializing in Egyptian law. You provide accurate, helpful legal information based on Egyptian jurisdiction.

IMPORTANT GUIDELINES:
- You are NOT providing legal advice, only legal information
- Always recommend consulting with a qualified Egyptian lawyer for specific legal advice
- Reference specific Egyptian laws and articles when applicable
- Provide clear, concise explanations
- If unsure about any legal point, state that clearly

EGYPTIAN LEGAL CONTEXT:
${knowledgeContext}

LANGUAGE: Respond in ${language === 'ar' ? 'Arabic' : language === 'de' ? 'German' : 'English'}

Always include appropriate disclaimers about not providing legal advice and the need to consult qualified lawyers for specific situations.`;
}

function buildIntakeSystemPrompt(language: string, categories: any[], legalKnowledge: LegalKnowledge[]): string {
  const categoryContext = categories.map(cat => 
    `${cat.name}: ${cat.description} (Required docs: ${cat.required_documents?.join(', ') || 'None'})`
  ).join('\n');

  const knowledgeContext = legalKnowledge.map(kb => 
    `${kb.title}: ${kb.content}`
  ).join('\n');

  return `You are Lexa, an AI legal intake assistant for Egyptian law cases. Your job is to gather case information through natural conversation.

CASE CATEGORIES AVAILABLE:
${categoryContext}

EGYPTIAN LEGAL CONTEXT:
${knowledgeContext}

YOUR ROLE:
1. Understand the legal issue through conversation
2. Categorize the case appropriately
3. Extract key entities (parties, dates, amounts, jurisdiction)
4. Determine urgency level
5. Suggest required documents
6. Identify when personal contact information is needed

CONVERSATION FLOW:
- Start by understanding their legal situation
- Once you have a good understanding of their case (after 3-4 exchanges), you should set needsPersonalDetails to true in the extract_case_data function
- DO NOT ask for personal details directly in chat - the system will show a form
- Continue with case-specific questions after the form is completed

CONVERSATION STYLE:
- Be friendly, professional, and empathetic
- Ask one question at a time
- Use simple language
- Show understanding of their situation
- Provide helpful context about Egyptian law when relevant

IMPORTANT:
- You are gathering information, NOT providing legal advice
- Always include disclaimers about needing to consult qualified lawyers
- Be sensitive to client concerns and emotions

LANGUAGE: Conduct conversation in ${language === 'ar' ? 'Arabic' : language === 'de' ? 'German' : 'English'}

Use the extract_case_data function when you have sufficient information to categorize the case. Set needsPersonalDetails to true when you've understood their case and need to collect their contact information - DO NOT ask for personal details in chat.`;
}

function getIntakeFunctions() {
  return [
    {
      name: 'extract_case_data',
      description: 'Extract structured case data when sufficient information is gathered',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Primary case category (Family Law, Immigration Law, Real Estate Law, etc.)',
          },
          subcategory: {
            type: 'string',
            description: 'Specific subcategory if applicable',
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Case urgency based on timeline and legal requirements',
          },
          entities: {
            type: 'object',
            properties: {
              parties: {
                type: 'array',
                items: { type: 'string' },
                description: 'Names of parties involved',
              },
              dates: {
                type: 'array',
                items: { type: 'string' },
                description: 'Important dates mentioned',
              },
              amounts: {
                type: 'array',
                items: { type: 'string' },
                description: 'Financial amounts mentioned',
              },
              locations: {
                type: 'array',
                items: { type: 'string' },
                description: 'Relevant locations or jurisdictions',
              },
            },
          },
          requiredDocuments: {
            type: 'array',
            items: { type: 'string' },
            description: 'Documents needed for this type of case',
          },
          nextQuestions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Follow-up questions to gather more specific information',
          },
          needsPersonalDetails: {
            type: 'boolean',
            description: 'Set to true when you need to collect personal contact information (name, email, phone, address)',
          },
        },
        required: ['category', 'urgency'],
      },
    },
  ];
}