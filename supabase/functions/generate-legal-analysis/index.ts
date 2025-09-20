import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, category, language = 'en' } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract conversation content
    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const systemPrompt = `You are a legal expert specializing in Egyptian and international law. Analyze the following client conversation and provide comprehensive legal analysis.

Generate a detailed legal analysis in JSON format with the following structure:
{
  "caseSummary": "Brief summary of the legal situation",
  "applicableLaws": [
    {
      "law": "Name of the law/code",
      "articles": ["Article numbers or sections"],
      "relevance": "How this law applies to the case"
    }
  ],
  "recommendedSpecialization": {
    "primaryArea": "Main legal specialization needed (e.g., Criminal Law, Civil Law, Commercial Law, Family Law, Labor Law, Administrative Law)",
    "secondaryAreas": ["Additional relevant specializations"],
    "reasoning": "Why this specialization is recommended"
  },
  "legalStrategy": {
    "immediateSteps": ["List of immediate actions to take"],
    "documentation": ["Documents needed for the case"],
    "timeline": "Expected timeline for resolution",
    "risks": ["Potential risks and challenges"],
    "opportunities": ["Favorable aspects of the case"]
  },
  "caseComplexity": {
    "level": "low|medium|high",
    "factors": ["Factors contributing to complexity rating"],
    "estimatedCost": "Cost range estimate"
  },
  "jurisdiction": "egypt|international|mixed",
  "urgency": "low|medium|high|urgent"
}

Focus on Egyptian law where applicable, but also consider international law if relevant. Be specific about legal codes, articles, and procedures.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Category: ${category}\nLanguage: ${language}\n\nConversation:\n${conversationText}` }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No analysis generated from OpenAI');
    }

    // Parse the JSON response
    let legalAnalysis;
    try {
      legalAnalysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse legal analysis JSON:', parseError);
      // Fallback: create structured analysis from text
      legalAnalysis = {
        caseSummary: analysisText.slice(0, 500),
        applicableLaws: [],
        recommendedSpecialization: {
          primaryArea: category || "General Legal",
          secondaryAreas: [],
          reasoning: "Based on case category"
        },
        legalStrategy: {
          immediateSteps: ["Consult with a lawyer", "Gather relevant documents"],
          documentation: ["Case-related documents"],
          timeline: "To be determined",
          risks: [],
          opportunities: []
        },
        caseComplexity: {
          level: "medium",
          factors: ["Standard legal matter"],
          estimatedCost: "To be determined"
        },
        jurisdiction: "egypt",
        urgency: "medium"
      };
    }

    console.log('Generated legal analysis:', legalAnalysis);

    return new Response(JSON.stringify({ legalAnalysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-legal-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      legalAnalysis: {
        caseSummary: "Analysis unavailable due to technical error",
        applicableLaws: [],
        recommendedSpecialization: {
          primaryArea: "General Legal",
          secondaryAreas: [],
          reasoning: "Technical analysis unavailable"
        },
        legalStrategy: {
          immediateSteps: ["Consult with a qualified lawyer"],
          documentation: ["Gather all relevant case documents"],
          timeline: "Consult with legal professional",
          risks: ["Delays due to technical issues"],
          opportunities: []
        },
        caseComplexity: {
          level: "medium",
          factors: ["Unable to assess due to technical error"],
          estimatedCost: "Consult with lawyer for estimate"
        },
        jurisdiction: "egypt",
        urgency: "medium"
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});