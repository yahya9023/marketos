'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { languageCookie, type Language, translateWithValues } from '@/lib/i18n';

type I18nContextValue = { language: Language; t: (key: string, values?: Record<string, string | number>) => string };
const I18nContext = createContext<I18nContextValue>({ language: 'es', t: (key, values) => translateWithValues('es', key, values) });

function readLanguage(): Language {
  const match = document.cookie.match(new RegExp(`(?:^|; )${languageCookie}=([^;]*)`));
  const value = match?.[1];
  return value === 'es' ? 'es' : 'es';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  useEffect(() => {
    void Promise.resolve().then(() => setLanguage(readLanguage()));
  }, []);

  useEffect(() => {
    const update = () => setLanguage(readLanguage());
    window.addEventListener('marketos-language-changed', update);
    return () => window.removeEventListener('marketos-language-changed', update);
  }, []);

  return <I18nContext.Provider value={{ language, t: (key, values) => translateWithValues(language, key, values) }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
