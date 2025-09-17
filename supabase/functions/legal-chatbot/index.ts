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
    const { message, conversation_id, conversationId, mode = 'intake', language = 'en', caseId, lawyerId } = await req.json();
    
    // Handle both conversation_id and conversationId for compatibility
    const effectiveConversationId = conversation_id || conversationId;

    console.log('Legal Chatbot Request:', { message, conversation_id: effectiveConversationId, mode, language });

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
    if (effectiveConversationId) {
      console.log('Fetching existing messages for conversation:', effectiveConversationId);
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', effectiveConversationId)
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
        effectiveConversationId = newConversation.id;
        console.log('Created new conversation:', effectiveConversationId);
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
      // Pass the chat history length to track conversation progress
      const messageCount = chatHistory.length;
      systemPrompt = buildIntakeSystemPrompt(language, categories || [], legalKnowledge || [], messageCount);
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
        max_tokens: mode === 'intake' ? 400 : 800, // Shorter responses for intake to encourage efficiency
        temperature: mode === 'intake' ? 0.3 : 0.7, // Lower temperature for intake to be more focused
        top_p: mode === 'intake' ? 0.8 : 0.9, // More focused responses for intake
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
                    .eq('id', effectiveConversationId);
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
                      .eq('id', effectiveConversationId);
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
    if (effectiveConversationId) {
      console.log('Saving messages to conversation:', effectiveConversationId);
      await supabase.from('messages').insert([
        {
          conversation_id: effectiveConversationId,
          role: 'user',
          content: message,
          metadata: { timestamp: new Date().toISOString() }
        },
        {
          conversation_id: effectiveConversationId,
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
        conversation_id: effectiveConversationId,
        conversationId: effectiveConversationId // backward compatibility
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

  return `Hi there! I'm Lexa, your AI legal assistant specializing in Egyptian law. I'm here to help you with detailed legal research and analysis for your practice.

Since you're a qualified legal professional, I can dive deep into the technical aspects of Egyptian law with you. I'll help you explore legal strategies, reference specific statutes and regulations, and discuss case precedents that might be relevant to your work.

Here's what I have access to regarding Egyptian legal context:
${knowledgeContext}

I'm here to assist you with:
• Detailed legal research and case analysis - let's dig into the specifics together
• Egyptian legal procedures and requirements - I'll walk you through what you need to know
• Potential legal strategies and approaches - we can explore different angles for your cases
• Case law and precedents - I'll reference relevant decisions when they're available
• Document drafting considerations - I can help you think through the key elements
• Complex legal concepts - let me break these down in practical terms

I'll respond in ${language === 'ar' ? 'Arabic' : language === 'de' ? 'German' : 'English'} and always aim to give you thorough, professional insights.

Just remember, while I can provide detailed analysis based on my knowledge, it's always worth double-checking current laws and recent updates - the legal landscape can shift, and you know how important it is to stay current.

What legal matter can I help you explore today?`;
}


function buildQASystemPrompt(language: string, legalKnowledge: LegalKnowledge[]): string {
  const knowledgeContext = legalKnowledge.map(kb => 
    `${kb.title}: ${kb.content} (Reference: ${kb.law_reference || 'N/A'})`
  ).join('\n\n');

  return `Hello! I'm Lexa, your friendly AI legal assistant who specializes in Egyptian law. I'm here to help you understand legal concepts and navigate legal questions - think of me as your knowledgeable friend who happens to know a lot about Egyptian law.

Just to be clear upfront: I provide legal information to help you understand your situation better, but I'm not giving you legal advice. For that, you'll want to connect with one of the qualified Egyptian lawyers here on LegalPro - they can give you personalized guidance that fits your specific circumstances perfectly.

Here's what I know about Egyptian legal matters:
${knowledgeContext}

I'll explain things in ${language === 'ar' ? 'Arabic' : language === 'de' ? 'German' : 'English'} and try to break down complex legal concepts in a way that makes sense. If I'm not certain about something, I'll let you know rather than guessing.

The great thing about our platform is that I can help you understand the basics, and then when you're ready, you can easily get matched with specialized lawyers who know exactly how to handle your specific legal area. They'll be able to give you the personalized advice and representation you need.

What legal question can I help you understand today?`;
}

function buildIntakeSystemPrompt(language: string, categories: any[], legalKnowledge: LegalKnowledge[], messageCount: number = 0): string {
  const categoryContext = categories.map(cat => 
    `${cat.name}: ${cat.description} (Required docs: ${cat.required_documents?.join(', ') || 'None'})`
  ).join('\n');

  const knowledgeContext = legalKnowledge.map(kb => 
    `${kb.title}: ${kb.content}`
  ).join('\n');

  const languageInstructions = language === 'ar' ? 
    'Respond in Arabic' : 
    language === 'de' ? 
    'Respond in German' : 
    'Respond in English';

  return `Hi, I'm Lexa! I'm here to help you with your legal matter and make this process as smooth as possible. I understand that dealing with legal issues can feel overwhelming, so I'll guide you through this step by step. ${languageInstructions}.

I need to gather some information about your situation so we can connect you with the right legal help. Think of this as a friendly conversation where I'm getting to know your case better. Here's what I'd like to understand:

**What I need to learn about your situation:**
1. **What happened?** - Tell me about the legal issue you're facing
2. **Who's involved?** - Who are the main people or parties in this situation?
3. **When did this happen?** - Help me understand the timeline of events
4. **Where did this occur?** - Location can be important for legal matters
5. **What have you done so far?** - Any steps you've already taken?
6. **What are you hoping to achieve?** - What would be the ideal outcome for you?
7. **How urgent is this?** - Do you have any pressing deadlines?
8. **Anything else?** - Any other details that might be relevant?

Here's how I like to work: I'll listen carefully to what you tell me first, and then I'll only ask about the things you haven't mentioned yet. No need to repeat yourself! If you give me a lot of information upfront, that's perfect - it means fewer questions for both of us.

I usually need answers to at least the main questions (what happened, who's involved, when, what you want to achieve, and how urgent it is) before I can help match you with the right legal professional. Sometimes people give me all this information right away, which is fantastic!

**The types of legal cases I help with:**
${categoryContext}

**What I know about Egyptian law:**
${knowledgeContext}

I'm here to listen and understand your situation, not to interrogate you. Take your time, and share what feels comfortable. If something is stressful to talk about, just let me know and we can approach it differently.

What's going on with your legal situation?`;
}

function getIntakeFunctions() {
  return [
    {
      name: 'extract_case_data',
      description: 'Extract structured case data using the 8-step framework when sufficient information is gathered',
      parameters: {
        type: 'object',
        properties: {
          // 1. Issue Description
          issue_description: {
            type: 'string',
            description: 'Brief description of the legal problem (Step 1)',
          },
          // 2. Parties Involved  
          parties_involved: {
            type: 'array',
            items: { type: 'string' },
            description: 'Who are the parties - plaintiff, defendant, witnesses, etc. (Step 2)',
          },
          // 3. Timeline
          timeline: {
            type: 'object',
            properties: {
              incident_date: { type: 'string', description: 'When did it happen' },
              is_ongoing: { type: 'boolean', description: 'Is the issue ongoing' },
              key_dates: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Important dates in chronological order'
              }
            },
            description: 'Timeline information (Step 3)',
          },
          // 4. Location
          location: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'City where incident occurred' },
              specific_location: { type: 'string', description: 'Specific location if relevant' },
              jurisdiction: { type: 'string', description: 'Legal jurisdiction' }
            },
            description: 'Location information (Step 4)',
          },
          // 5. Actions Taken
          actions_taken: {
            type: 'array',
            items: { type: 'string' },
            description: 'What has the client already done - police reports, complaints, legal actions (Step 5)',
          },
          // 6. Desired Outcome
          desired_outcome: {
            type: 'array',
            items: { type: 'string' },
            description: 'What does the client want to achieve - compensation, resolution, etc. (Step 6)',
          },
          // 7. Urgency Level
          urgency_level: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'How time-sensitive is this matter (Step 7)',
          },
          // 8. Additional Notes
          additional_notes: {
            type: 'string',
            description: 'Any other relevant information not covered in previous steps (Step 8)',
          },
          
          // Legacy/Required fields for system compatibility
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
            description: 'Case urgency (maps to urgency_level)',
          },
          entities: {
            type: 'object',
            properties: {
              parties: {
                type: 'array',
                items: { type: 'string' },
                description: 'Names of parties involved (maps to parties_involved)',
              },
              dates: {
                type: 'array',
                items: { type: 'string' },
                description: 'Important dates mentioned (maps to timeline)',
              },
              locations: {
                type: 'array',
                items: { type: 'string' },
                description: 'Relevant locations (maps to location)',
              },
              legal_documents: {
                type: 'array',
                items: { type: 'string' },
                description: 'Contracts, agreements, court orders mentioned',
              },
              legal_deadlines: {
                type: 'array',
                items: { type: 'string' },
                description: 'Statute of limitations, court dates, filing deadlines',
              },
              amounts: {
                type: 'array',
                items: { type: 'string' },
                description: 'Financial amounts mentioned',
              },
            },
          },
          legal_issues: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific legal problems identified in the case',
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
            description: 'Set to true when ready to collect personal contact information',
          },
        },
        required: ['issue_description', 'category', 'urgency_level', 'urgency', 'needsPersonalDetails'],
      },
    },
  ];
}