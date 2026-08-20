'use client';

import { useEffect, useMemo, useState } from 'react';
import { currentStoreChangedEvent } from '@/lib/store-events';

type SaleItem = {
  quantity: number;
  unitPrice: number | string;
  total: number | string;
  product: { name: string };
};

type Sale = {
  id: string;
  subtotal: number | string;
  vat: number | string;
  total: number | string;
  paymentMethod: 'CASH' | 'CARD';
  status: string;
  createdAt: string;
  items: SaleItem[];
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
});

function formatMoney(value: number | string) {
  return currency.format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'CASH' | 'CARD'>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSales() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/sales');
        const result: Sale[] | { error?: string } = await response.json();
        if (!response.ok) {
          throw new Error('error' in result ? result.error : 'Unable to load sales');
        }
        setSales(result as Sale[]);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load sales',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void Promise.resolve().then(() => loadSales());
    window.addEventListener(currentStoreChangedEvent, loadSales);

    return () => {
      window.removeEventListener(currentStoreChangedEvent, loadSales);
    };
  }, []);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const matchesPayment =
        paymentFilter === 'ALL' || sale.paymentMethod === paymentFilter;
      const matchesSearch =
        !query ||
        sale.id.toLowerCase().includes(query) ||
        sale.items.some((item) => item.product.name.toLowerCase().includes(query));
      return matchesPayment && matchesSearch;
    });
  }, [paymentFilter, sales, search]);

  return (
    <main className="min-h-screen bg-[#0c1b2a] text-slate-950">
      <div className="mx-auto min-h-screen w-full max-w-[1800px] p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e1f25b] text-xl font-black text-[#0c1b2a]">
              M.
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">MarketOS</p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Sales history
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">
                Completed transactions
              </p>
              <h1 className="text-3xl font-black tracking-tight text-[#0c1b2a] sm:text-4xl">
                Sales
              </h1>
            </div>
            <span className="text-sm font-semibold text-[#5f746d]">
              {filteredSales.length} sales
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <label htmlFor="sales-search" className="sr-only">Search sales</label>
            <input
              id="sales-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by sale ID or product"
              className="h-12 min-w-0 flex-1 rounded-xl border-2 border-[#d6e0d9] bg-white px-4 text-sm font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]"
            />
            <label htmlFor="payment-filter" className="sr-only">Filter payment method</label>
            <select
              id="payment-filter"
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}
              className="h-12 rounded-xl border-2 border-[#d6e0d9] bg-white px-4 text-sm font-bold text-[#0c1b2a] outline-none focus:border-[#8caa4d]"
            >
              <option value="ALL">All payments</option>
              <option value="CASH">CASH</option>
              <option value="CARD">CARD</option>
            </select>
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </p>
          )}

          {isLoading ? (
            <p className="rounded-xl border border-dashed border-[#b8c9bd] px-4 py-12 text-center text-sm font-semibold text-[#5f746d]">
              Loading sales...
            </p>
          ) : filteredSales.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#b8c9bd] px-4 py-12 text-center text-sm font-semibold text-[#5f746d]">
              {sales.length === 0 ? 'No completed sales yet.' : 'No sales match your filters.'}
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredSales.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => setSelectedSale(sale)}
                  className="grid min-w-0 gap-3 rounded-xl border border-[#dce5df] bg-white p-4 text-left transition hover:border-[#9eb65b] hover:shadow-lg sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-slate-500">{sale.id}</p>
                    <p className="mt-1 text-sm font-bold text-[#0c1b2a]">{formatDate(sale.createdAt)}</p>
                  </div>
                  <span className="text-sm text-slate-600">
                    {sale.items.reduce((count, item) => count + item.quantity, 0)} items
                  </span>
                  <span className="text-sm font-black text-[#346154]">{formatMoney(sale.total)}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#e4eee7] px-2.5 py-1 text-xs font-bold text-[#346154]">
                      {sale.paymentMethod}
                    </span>
                    <span className="rounded-full bg-[#e4eee7] px-2.5 py-1 text-xs font-bold text-[#346154]">
                      {sale.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1b2a]/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">Sale details</p>
                <h2 className="text-2xl font-black text-[#0c1b2a]">{formatDate(selectedSale.createdAt)}</h2>
                <p className="mt-1 break-all font-mono text-xs text-slate-500">{selectedSale.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedSale(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white">Close</button>
            </div>

            <div className="space-y-2">
              {selectedSale.items.map((item, index) => (
                <div key={`${selectedSale.id}-${index}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] gap-3 rounded-lg border border-[#dce5df] bg-white p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[#0c1b2a]">{item.product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatMoney(item.unitPrice)} each</p>
                  </div>
                  <span className="self-center font-semibold text-slate-600">× {item.quantity}</span>
                  <span className="self-center font-black text-[#346154]">{formatMoney(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between text-slate-600"><span>Subtotal</span><strong>{formatMoney(selectedSale.subtotal)}</strong></div>
              <div className="flex justify-between text-slate-600"><span>VAT</span><strong>{formatMoney(selectedSale.vat)}</strong></div>
              <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-base font-black text-[#0c1b2a]"><span>Grand total</span><span>{formatMoney(selectedSale.total)}</span></div>
              <div className="flex justify-between pt-2 text-slate-600"><span>Payment</span><strong>{selectedSale.paymentMethod}</strong></div>
              <div className="flex justify-between text-slate-600"><span>Status</span><strong>{selectedSale.status}</strong></div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}