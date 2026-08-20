'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n/provider';

type Category = { id: string; name: string; active: boolean; createdAt: string };

export default function CategoriesPage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    const response = await fetch('/api/categories?includeInactive=true');
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? 'Unable to load categories'); return; }
    setCategories(data);
  }

  useEffect(() => { void Promise.resolve().then(() => load()); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('');
    const response = await fetch(editing ? `/api/categories/${editing.id}` : '/api/categories', {
      method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), active: editing?.active ?? true }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? 'Unable to save category'); return; }
    setName(''); setEditing(null); setSuccess(editing ? 'Category updated.' : 'Category created.'); await load();
  }

  async function toggle(category: Category) {
    const response = await fetch(`/api/categories/${category.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: category.name, active: !category.active }) });
    if (!response.ok) { const data = await response.json(); setError(data.error ?? 'Unable to update category'); return; }
    await load();
  }

  return <main className="min-h-screen bg-[#0c1b2a] p-4 text-slate-950 sm:p-8"><section className="mx-auto max-w-3xl rounded-2xl bg-[#f5f7f2] p-5 sm:p-7"><h1 className="text-3xl font-black text-[#0c1b2a]">{t('Categories')}</h1>{error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}{success && <p className="mt-4 rounded-lg bg-[#e4eee7] p-3 text-sm font-bold text-[#346154]">{success}</p>}<form onSubmit={submit} className="mt-5 flex flex-wrap gap-2"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder={t('Category name')} className="h-11 min-w-0 flex-1 rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold" /><button className="rounded-lg bg-[#0c1b2a] px-4 py-2 text-sm font-black text-white">{editing ? t('Save') : t('Add category')}</button></form><div className="mt-6 space-y-2">{categories.map((category) => <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dce5df] bg-white p-3"><span className="font-bold">{category.name}</span><div className="flex gap-2"><span className="text-xs font-bold text-slate-500">{category.active ? t('Active') : t('Inactive')}</span><button type="button" onClick={() => { setEditing(category); setName(category.name); }} className="text-xs font-bold text-[#346154]">{t('Edit')}</button><button type="button" onClick={() => void toggle(category)} className="text-xs font-bold text-rose-600">{category.active ? t('Deactivate') : t('Activate')}</button></div></div>)}</div></section></main>;
}