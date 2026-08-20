'use client';

import { useRouter } from 'next/navigation';
import { languageCookie, languageOptions, type Language } from '@/lib/i18n';

export function LanguageSelector({ language = 'es' }: { language?: Language }) {
  const router = useRouter();
  function changeLanguage(value: Language) {
    document.cookie = `${languageCookie}=${value}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new Event('marketos-language-changed'));
    router.refresh();
  }

  if (languageOptions.length === 1) {
    return <span className="text-sm font-semibold text-slate-300">Español</span>;
  }

  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
      <span className="hidden lg:inline">Language:</span>
      <select value={language} onChange={(event) => changeLanguage(event.target.value as Language)} className="max-w-[8rem] rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-sm font-bold text-white outline-none">
        {languageOptions.map((option) => <option key={option.code} value={option.code} className="text-[#0c1b2a]">{option.label}</option>)}
      </select>
    </label>
  );
}
