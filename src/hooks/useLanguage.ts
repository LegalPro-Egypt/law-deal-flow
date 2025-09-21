import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    
    // Update document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Store preference
    localStorage.setItem('preferred-language', language);
  };

  const getCurrentLanguage = () => i18n.language;
  
  const isRTL = () => i18n.language === 'ar';

  useEffect(() => {
    // Set initial direction
    document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
    document.documentElement.lang = getCurrentLanguage();
  }, [i18n.language]);

  return {
    t,
    changeLanguage,
    getCurrentLanguage,
    isRTL,
    currentLanguage: i18n.language
  };
};