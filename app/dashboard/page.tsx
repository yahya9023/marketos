'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LogoutButton } from '@/components/auth/logout-button';
import { currentStoreChangedEvent } from '@/lib/store-events';

type SaleItem = {
  quantity: number;
  product: { name: string };
};

type Sale = {
  id: string;
  total: number | string;
  paymentMethod: 'CASH' | 'CARD';
  status: string;
  createdAt: string;
  items: SaleItem[];
};

type Product = {
  id: string;
  name: string;
  active: boolean;
};

type InventoryRecord = {
  quantity: number;
  product: { id: string };
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
});

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatMoney(value: number | string) {
  return currency.format(Number(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const [salesResponse, productsResponse, inventoryResponse] =
          await Promise.all([
            fetch('/api/sales'),
            fetch('/api/products'),
            fetch('/api/inventory'),
          ]);

        if (!salesResponse.ok || !productsResponse.ok || !inventoryResponse.ok) {
          throw new Error('Unable to load dashboard data');
        }

        const [salesData, productsData, inventoryData] = await Promise.all([
          salesResponse.json() as Promise<Sale[]>,
          productsResponse.json() as Promise<Product[]>,
          inventoryResponse.json() as Promise<InventoryRecord[]>,
        ]);

        setSales(salesData);
        setProducts(productsData);
        setInventory(inventoryData);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load dashboard data',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void Promise.resolve().then(() => loadDashboard());
    window.addEventListener(currentStoreChangedEvent, loadDashboard);

    return () => {
      window.removeEventListener(currentStoreChangedEvent, loadDashboard);
    };
  }, []);

  const todaySales = useMemo(
    () => sales.filter((sale) => sale.status === 'COMPLETED' && isToday(sale.createdAt)),
    [sales],
  );
  const todayTotal = todaySales.reduce((total, sale) => total + Number(sale.total), 0);
  const cashTotal = todaySales
    .filter((sale) => sale.paymentMethod === 'CASH')
    .reduce((total, sale) => total + Number(sale.total), 0);
  const cardTotal = todaySales
    .filter((sale) => sale.paymentMethod === 'CARD')
    .reduce((total, sale) => total + Number(sale.total), 0);
  const inventoryByProductId = useMemo(
    () => new Map(inventory.map((record) => [record.product.id, record.quantity])),
    [inventory],
  );
  const outOfStockCount = products.filter(
    (product) => (inventoryByProductId.get(product.id) ?? 0) === 0,
  ).length;
  const zeroStockProducts = products.filter(
    (product) => (inventoryByProductId.get(product.id) ?? 0) === 0,
  );

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
                Store overview
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <LogoutButton />
            <Link href="/sales" className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
              Sales
            </Link>
            <Link href="/stock" className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
              Inventory / Stock
            </Link>
          </div>
        </header>

        <section className="rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="mb-6">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">Daily operations</p>
            <h1 className="text-3xl font-black tracking-tight text-[#0c1b2a] sm:text-4xl">Dashboard</h1>
          </div>

          {error && <p className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p>}

          {isLoading ? (
            <p className="rounded-xl border border-dashed border-[#b8c9bd] px-4 py-12 text-center text-sm font-semibold text-[#5f746d]">Loading dashboard...</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-xl bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8c84]">Today&apos;s sales</p>
                  <p className="mt-3 text-3xl font-black text-[#0c1b2a]">{formatMoney(todayTotal)}</p>
                  <p className="mt-1 text-sm font-semibold text-[#5f746d]">{todaySales.length} completed sales</p>
                </article>
                <article className="rounded-xl bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8c84]">CASH today</p>
                  <p className="mt-3 text-3xl font-black text-[#346154]">{formatMoney(cashTotal)}</p>
                </article>
                <article className="rounded-xl bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8c84]">CARD today</p>
                  <p className="mt-3 text-3xl font-black text-[#346154]">{formatMoney(cardTotal)}</p>
                </article>
                <article className="rounded-xl bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8c84]">Products / stock</p>
                  <p className="mt-3 text-3xl font-black text-[#0c1b2a]">{products.length}</p>
                  <p className="mt-1 text-sm font-semibold text-[#5f746d]">{outOfStockCount} at zero stock</p>
                  {zeroStockProducts.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-[#edf1ed] pt-3">
                      {zeroStockProducts.map((product) => (
                        <Link
                          key={product.id}
                          href={`/stock?productId=${encodeURIComponent(product.id)}`}
                          className="block truncate text-sm font-bold text-[#346154] hover:text-[#0c1b2a]"
                        >
                          {product.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              </div>

              <div className="mt-6 rounded-xl bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8c84]">Latest activity</p>
                    <h2 className="mt-1 text-xl font-black text-[#0c1b2a]">Recent sales</h2>
                  </div>
                  <Link href="/sales" className="text-sm font-bold text-[#346154] hover:text-[#0c1b2a]">View all</Link>
                </div>
                {sales.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#b8c9bd] px-4 py-8 text-center text-sm font-semibold text-[#5f746d]">No completed sales yet.</p>
                ) : (
                  <div className="divide-y divide-[#edf1ed]">
                    {sales.slice(0, 5).map((sale) => (
                      <Link key={sale.id} href="/sales" className="flex min-w-0 flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="w-16 shrink-0 text-sm font-semibold text-[#5f746d]">{formatTime(sale.createdAt)}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-500">{sale.id}</span>
                        <span className="rounded-full bg-[#e4eee7] px-2.5 py-1 text-xs font-bold text-[#346154]">{sale.paymentMethod}</span>
                        <span className="font-black text-[#0c1b2a]">{formatMoney(sale.total)}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
