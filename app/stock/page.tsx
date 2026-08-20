'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { currentStoreChangedEvent } from '@/lib/store-events';
import { useI18n } from '@/components/i18n/provider';

type Product = {
  id: string;
  name: string;
  barcode: string;
  category: { name: string };
  unit: string;
  imageUrl: string | null;
};

type InventoryRecord = {
  quantity: number;
  product: { id: string };
};

type RestockProduct = Product & {
  quantity: number;
};

export default function StockPage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const highlightedProductId = searchParams.get('productId');
  const [products, setProducts] = useState<RestockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<RestockProduct | null>(null);
  const [quantity, setQuantity] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadInventory() {
    setIsLoading(true);
    setLoadError('');

    try {
      const [productsResponse, inventoryResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/inventory'),
      ]);

      if (!productsResponse.ok) {
        throw new Error('Unable to load products');
      }
      if (!inventoryResponse.ok) {
        throw new Error('Unable to load inventory');
      }

      const productData: Product[] = await productsResponse.json();
      const inventoryData: InventoryRecord[] = await inventoryResponse.json();
      const quantityByProductId = new Map(
        inventoryData.map((record) => [record.product.id, record.quantity]),
      );

      setProducts(
        productData.map((product) => ({
          ...product,
          quantity: quantityByProductId.get(product.id) ?? 0,
        })),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load inventory',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadInventory());
    window.addEventListener(currentStoreChangedEvent, loadInventory);

    return () => {
      window.removeEventListener(currentStoreChangedEvent, loadInventory);
    };
  }, []);

  const sortedProducts = useMemo(
    () => [...products].sort((first, second) => first.name.localeCompare(second.name)),
    [products],
  );

  function openRestock(product: RestockProduct) {
    setSelectedProduct(product);
    setQuantity('');
    setFormError('');
    setSuccessMessage('');
  }

  function closeRestock() {
    if (isSubmitting) return;
    setSelectedProduct(null);
    setFormError('');
  }

  async function handleRestock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(quantity);

    if (!Number.isInteger(amount) || amount <= 0) {
      setFormError('Quantity must be a positive integer.');
      return;
    }

    if (!selectedProduct) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await fetch('/api/inventory/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity: amount,
        }),
      });
      const result: { error?: string; quantity?: number } =
        await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to add stock');
      }

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === selectedProduct.id
            ? { ...product, quantity: result.quantity ?? product.quantity + amount }
            : product,
        ),
      );
      setSuccessMessage(`${selectedProduct.name} stock updated successfully.`);
      setSelectedProduct(null);
      setQuantity('');
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Unable to add stock',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
                Inventory control
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">
                {t('Store operations')}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-[#0c1b2a] sm:text-4xl">
                {t('Inventory')}
              </h1>
            </div>
            <span className="text-sm font-semibold text-[#5f746d]">
              {products.length} products
            </span>
          </div>

          {successMessage && (
            <p className="mb-4 rounded-lg bg-[#e4eee7] px-4 py-3 text-sm font-bold text-[#346154]">
              {successMessage}
            </p>
          )}
          {loadError && (
            <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {loadError}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <p className="col-span-full py-10 text-center text-sm font-semibold text-[#5f746d]">
                {t('Loading inventory...')}
              </p>
            ) : sortedProducts.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm font-semibold text-[#5f746d]">
                {t('No products found.')}
              </p>
            ) : (
              sortedProducts.map((product) => (
                <article
                  key={product.id}
                  className={`min-w-0 rounded-xl border bg-white p-4 transition hover:border-[#9eb65b] hover:shadow-lg ${product.id === highlightedProductId ? 'border-[#8caa4d] ring-2 ring-[#dce9a8]' : 'border-[#dce5df]'}`}
                >
                  <div className="flex items-start gap-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#e4eee7] text-xl font-black text-[#346154]">
                        {product.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black text-[#0c1b2a]">
                        {product.name}
                      </h2>
                      <p className="mt-1 break-all font-mono text-xs text-slate-500">
                        {product.barcode}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {product.category.name} · {product.unit}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#edf1ed] pt-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7a8c84]">
                        Current stock
                      </p>
                      <p className="mt-1 text-2xl font-black text-[#0c1b2a]">
                        {product.quantity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openRestock(product)}
                      className="rounded-lg bg-[#0c1b2a] px-3 py-2 text-xs font-black text-white transition hover:bg-[#1c354c] active:scale-[0.98]"
                    >
                      {t('Add stock')}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1b2a]/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl sm:p-7">
            <div className="mb-5">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">
                Inventory update
              </p>
              <h2 className="text-2xl font-black text-[#0c1b2a]">Add stock</h2>
              <p className="mt-2 text-sm font-semibold text-[#5f746d]">
                {selectedProduct.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Current stock: <span className="font-black text-[#0c1b2a]">{selectedProduct.quantity}</span>
              </p>
            </div>

            {formError && (
              <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {formError}
              </p>
            )}

            <form onSubmit={handleRestock} className="space-y-4">
              <label className="block text-sm font-bold text-[#4f6b65]">
                Quantity to add
                <input
                  required
                  autoFocus
                  min="1"
                  step="1"
                  type="number"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="mt-1 h-12 w-full rounded-lg border-2 border-[#d6e0d9] bg-white px-3 text-lg font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRestock}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#0c1b2a] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1c354c] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSubmitting ? 'Updating...' : 'Add stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
