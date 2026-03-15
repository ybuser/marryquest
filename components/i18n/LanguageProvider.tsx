import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { enUS, ko } from 'date-fns/locale';

export type AppLanguage = 'ko' | 'en';

const STORAGE_KEY = 'mq-language';
const COOKIE_KEY = 'mq_lang';
const DEFAULT_LANGUAGE: AppLanguage = 'ko';

interface LanguageContextValue {
  language: AppLanguage;
  isKorean: boolean;
  setLanguage: (language: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function readLanguageCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )mq_lang=(ko|en)/);
  return match?.[1] === 'en' ? 'en' : match?.[1] === 'ko' ? 'ko' : null;
}

function readStoredLanguage(): AppLanguage | null {
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'ko' || stored === 'en') {
    return stored;
  }

  return readLanguageCookie();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedLanguage = readStoredLanguage();
    if (storedLanguage) {
      setLanguageState(storedLanguage);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.documentElement.lang = language;

    if (!hydrated) return;

    document.cookie = `${COOKIE_KEY}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
    window.localStorage.setItem(STORAGE_KEY, language);
  }, [hydrated, language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isKorean: language === 'ko',
      setLanguage: setLanguageState
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

export function getDateLocale(language: AppLanguage) {
  return language === 'ko' ? ko : enUS;
}
