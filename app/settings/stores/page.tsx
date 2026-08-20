'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Store = {
  id: string;
  name: string;
  address: string;
  currency: string;
  active: boolean;
  createdAt: string;
};

type StoreForm = {
  name: string;
  address: string;
  active: boolean;
};

const emptyForm: StoreForm = { name: '', address: '', active: true };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value));
}

export default function StoreManagementPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function loadStores() {
    setLoadError('');
    try {
      const response = await fetch('/api/store');
      const result: { error?: string; stores?: Store[] } = await response.json();
      if (!response.ok || !result.stores) throw new Error(result.error ?? 'Unable to load stores');
      setStores(result.stores);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load stores');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadStores());
  }, []);

  function updateForm(field: keyof StoreForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setEditingStore(null);
    setForm(emptyForm);
    setFormError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(store: Store) {
    setEditingStore(store);
    setForm({ name: store.name, address: store.address, active: store.active });
    setFormError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setFormError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    if (!form.name.trim() || !form.address.trim()) {
      setFormError('Store name and address are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        editingStore ? `/api/store/${editingStore.id}` : '/api/store',
        {
          method: editingStore ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            address: form.address.trim(),
            ...(editingStore ? { active: form.active } : { currency: 'EUR' }),
          }),
        },
      );
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to save store');

      setIsModalOpen(false);
      setSuccessMessage(editingStore ? 'Store updated successfully.' : 'Store created successfully.');
      await loadStores();
      router.refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save store');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0c1b2a] text-slate-950">
      <div className="mx-auto min-h-screen w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
        <section className="rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">Store operations</p>
              <h1 className="text-3xl font-black tracking-tight text-[#0c1b2a] sm:text-4xl">Stores</h1>
            </div>
            <button type="button" onClick={openCreateModal} className="rounded-lg bg-[#0c1b2a] px-4 py-3 text-sm font-black text-white transition hover:bg-[#1c354c]">+ Add Store</button>
          </div>

          {successMessage && <p className="mb-4 rounded-lg bg-[#e4eee7] px-4 py-3 text-sm font-bold text-[#346154]">{successMessage}</p>}
          {loadError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{loadError}</p>}

          {isLoading ? (
            <p className="rounded-xl border border-dashed border-[#b8c9bd] px-4 py-12 text-center text-sm font-semibold text-[#5f746d]">Loading stores...</p>
          ) : stores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#b8c9bd] px-4 py-12 text-center text-sm font-semibold text-[#5f746d]">No stores found.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store) => (
                <article key={store.id} className="min-w-0 rounded-xl border border-[#dce5df] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black text-[#0c1b2a]">{store.name}</h2>
                      <p className="mt-1 break-words text-sm text-slate-500">{store.address}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${store.active ? 'bg-[#e4eee7] text-[#346154]' : 'bg-slate-100 text-slate-500'}`}>
                      {store.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-2 border-t border-[#edf1ed] pt-3 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Currency</dt><dd className="font-black text-[#346154]">{store.currency}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Created</dt><dd className="text-right text-slate-600">{formatDate(store.createdAt)}</dd></div>
                  </dl>
                  <button type="button" onClick={() => openEditModal(store)} className="mt-4 w-full rounded-lg border border-[#b8c9bd] px-3 py-2 text-sm font-bold text-[#346154] transition hover:bg-[#e4eee7]">Edit store</button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1b2a]/70 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div><p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">Store operations</p><h2 className="text-2xl font-black text-[#0c1b2a]">{editingStore ? 'Edit store' : 'Add store'}</h2></div>
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white">Close</button>
            </div>
            {formError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{formError}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-bold text-[#4f6b65]">Store name
                <input required value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
              </label>
              <label className="block text-sm font-bold text-[#4f6b65]">Address
                <input required value={form.address} onChange={(event) => updateForm('address', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
              </label>
              <label className="block text-sm font-bold text-[#4f6b65]">Currency
                <input value="EUR" readOnly className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-slate-100 px-3 font-semibold text-slate-500" />
                <span className="mt-1 block text-xs font-medium text-slate-500">EUR is the existing project currency convention.</span>
              </label>
              {editingStore && <label className="flex items-center gap-3 text-sm font-bold text-[#4f6b65]"><input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} className="h-4 w-4 accent-[#8caa4d]" />Active store</label>}
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={closeModal} disabled={isSubmitting} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-white">Cancel</button><button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#0c1b2a] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1c354c] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Saving...' : editingStore ? 'Save changes' : 'Add store'}</button></div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}