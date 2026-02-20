import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import { Language, translations } from '../locales/translations';

interface LanguageContextType {
  language: Language;
  t: typeof translations.en;
  setLanguage: (lang: Language) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getStoredLanguage = (): Language => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return (window.localStorage.getItem('language') as Language) || 'en';
    }
  } catch (e) {
    console.error('Error getting stored language:', e);
  }
  return 'en';
};

const storeLanguage = (lang: Language) => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('language', lang);
    }
  } catch (e) {
    console.error('Error storing language:', e);
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isRTL, setIsRTL] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate language from storage on mount (client-side only)
  useEffect(() => {
    const storedLang = getStoredLanguage();
    setLanguageState(storedLang);
    setIsRTL(storedLang === 'ar');
    setIsHydrated(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    storeLanguage(lang);
    setIsRTL(lang === 'ar');
    
    // Set RTL for native (web handles it via CSS)
    if (Platform.OS !== 'web') {
      I18nManager.forceRTL(lang === 'ar');
    }
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};