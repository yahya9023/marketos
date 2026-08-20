'use client';

import { signOut } from 'next-auth/react';
import { useI18n } from '@/components/i18n/provider';

export function LogoutButton() {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
    >
      {t('Logout')}
    </button>
  );
}