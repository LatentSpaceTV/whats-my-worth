import React, { createContext, useContext, useState, useEffect } from 'react';
import deTranslations from '../locales/de.json';
import enTranslations from '../locales/en.json';

type Language = 'de' | 'en';

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string>) => string;
}

const translations: Record<Language, any> = {
  de: deTranslations,
  en: enTranslations,
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'de';
  });

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, variables?: Record<string, string>): string => {
    const keys = key.split('.');
    let result = translations[language];

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // Fallback to German if key not found in current language
        let fallback = translations['de'];
        for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in fallback) {
                fallback = fallback[fk];
            } else {
                return key;
            }
        }
        result = fallback;
        break;
      }
    }

    if (typeof result !== 'string') return key;

    if (variables) {
      return Object.entries(variables).reduce((acc, [name, value]) => {
        return acc.replace(`{${name}}`, value);
      }, result);
    }

    return result;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
