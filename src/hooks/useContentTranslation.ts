import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from './useLanguage';

interface TranslationOptions {
  content: string;
  contentType?: 'ai_summary' | 'legal_analysis' | 'general';
  fromLanguage?: string;
  cacheKey?: string;
}

export const useContentTranslation = () => {
  const { getCurrentLanguage } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});

  const translateContent = async ({ 
    content, 
    contentType = 'general', 
    fromLanguage = 'auto',
    cacheKey 
  }: TranslationOptions): Promise<string> => {
    const targetLanguage = getCurrentLanguage();
    
    // Return original content if it's already in the target language
    if (fromLanguage === targetLanguage) {
      return content;
    }

    // Check local cache first
    const localCacheKey = `${cacheKey || content.slice(0, 50)}_${targetLanguage}`;
    if (translationCache[localCacheKey]) {
      return translationCache[localCacheKey];
    }

    setIsTranslating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-case-content', {
        body: {
          content,
          contentType,
          fromLanguage,
          toLanguage: targetLanguage,
          cacheKey: cacheKey || `${contentType}_${Date.now()}`
        }
      });

      if (error) {
        console.error('Translation error:', error);
        return content; // Return original content on error
      }

      const translatedContent = data.translatedContent;
      
      // Update local cache
      setTranslationCache(prev => ({
        ...prev,
        [localCacheKey]: translatedContent
      }));

      return translatedContent;
    } catch (error) {
      console.error('Translation request failed:', error);
      return content; // Return original content on error
    } finally {
      setIsTranslating(false);
    }
  };

  const translateIfNeeded = async (
    content: string | null | undefined,
    originalLanguage: string,
    contentType?: 'ai_summary' | 'legal_analysis' | 'general',
    cacheKey?: string
  ): Promise<string> => {
    if (!content) return '';
    
    const currentLanguage = getCurrentLanguage();
    
    // If content is already in the current UI language, return as-is
    if (originalLanguage === currentLanguage) {
      return content;
    }

    // Otherwise, translate
    return translateContent({
      content,
      contentType,
      fromLanguage: originalLanguage,
      cacheKey
    });
  };

  return {
    translateContent,
    translateIfNeeded,
    isTranslating,
    currentLanguage: getCurrentLanguage()
  };
};
