import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en.json';
import ar from '../locales/ar.json';
import de from '../locales/de.json';

const resources = {
  en: {
    translation: en
  },
  ar: {
    translation: ar
  },
  de: {
    translation: de
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    detection: {
      order: ['localStorage', 'browserSettings', 'navigator'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;