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
    const { message, conversation_id, mode = 'intake', language = 'en', caseId, lawyerId } = await req.json();

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
    } else if (mode === 'qa_lawyer') {
      // For lawyer Q&A mode, create a new conversation
      console.log('Creating new conversation for lawyer Q&A');
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          mode: 'qa_lawyer',
          language: language || 'en',
          user_id: lawyerId || null
        })
        .select()
        .single();
      
      if (!convError && newConversation) {
        conversation_id = newConversation.id;
        console.log('Created new conversation:', conversation_id);
      }
    }

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
    
    if (mode === 'qa' || mode === 'qa_lawyer') {
      systemPrompt = mode === 'qa_lawyer' 
        ? buildLawyerQASystemPrompt(language, legalKnowledge || [])
        : buildQASystemPrompt(language, legalKnowledge || []);
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
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
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
      
      // Save conversation to database if conversation_id provided
      if (conversation_id) {
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
          conversation_id: conversation_id,
          conversationId: conversation_id // backward compatibility
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI Response:', openAIData);

    let aiResponse = openAIData.choices[0].message.content;
    if (!aiResponse) {
      aiResponse = language === 'ar'
        ? 'تم استلام معلوماتك. سأقوم الآن بطرح بعض الأسئلة لتوضيح التفاصيل.'
        : language === 'de'
        ? 'Ihre Informationen wurden empfangen. Ich stelle nun einige Fragen, um Details zu klären.'
        : 'Thanks, I will now ask a few questions to clarify the details.';
    }
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
          if (conversation_id && extractedData) {
            try {
              // Get conversation to check if it already has a case linked
              const { data: conversation } = await supabase
                .from('conversations')
                .select('case_id, user_id, metadata')
                .eq('id', conversation_id)
                .single();

              // Generate client response summary
              const clientSummary = await generateClientResponseSummary(
                chatHistory, 
                aiResponse, 
                extractedData, 
                language, 
                conversation_id, 
                supabase
              );

              let caseId = conversation?.case_id;

              if (!caseId) {
                if (!conversation?.user_id) {
                  // Anonymous conversation: store draft in conversation metadata instead of creating a case
                  const newMeta = {
                    ...(conversation?.metadata || {}),
                    extractedData,
                    clientSummary,
                    draft: {
                      currentStep: 1,
                      lastUpdated: new Date().toISOString()
                    }
                  };
                  await supabase
                    .from('conversations')
                    .update({ metadata: newMeta })
                    .eq('id', conversation_id);
                } else {
                  // Authenticated user: create new draft case
                  const legalAnalysis = {
                    legal_issues: extractedData.legal_issues || [],
                    legal_classification: extractedData.legal_classification || {},
                    violation_types: extractedData.violation_types || [],
                    legal_remedies_sought: extractedData.legal_remedies_sought || [],
                    legal_complexity: extractedData.legal_complexity || 'moderate',
                    analysis_timestamp: new Date().toISOString()
                  };

                  const { data: newCase, error: caseError } = await supabase
                    .from('cases')
                    .insert({
                      user_id: conversation.user_id,
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
                      legal_analysis: legalAnalysis,
                      case_complexity_score: extractedData.legal_complexity === 'simple' ? 1 : 
                                           extractedData.legal_complexity === 'moderate' ? 2 : 3,
                      applicable_laws: extractedData.legal_classification?.applicable_statutes || [],
                      client_responses_summary: clientSummary,
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
                      .eq('id', conversation_id);
                  }
                }
              } else {
                // Update existing draft case
                const legalAnalysis = {
                  legal_issues: extractedData.legal_issues || [],
                  legal_classification: extractedData.legal_classification || {},
                  violation_types: extractedData.violation_types || [],
                  legal_remedies_sought: extractedData.legal_remedies_sought || [],
                  legal_complexity: extractedData.legal_complexity || 'moderate',
                  analysis_timestamp: new Date().toISOString()
                };

                await supabase
                  .from('cases')
                  .update({
                    category: extractedData.category || 'General',
                    subcategory: extractedData.subcategory,
                    urgency: extractedData.urgency || 'medium',
                    extracted_entities: extractedData.entities || {},
                    legal_analysis: legalAnalysis,
                    case_complexity_score: extractedData.legal_complexity === 'simple' ? 1 : 
                                         extractedData.legal_complexity === 'moderate' ? 2 : 3,
                    applicable_laws: extractedData.legal_classification?.applicable_statutes || [],
                    client_responses_summary: clientSummary,
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
        needsPersonalDetails: mode === 'intake' ? extractedData?.needsPersonalDetails : false,
        nextQuestions: mode === 'intake' ? nextQuestions : undefined,
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

/**
 * Generate client response summary from conversation
 */
async function generateClientResponseSummary(
  chatHistory: ChatMessage[],
  latestResponse: string,
  extractedData: any,
  language: string,
  conversationId: string,
  supabase: any
): Promise<any> {
  try {
    // Get user messages from the conversation
    const { data: messages } = await supabase
      .from('messages')
      .select('content, role')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: true });

    const userMessages = messages?.map(msg => msg.content).join('\n') || 
                        chatHistory.filter(msg => msg.role === 'user').map(msg => msg.content).join('\n');

    const summaryPrompt = `Based on the following client responses during legal intake, create a concise summary for admin review.

Client responses:
${userMessages}

Latest AI response: ${latestResponse}

Create a JSON summary with the following structure:
{
  "summary": "A readable summary of the client's legal issue and key points",
  "key_points": ["Important point 1", "Important point 2"],
  "urgency_indicators": ["Why this case is urgent/not urgent"],
  "client_goals": "What the client wants to achieve",
  "mentioned_documents": ["Documents the client mentioned or will provide"],
  "timeline_mentioned": "Any dates or deadlines mentioned by the client",
  "parties_involved": ["Other parties mentioned in the case"],
  "language": "${language}"
}

Keep the summary concise but comprehensive for admin review.`;

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a legal assistant that creates case summaries from client intake conversations.' },
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const summaryText = data.choices[0].message.content;
      
      try {
        return JSON.parse(summaryText);
      } catch (parseError) {
        console.error('Failed to parse summary JSON:', parseError);
        return {
          summary: summaryText,
          key_points: [],
          urgency_indicators: [],
          client_goals: "",
          mentioned_documents: [],
          timeline_mentioned: "",
          parties_involved: [],
          language: language
        };
      }
    } else {
      console.error('Failed to generate client summary:', response.statusText);
      return {
        summary: "Summary generation failed",
        key_points: [],
        urgency_indicators: [],
        client_goals: "",
        mentioned_documents: [],
        timeline_mentioned: "",
        parties_involved: [],
        language: language
      };
    }
  } catch (error) {
    console.error('Error generating client response summary:', error);
    return {
      summary: "Error generating summary",
      key_points: [],
      urgency_indicators: [],
      client_goals: "",
      mentioned_documents: [],
      timeline_mentioned: "",
      parties_involved: [],
      language: language
    };
  }
}

function extractKeywords(text: string): string {
  const keywords = text.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 5)
    .join(',');
  return keywords;
}

function buildLawyerQASystemPrompt(language: string, legalKnowledge: LegalKnowledge[]): string {
  const knowledgeContext = legalKnowledge.map(kb => 
    `${kb.title}: ${kb.content} (Reference: ${kb.law_reference || 'N/A'})`
  ).join('\n\n');

  return `You are Lexa, a specialized AI legal assistant for practicing lawyers in Egypt. You provide accurate, detailed legal information and analysis to help lawyers in their professional practice.

IMPORTANT GUIDELINES:
- You are assisting qualified legal professionals who understand legal nuance
- Provide detailed, technical legal analysis and case law references
- Reference specific Egyptian laws, articles, and regulations when applicable
- Discuss legal strategies, precedents, and practice considerations
- You can provide more advanced legal insights since you're helping licensed professionals
- Always clarify when information may need verification from recent updates

EGYPTIAN LEGAL CONTEXT:
${knowledgeContext}

PROFESSIONAL ASSISTANCE:
- Help with legal research and case analysis
- Provide insights on Egyptian legal procedures and requirements
- Discuss potential legal strategies and approaches
- Reference relevant case law and precedents when available
- Assist with document drafting considerations
- Explain complex legal concepts and their applications

LANGUAGE: Respond in ${language === 'ar' ? 'Arabic' : language === 'de' ? 'German' : 'English'}

Remember: You're assisting licensed legal professionals, so you can provide more detailed analysis while still recommending verification of current laws and regulations.`;
}


function buildQASystemPrompt(language: string, legalKnowledge: LegalKnowledge[]): string {
  const knowledgeContext = legalKnowledge.map(kb => 
    `${kb.title}: ${kb.content} (Reference: ${kb.law_reference || 'N/A'})`
  ).join('\n\n');

  return `You are Lexa, an AI legal assistant specializing in Egyptian law. You provide accurate, helpful legal information based on Egyptian jurisdiction.

IMPORTANT GUIDELINES:
- You are NOT providing legal advice, only legal information
- Always recommend connecting with qualified Egyptian lawyers here on LegalPro to find the best-fitting legal professional for their specific needs
- Reference specific Egyptian laws and articles when applicable
- Provide clear, concise explanations
- If unsure about any legal point, state that clearly

EGYPTIAN LEGAL CONTEXT:
${knowledgeContext}

LANGUAGE: Respond in ${language === 'ar' ? 'Arabic' : language === 'de' ? 'German' : 'English'}

Always include appropriate disclaimers about not providing legal advice and recommend signing up on our platform to get matched with qualified lawyers who specialize in their specific legal area.`;
}

function buildIntakeSystemPrompt(language: string, categories: any[], legalKnowledge: LegalKnowledge[]): string {
  const categoryContext = categories.map(cat => 
    `${cat.name}: ${cat.description} (Required docs: ${cat.required_documents?.join(', ') || 'None'})`
  ).join('\n');

  const knowledgeContext = legalKnowledge.map(kb => 
    `${kb.title}: ${kb.content}`
  ).join('\n');

  return `You are Lexa, an AI legal intake assistant for Egyptian law cases. Your job is to gather case information through natural conversation and perform comprehensive legal analysis.

CASE CATEGORIES AVAILABLE:
${categoryContext}

EGYPTIAN LEGAL CONTEXT:
${knowledgeContext}

YOUR ROLE:
1. Understand the legal issue through conversation
2. Categorize the case appropriately
3. Extract comprehensive legal analysis including:
   - Specific legal issues and problems
   - Primary and secondary areas of law involved
   - Applicable statutes, regulations, and legal codes
   - Key legal concepts and principles
   - Types of violations or legal wrongs
   - Legal remedies and relief sought
   - Assessment of case complexity
4. Extract detailed entities (parties, dates, amounts, locations, documents, deadlines, relationships)
5. Determine urgency level based on legal requirements and deadlines
6. Suggest required documents
7. Identify when personal contact information is needed

LEGAL ANALYSIS EXTRACTION:
When using the extract_case_data function, provide thorough legal analysis:

- legal_issues: Identify specific legal problems (e.g., "Breach of employment contract", "Unlawful termination", "Discrimination based on gender")
- legal_classification: 
  * primary_legal_area: Main area (e.g., "Employment Law", "Contract Law", "Family Law")
  * secondary_legal_areas: Related areas (e.g., ["Civil Rights Law", "Labor Law"])
  * applicable_statutes: Relevant laws (e.g., ["Egyptian Labor Law No. 12 of 2003", "Civil Code Article 163"])
  * legal_concepts: Key principles (e.g., ["Good faith in contracts", "Wrongful termination", "Equal treatment"])
- violation_types: Specific violations (e.g., ["Breach of contract", "Violation of due process", "Discriminatory practices"])
- legal_remedies_sought: What client wants (e.g., ["Reinstatement", "Compensation for damages", "Injunctive relief"])
- legal_complexity: Assess complexity level based on multiple parties, complex legal issues, international elements, etc.

ENHANCED ENTITY EXTRACTION:
Extract comprehensive entities including:
- legal_documents: Contracts, court orders, agreements mentioned
- legal_deadlines: Statute of limitations, filing deadlines, court dates
- legal_relationships: Employment, partnership, landlord-tenant relationships
- assets_property: Property, assets, intellectual property involved
- institutions: Courts, government agencies, organizations involved

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
- Always include disclaimers about needing legal representation and recommend completing your intake here to get matched with experienced lawyers who specialize in their case type
- Be sensitive to client concerns and emotions
- Focus on comprehensive legal analysis and classification

LANGUAGE: Conduct conversation in ${language === 'ar' ? 'Arabic' : language === 'de' ? 'German' : 'English'}

Use the extract_case_data function when you have sufficient information to categorize the case and perform legal analysis. Set needsPersonalDetails to true when you've understood their case and need to collect their contact information - DO NOT ask for personal details in chat.`;
}

function getIntakeFunctions() {
  return [
    {
      name: 'extract_case_data',
      description: 'Extract structured case data and legal analysis when sufficient information is gathered',
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
              legal_documents: {
                type: 'array',
                items: { type: 'string' },
                description: 'Contracts, agreements, court orders, legal documents mentioned',
              },
              legal_deadlines: {
                type: 'array',
                items: { type: 'string' },
                description: 'Statute of limitations, court dates, filing deadlines',
              },
              legal_relationships: {
                type: 'array',
                items: { type: 'string' },
                description: 'Legal relationships like employer-employee, landlord-tenant, etc.',
              },
              assets_property: {
                type: 'array',
                items: { type: 'string' },
                description: 'Property, assets, intellectual property involved',
              },
              institutions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Courts, government agencies, organizations involved',
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
          legal_issues: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific legal problems and issues identified in the case',
          },
          legal_classification: {
            type: 'object',
            properties: {
              primary_legal_area: {
                type: 'string',
                description: 'Main area of law (Contract Law, Tort Law, Criminal Law, etc.)',
              },
              secondary_legal_areas: {
                type: 'array',
                items: { type: 'string' },
                description: 'Related or secondary legal areas involved',
              },
              applicable_statutes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Relevant laws, statutes, regulations, and legal codes',
              },
              legal_concepts: {
                type: 'array',
                items: { type: 'string' },
                description: 'Key legal principles, doctrines, and concepts involved',
              },
            },
          },
          violation_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific legal violations, breaches, or wrongs identified',
          },
          legal_remedies_sought: {
            type: 'array',
            items: { type: 'string' },
            description: 'Legal relief, remedies, or outcomes the client is seeking',
          },
          legal_complexity: {
            type: 'string',
            enum: ['simple', 'moderate', 'complex'],
            description: 'Assessment of the legal complexity of the case',
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