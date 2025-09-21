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
    const { content, contentType, fromLanguage, toLanguage, cacheKey } = await req.json();

    if (!content || !toLanguage) {
      throw new Error('Content and target language are required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if translation already exists in cache
    if (cacheKey) {
      const { data: cachedTranslation } = await supabase
        .from('content_translations')
        .select('translated_content')
        .eq('cache_key', cacheKey)
        .eq('target_language', toLanguage)
        .single();

      if (cachedTranslation) {
        console.log('Returning cached translation for key:', cacheKey);
        return new Response(JSON.stringify({ 
          translatedContent: cachedTranslation.translated_content,
          cached: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create language-specific translation prompt
    const getTranslationPrompt = (contentType: string, targetLang: string) => {
      const basePrompt = `You are a professional legal translator. Translate the following ${contentType} content accurately while preserving:
- Legal terminology and concepts
- Professional tone and style
- Technical accuracy
- Cultural context appropriate for ${targetLang === 'ar' ? 'Arabic-speaking legal professionals' : 'the target language'}

${contentType === 'legal_analysis' ? 
  'IMPORTANT: If the content is a JSON object, maintain the exact JSON structure and only translate the string values.' : 
  'Maintain the original formatting and structure.'}`;

      switch (targetLang) {
        case 'ar':
          return `${basePrompt}

Translate to Arabic. Use formal legal Arabic terminology. Ensure cultural sensitivity for Middle Eastern legal context.`;
        case 'en':
          return `${basePrompt}

Translate to English. Use professional legal English terminology.`;
        case 'de':
          return `${basePrompt}

Translate to German. Use formal legal German terminology.`;
        default:
          return basePrompt;
      }
    };

    // Call OpenAI for translation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: getTranslationPrompt(contentType || 'general', toLanguage)
          },
          {
            role: 'user',
            content: `Please translate the following content:\n\n${content}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const translatedContent = aiResponse.choices[0].message.content;

    // Cache the translation if cache key is provided
    if (cacheKey) {
      await supabase
        .from('content_translations')
        .upsert({
          cache_key: cacheKey,
          original_content: content,
          translated_content: translatedContent,
          source_language: fromLanguage || 'auto',
          target_language: toLanguage,
          content_type: contentType || 'general',
          created_at: new Date().toISOString()
        });
      
      console.log('Translation cached with key:', cacheKey);
    }

    return new Response(JSON.stringify({ 
      translatedContent,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in translate-case-content function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});