'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { currentStoreChangedEvent } from '@/lib/store-events';

type Product = {
  id: string;
  barcode: string;
  name: string;
  category: string;
  price: number;
  vatRate: number;
  unit: string;
  imageUrl: string | null;
  availableStock: number;
  tone: string;
};

type CartItem = Product & {
  quantity: number;
};

type PaymentMethod = 'CASH' | 'CARD';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
});

const productTones = [
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-lime-100 text-lime-700',
  'bg-rose-100 text-rose-700',
  'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700',
];

type ProductResponse = {
  id: string;
  barcode: string;
  name: string;
  category: { name: string };
  price: number | string;
  vatRate: number | string;
  unit: string;
  imageUrl: string | null;
};

type InventoryResponse = {
  quantity: number;
  product: { id: string };
};

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [notice, setNotice] = useState('Ready for next item');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoading(true);
      try {
        const [productsResponse, inventoryResponse] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/inventory'),
        ]);
        if (!productsResponse.ok || !inventoryResponse.ok) {
          throw new Error('Unable to load products');
        }

        const [data, inventoryData]: [ProductResponse[], InventoryResponse[]] =
          await Promise.all([productsResponse.json(), inventoryResponse.json()]);
        const stockByProductId = new Map(
          inventoryData.map((record) => [record.product.id, record.quantity]),
        );
        if (isMounted) {
          setProducts(
            data.map((product, index) => ({
              id: product.id,
              barcode: product.barcode,
              name: product.name,
              category: product.category.name,
              price: Number(product.price),
              vatRate: Number(product.vatRate),
              unit: product.unit,
              imageUrl: product.imageUrl,
              availableStock: stockByProductId.get(product.id) ?? 0,
              tone: productTones[index % productTones.length],
            })),
          );
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setLoadError('Unable to load products');
          setIsLoading(false);
        }
      }
    }

    loadProducts();
    window.addEventListener(currentStoreChangedEvent, loadProducts);

    return () => {
      isMounted = false;
      window.removeEventListener(currentStoreChangedEvent, loadProducts);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = barcode.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.barcode.includes(query),
    );
  }, [barcode, products]);

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const vat = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity * (item.vatRate / 100),
    0,
  );
  const grandTotal = subtotal + vat;
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);

  function addProduct(product: Product) {
    if (product.availableStock < 1) {
      setNotice(`${product.name} is out of stock`);
      return;
    }

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.barcode === product.barcode,
      );

      if (existingItem) {
        if (existingItem.quantity >= existingItem.availableStock) {
          return currentCart;
        }
        return currentCart.map((item) =>
          item.barcode === product.barcode
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
    setBarcode('');
    barcodeInputRef.current?.focus();
    setNotice(`${product.name} added to cart`);
    setPaymentMessage('');
  }

  function handleBarcodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = barcode.trim().toLowerCase();
    if (!query) {
      setNotice('Enter a barcode or product name');
      setBarcode('');
      barcodeInputRef.current?.focus();
      return;
    }

    const product =
      products.find((item) => item.barcode.toLowerCase() === query) ??
      products.find((item) => item.name.toLowerCase().includes(query));

    if (product) {
      addProduct(product);
      return;
    }

    setBarcode('');
    barcodeInputRef.current?.focus();
    setNotice('No product found');
  }

  function changeQuantity(barcodeValue: string, amount: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.barcode === barcodeValue
            ? {
                ...item,
                quantity: Math.min(
                  item.availableStock,
                  Math.max(1, item.quantity + amount),
                ),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
    setPaymentMessage('');
  }

  function setDirectQuantity(barcodeValue: string, value: string) {
    if (!value) return;

    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1) return;

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.barcode === barcodeValue
          ? { ...item, quantity: Math.min(quantity, item.availableStock) }
          : item,
      ),
    );
    setPaymentMessage('');
  }

  function removeItem(barcodeValue: string) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.barcode !== barcodeValue),
    );
    setNotice('Item removed from cart');
    setPaymentMessage('');
  }

  function clearCart() {
    setCart([]);
    setNotice('Cart cleared');
    setPaymentMessage('');
  }

  async function handleCheckout(selectedPaymentMethod: PaymentMethod) {
    if (isCheckoutLoading) return;

    if (cart.length === 0) {
      setPaymentMessage('Add an item before checkout');
      return;
    }

    setIsCheckoutLoading(true);
  setPaymentMethod(selectedPaymentMethod);
  setPaymentMessage(`Processing ${selectedPaymentMethod.toLowerCase()} payment...`);

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
          paymentMethod: selectedPaymentMethod,
        }),
      });

      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to complete sale');
      }

      setCart([]);
      setNotice('Sale completed successfully');
      setPaymentMessage(
        `${selectedPaymentMethod} payment completed`,
      );

      const [productsResponse, inventoryResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/inventory'),
      ]);
      if (!productsResponse.ok || !inventoryResponse.ok) {
        throw new Error('Unable to refresh products');
      }

      const [refreshedProducts, refreshedInventory]: [
        ProductResponse[],
        InventoryResponse[],
      ] = await Promise.all([
        productsResponse.json(),
        inventoryResponse.json(),
      ]);
      const stockByProductId = new Map(
        refreshedInventory.map((record) => [record.product.id, record.quantity]),
      );
      setProducts(
        refreshedProducts.map((product, index) => ({
          id: product.id,
          barcode: product.barcode,
          name: product.name,
          category: product.category.name,
          price: Number(product.price),
          vatRate: Number(product.vatRate),
          unit: product.unit,
          imageUrl: product.imageUrl,
          availableStock: stockByProductId.get(product.id) ?? 0,
          tone: productTones[index % productTones.length],
        })),
      );
      setLoadError('');
    } catch (error) {
      setPaymentMessage(
        error instanceof Error ? error.message : 'Unable to complete sale',
      );
    } finally {
      setIsCheckoutLoading(false);
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-[#0c1b2a] text-slate-950">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1800px] flex-col overflow-hidden p-4 sm:p-6 lg:p-8">
        <header className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 text-white lg:mb-5 lg:gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e1f25b] text-xl font-black tracking-tight text-[#0c1b2a]">
              M.
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">MarketOS</p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Checkout terminal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
              <span className="mr-2 text-slate-400">Register</span>
              <span className="font-bold">04</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e1f25b] text-xs font-bold text-[#0c1b2a]">
                AM
              </span>
              <span className="font-semibold">Alex Morgan</span>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[0.45fr_0.55fr] gap-5 overflow-hidden lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-rows-1">
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-[#f5f7f2] p-3 shadow-2xl shadow-black/10 lg:p-7">
            <div className="mb-1 flex items-end justify-between gap-3 lg:mb-6 lg:gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">
                  Item lookup
                </p>
                <h1 className="text-xl font-black tracking-tight text-[#0c1b2a] lg:text-4xl">
                  Scan products
                </h1>
              </div>
              <div className="hidden rounded-full bg-[#e4eee7] px-3 py-1.5 text-xs font-bold text-[#346154] lg:block">
                {itemCount} items in sale
              </div>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="relative mb-2 lg:mb-3">
              <label htmlFor="barcode" className="mb-2 block text-sm font-bold text-[#4f6b65]">
                Scan or enter barcode
              </label>
              <div className="pointer-events-none absolute bottom-0 left-5 top-9 flex items-center text-[#3c665d]">
                <span className="text-2xl leading-none">|||</span>
              </div>
              <input
                id="barcode"
                ref={barcodeInputRef}
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="Scan barcode or type product name"
                autoFocus
                className="h-10 w-full rounded-xl border-2 border-[#d6e0d9] bg-white pl-16 pr-28 text-base font-semibold text-[#0c1b2a] outline-none transition focus:border-[#8caa4d] focus:ring-4 focus:ring-[#dce9a8] lg:h-16 lg:text-lg"
              />
              <button
                type="submit"
                className="absolute right-2 top-9 h-12 rounded-lg bg-[#0c1b2a] px-5 text-sm font-bold text-white transition hover:bg-[#1c354c] active:scale-[0.98]"
              >
                Add item
              </button>
            </form>
            <p className="mb-1 min-h-5 text-sm font-medium text-[#5f746d] lg:mb-6">
              {notice}
            </p>

            <div className="mb-1 flex items-center justify-between lg:mb-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[#4f6b65]">
                Quick add
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {filteredProducts.length} products
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="grid min-w-0 content-start grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                <p className="col-span-full text-sm font-medium text-[#5f746d]">
                  Loading products...
                </p>
              ) : loadError ? (
                <p className="col-span-full text-sm font-medium text-rose-600">
                  {loadError}
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.barcode}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="group min-h-0 min-w-0 max-w-full rounded-xl border border-[#dce5df] bg-white p-2 text-left transition hover:-translate-y-0.5 hover:border-[#9eb65b] hover:shadow-lg active:translate-y-0 lg:p-4"
                  >
                    <span
                      className={`mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg text-4xl font-black lg:mb-4 lg:h-36 ${product.tone}`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        product.name.charAt(0)
                      )}
                    </span>
                    <span className="block text-sm font-bold leading-tight text-[#0c1b2a]">
                      {product.name}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {product.unit}
                    </span>
                    <span className="mt-2 block text-base font-black text-[#346154] lg:mt-3">
                      {currency.format(product.price)}
                    </span>
                  </button>
                ))
              )}
              </div>
            </div>

            <div className="mt-3 hidden shrink-0 items-center justify-between border-t border-[#dce5df] pt-3 text-xs text-[#5f746d] lg:mt-6 lg:flex lg:pt-4">
              <span>Scanner ready</span>
              <span className="font-semibold">Last sync: just now</span>
            </div>
          </section>

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-2xl shadow-black/10 lg:p-7">
            <div className="mb-1 flex items-start justify-between gap-3 border-b border-slate-200 pb-1 lg:mb-5 lg:pb-5">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#7a8c84]">
                  Current sale
                </p>
                <h2 className="text-xl font-black tracking-tight text-[#0c1b2a] lg:text-3xl">
                  Shopping cart
                </h2>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98]"
              >
                Clear cart
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="flex h-full min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-medium text-slate-500 lg:min-h-48 lg:p-6">
                  Cart is empty. Scan an item to begin.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <span>Product</span>
                    <span>Qty</span>
                    <span className="col-start-2 row-start-2 sm:col-auto sm:row-auto">
                      Total
                    </span>
                  </div>
                  {cart.map((item) => (
                    <div
                      key={item.barcode}
                      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 bg-[#f8faf8] p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#0c1b2a]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {currency.format(item.price)} / {item.unit}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-[#346154]">
                          Available stock: {item.availableStock}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.barcode)}
                          className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          onClick={() => changeQuantity(item.barcode, -1)}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-xl font-medium text-[#0c1b2a] hover:bg-slate-100"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.availableStock}
                          value={item.quantity}
                          aria-label={`${item.name} quantity`}
                          onChange={(event) =>
                            setDirectQuantity(item.barcode, event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur();
                            }
                          }}
                          className="h-9 w-10 rounded-md text-center text-sm font-black text-[#0c1b2a] outline-none focus:bg-slate-100"
                        />
                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          onClick={() => changeQuantity(item.barcode, 1)}
                          className="flex h-9 w-9 items-center justify-center rounded-md text-xl font-medium text-[#0c1b2a] hover:bg-slate-100"
                        >
                          +
                        </button>
                      </div>
                      <span className="col-start-2 row-start-2 min-w-0 text-right text-sm font-black text-[#0c1b2a] sm:col-auto sm:row-auto sm:min-w-20">
                        {currency.format(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-1 shrink-0 border-t border-slate-200 pt-1 lg:mt-5 lg:pt-5">
              <div className="space-y-1 text-sm lg:space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-700">
                    {currency.format(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT</span>
                  <span className="font-semibold text-slate-700">
                    {currency.format(vat)}
                  </span>
                </div>
                <div className="mt-1 flex items-end justify-between border-t border-dashed border-slate-200 pt-1 lg:mt-4 lg:pt-4">
                  <span className="text-sm font-bold uppercase tracking-[0.15em] text-[#4f6b65]">
                    Grand total
                  </span>
                  <span className="text-xl font-black tracking-tight text-[#0c1b2a] lg:text-4xl">
                    {currency.format(grandTotal)}
                  </span>
                </div>
              </div>

              <div className="mt-1 grid grid-cols-2 gap-2 lg:mt-6 lg:gap-3">
                <button
                  type="button"
                  onClick={() => handleCheckout('CASH')}
                  disabled={isCheckoutLoading}
                  className="flex min-h-12 flex-col items-center justify-center rounded-xl bg-[#e1f25b] text-[#0c1b2a] transition hover:bg-[#d4e94e] active:scale-[0.98] lg:min-h-20"
                >
                  <span className="text-lg font-black">CASH</span>
                  <span className="mt-1 text-xs font-semibold opacity-70">
                    {isCheckoutLoading && paymentMethod === 'CASH'
                      ? 'Processing...'
                      : 'Pay with cash'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckout('CARD')}
                  disabled={isCheckoutLoading}
                  className="flex min-h-12 flex-col items-center justify-center rounded-xl bg-[#0c1b2a] text-white transition hover:bg-[#1c354c] active:scale-[0.98] lg:min-h-20"
                >
                  <span className="text-lg font-black">CARD</span>
                  <span className="mt-1 text-xs font-semibold text-slate-300">
                    {isCheckoutLoading && paymentMethod === 'CARD'
                      ? 'Processing...'
                      : 'Tap or insert card'}
                  </span>
                </button>
              </div>
              <p className="mt-1 h-5 text-center text-xs font-bold text-[#346154] lg:mt-3">
                {paymentMessage}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
