import { useState, useCallback } from 'react';
import { useLanguage } from './useLanguage';

interface TranslationCache {
  [key: string]: string;
}

export const useContentTranslation = () => {
  const { currentLanguage } = useLanguage();
  const [cache, setCache] = useState<TranslationCache>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const translateText = useCallback(async (text: string, sourceLanguage = 'en'): Promise<string> => {
    // If current language is the same as source, return original text
    if (currentLanguage === sourceLanguage || !text?.trim()) {
      return text;
    }

    // Check cache first
    const cacheKey = `${sourceLanguage}-${currentLanguage}-${text}`;
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }

    // If already translating this text, return original
    if (translating[cacheKey]) {
      return text;
    }

    try {
      setTranslating(prev => ({ ...prev, [cacheKey]: true }));

      // Simple text replacement for common legal terms (fallback approach)
      if (currentLanguage === 'ar') {
        let translatedText = text
          .replace(/\bContract\b/gi, 'عقد')
          .replace(/\bAgreement\b/gi, 'اتفاقية')
          .replace(/\bDispute\b/gi, 'نزاع')
          .replace(/\bFamily Law\b/gi, 'قانون الأسرة')
          .replace(/\bCriminal Law\b/gi, 'القانون الجنائي')
          .replace(/\bCivil Law\b/gi, 'القانون المدني')
          .replace(/\bCommercial Law\b/gi, 'القانون التجاري')
          .replace(/\bProperty Law\b/gi, 'قانون الملكية')
          .replace(/\bLabor Law\b/gi, 'قانون العمل')
          .replace(/\bIntellectual Property\b/gi, 'الملكية الفكرية')
          .replace(/\bTax Law\b/gi, 'القانون الضريبي')
          .replace(/\bBankruptcy\b/gi, 'إفلاس')
          .replace(/\bDivorce\b/gi, 'طلاق')
          .replace(/\bCustody\b/gi, 'حضانة')
          .replace(/\bInheritance\b/gi, 'ميراث')
          .replace(/\bReal Estate\b/gi, 'عقار')
          .replace(/\bPersonal Injury\b/gi, 'إصابة شخصية')
          .replace(/\bMedical Malpractice\b/gi, 'خطأ طبي')
          .replace(/\bInsurance\b/gi, 'تأمين')
          .replace(/\bEmployment\b/gi, 'توظيف')
          .replace(/\bComplaint\b/gi, 'شكوى')
          .replace(/\bLawsuit\b/gi, 'دعوى قضائية')
          .replace(/\bClaim\b/gi, 'مطالبة')
          .replace(/\bSettlement\b/gi, 'تسوية')
          .replace(/\bArbitration\b/gi, 'تحكيم')
          .replace(/\bMediation\b/gi, 'وساطة')
          .replace(/\bLitigation\b/gi, 'تقاضي')
          .replace(/\bAppeal\b/gi, 'استئناف')
          .replace(/\bTrial\b/gi, 'محاكمة')
          .replace(/\bHearing\b/gi, 'جلسة استماع')
          .replace(/\bEvidence\b/gi, 'دليل')
          .replace(/\bWitness\b/gi, 'شاهد')
          .replace(/\bTestimony\b/gi, 'شهادة')
          .replace(/\bVerdict\b/gi, 'حكم')
          .replace(/\bJudgment\b/gi, 'قرار قضائي')
          .replace(/\bPenalty\b/gi, 'عقوبة')
          .replace(/\bFine\b/gi, 'غرامة')
          .replace(/\bDamages\b/gi, 'تعويضات')
          .replace(/\bLiability\b/gi, 'مسؤولية')
          .replace(/\bNegligence\b/gi, 'إهمال')
          .replace(/\bBreach\b/gi, 'انتهاك')
          .replace(/\bViolation\b/gi, 'مخالفة')
          .replace(/\bClient\b/gi, 'موكل')
          .replace(/\bLawyer\b/gi, 'محامي')
          .replace(/\bAttorney\b/gi, 'محامي')
          .replace(/\bCounsel\b/gi, 'مستشار قانوني')
          .replace(/\bLegal\b/gi, 'قانوني')
          .replace(/\bCourt\b/gi, 'محكمة')
          .replace(/\bJudge\b/gi, 'قاضي')
          .replace(/\bCase\b/gi, 'قضية')
          .replace(/\bMatter\b/gi, 'مسألة')
          .replace(/\bIssue\b/gi, 'قضية')
          .replace(/\bProblem\b/gi, 'مشكلة')
          .replace(/\bSolution\b/gi, 'حل')
          .replace(/\bAdvice\b/gi, 'مشورة')
          .replace(/\bConsultation\b/gi, 'استشارة')
          .replace(/\bRecommendation\b/gi, 'توصية')
          .replace(/\bStrategy\b/gi, 'استراتيجية')
          .replace(/\bApproach\b/gi, 'منهج')
          .replace(/\bProcedure\b/gi, 'إجراء')
          .replace(/\bProcess\b/gi, 'عملية')
          .replace(/\bApplication\b/gi, 'طلب')
          .replace(/\bPetition\b/gi, 'التماس')
          .replace(/\bMotion\b/gi, 'طلب')
          .replace(/\bFiling\b/gi, 'تقديم')
          .replace(/\bDocument\b/gi, 'وثيقة')
          .replace(/\bPaper\b/gi, 'ورقة')
          .replace(/\bForm\b/gi, 'نموذج')
          .replace(/\bRecord\b/gi, 'سجل')
          .replace(/\bFile\b/gi, 'ملف')
          .replace(/\bFolder\b/gi, 'مجلد');

        // Cache the translation
        setCache(prev => ({ ...prev, [cacheKey]: translatedText }));
        return translatedText;
      }

      // For other languages, return original text
      return text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Fallback to original text
    } finally {
      setTranslating(prev => ({ ...prev, [cacheKey]: false }));
    }
  }, [currentLanguage, cache, translating]);

  const isTranslating = useCallback((text: string, sourceLanguage = 'en'): boolean => {
    const cacheKey = `${sourceLanguage}-${currentLanguage}-${text}`;
    return translating[cacheKey] || false;
  }, [currentLanguage, translating]);

  return {
    translateText,
    isTranslating
  };
};