'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { currentStoreChangedEvent } from '@/lib/store-events';

type Store = { id: string; name: string };

export function StoreSelector({ stores, selectedStoreId, canSwitch }: {
  stores: Store[];
  selectedStoreId: string;
  canSwitch: boolean;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function changeStore(storeId: string) {
    if (!canSwitch || storeId === selectedStoreId) return;
    setIsSaving(true);
    try {
      const response = await fetch('/api/store/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      if (!response.ok) return;
      window.dispatchEvent(new Event(currentStoreChangedEvent));
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  if (!canSwitch || stores.length <= 1) {
    return <span className="text-sm font-semibold text-slate-300">Store: {stores.find((store) => store.id === selectedStoreId)?.name ?? 'Unavailable'}</span>;
  }

  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
      <span className="hidden sm:inline">Current store:</span>
      <select value={selectedStoreId} disabled={isSaving} onChange={(event) => void changeStore(event.target.value)} className="max-w-[10rem] rounded-lg border border-white/20 bg-white/10 px-2 py-2 text-sm font-bold text-white outline-none">
        {stores.map((store) => <option key={store.id} value={store.id} className="text-[#0c1b2a]">{store.name}</option>)}
      </select>
    </label>
  );
}