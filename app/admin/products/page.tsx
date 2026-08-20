'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { currentStoreChangedEvent } from '@/lib/store-events';

type Product = {
  id: string;
  name: string;
  barcode: string;
  category: { id: string; name: string };
  price: number | string;
  vatRate: number | string;
  unit: string;
  imageUrl: string | null;
  active: boolean;
};

type Category = {
  id: string;
  name: string;
};

type InventoryRecord = {
  quantity: number;
  product: { id: string };
};

type ProductForm = {
  name: string;
  barcode: string;
  categoryId: string;
  price: string;
  vatRate: string;
  unit: string;
  imageUrl: string;
  initialStock: string;
};

const emptyForm: ProductForm = {
  name: '',
  barcode: '',
  categoryId: '',
  price: '',
  vatRate: '',
  unit: 'piece',
  imageUrl: '',
  initialStock: '0',
};

const unitOptions = ['piece', 'kg', 'g', 'L', 'ml', 'pack', 'bottle'];

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
});

function formatPrice(price: number | string) {
  return currency.format(Number(price));
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  async function loadData() {
    setIsLoading(true);
    setLoadError('');

    try {
      const [productsResponse, categoriesResponse, inventoryResponse] =
        await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
          fetch('/api/inventory'),
        ]);

      if (!productsResponse.ok) {
        throw new Error('Unable to load products');
      }
      if (!categoriesResponse.ok) {
        throw new Error('Unable to load categories');
      }

      const productsData: Product[] = await productsResponse.json();
      const categoriesData: Category[] = await categoriesResponse.json();
      const inventoryData: InventoryRecord[] = inventoryResponse.ok
        ? await inventoryResponse.json()
        : [];

      setProducts(productsData);
      setCategories(categoriesData);
      setInventory(inventoryData);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : 'Unable to load products',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
    window.addEventListener(currentStoreChangedEvent, loadData);

    return () => {
      window.removeEventListener(currentStoreChangedEvent, loadData);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.barcode.toLowerCase().includes(query),
    );
  }, [products, search]);

  const inventoryByProductId = useMemo(
    () => new Map(inventory.map((record) => [record.product.id, record.quantity])),
    [inventory],
  );

  function updateForm(field: keyof ProductForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openModal() {
    setForm(emptyForm);
    setEditingProduct(null);
    setSelectedImage(null);
    setImagePreview('');
    setFormError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      barcode: product.barcode,
      categoryId: product.category.id,
      price: String(product.price),
      vatRate: String(product.vatRate),
      unit: product.unit,
      imageUrl: product.imageUrl ?? '',
      initialStock: '0',
    });
    setSelectedImage(null);
    setImagePreview(product.imageUrl ?? '');
    setFormError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setFormError('');
  }

  function handleImageChange(file: File | undefined) {
    if (!file) return;
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setSelectedImage(null);
    setImagePreview('');
    updateForm('imageUrl', '');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    const price = Number(form.price);
    const vatRate = Number(form.vatRate);

    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!form.barcode.trim()) {
      setFormError('Barcode is required by the Products API.');
      return;
    }
    if (!form.categoryId) {
      setFormError('Category is required.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Price must be a positive number.');
      return;
    }
    if (!Number.isFinite(vatRate) || vatRate < 0) {
      setFormError('VAT rate must be a non-negative number.');
      return;
    }
    if (!form.unit.trim()) {
      setFormError('Unit is required.');
      return;
    }
    const initialStock = Number(form.initialStock);
    if (!editingProduct && (!Number.isInteger(initialStock) || initialStock < 0)) {
      setFormError('Initial stock must be a whole number of 0 or more.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | null = null;
      if (selectedImage) {
        const imageData = new FormData();
        imageData.append('file', selectedImage);
        const uploadResponse = await fetch('/api/uploads/product-image', {
          method: 'POST',
          body: imageData,
        });
        const uploadResult: { error?: string; imageUrl?: string } =
          await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.imageUrl) {
          throw new Error(uploadResult.error ?? 'Unable to upload image');
        }
        imageUrl = uploadResult.imageUrl;
      }

      const response = await fetch(
        editingProduct ? `/api/products/${editingProduct.id}` : '/api/products',
        {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          barcode: form.barcode.trim(),
          categoryId: form.categoryId,
          price,
          vatRate,
          unit: form.unit.trim(),
          imageUrl: selectedImage ? imageUrl : form.imageUrl || null,
          ...(editingProduct ? {} : { initialStock }),
        }),
        },
      );

      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ??
            (editingProduct
              ? 'Unable to update product'
              : 'Unable to create product'),
        );
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      setEditingProduct(null);
      setSelectedImage(null);
      setImagePreview('');
      setSuccessMessage(
        editingProduct
          ? 'Product updated successfully.'
          : 'Product created successfully. Inventory initialized.',
      );
      setIsLoading(true);
      await loadData();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : editingProduct
            ? 'Unable to update product'
            : 'Unable to create product',
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
                Product management
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/stock"
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              Inventory / Stock
            </Link>
            <button
              type="button"
              onClick={openModal}
              className="rounded-lg bg-[#e1f25b] px-4 py-3 text-sm font-black text-[#0c1b2a] transition hover:bg-[#d4e94e] active:scale-[0.98]"
            >
              + Add Product
            </button>
          </div>
        </header>

        <section className="rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">
                Catalog control
              </p>
              <h1 className="text-3xl font-black tracking-tight text-[#0c1b2a] sm:text-4xl">
                Products
              </h1>
            </div>
            <div className="text-sm font-semibold text-[#5f746d]">
              {filteredProducts.length} of {products.length} products
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label htmlFor="product-search" className="sr-only">
              Search products by name or barcode
            </label>
            <input
              id="product-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or barcode"
              className="h-12 min-w-0 flex-1 rounded-xl border-2 border-[#d6e0d9] bg-white px-4 text-sm font-semibold text-[#0c1b2a] outline-none transition focus:border-[#8caa4d] focus:ring-4 focus:ring-[#dce9a8]"
            />
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

          <div className="overflow-x-auto rounded-xl border border-[#dce5df] bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[#dce5df] bg-[#f8faf8] text-[11px] font-black uppercase tracking-[0.14em] text-[#5f746d]">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">VAT</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf1ed]">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center font-semibold text-[#5f746d]">
                      Loading products...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center font-semibold text-[#5f746d]">
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="transition hover:bg-[#fbfdfb]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#e4eee7] text-lg font-black text-[#346154]">
                              {product.name.charAt(0)}
                            </span>
                          )}
                          <span className="font-bold text-[#0c1b2a]">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{product.barcode}</td>
                      <td className="px-4 py-3 text-slate-600">{product.category.name}</td>
                      <td className="px-4 py-3 font-black text-[#346154]">{formatPrice(product.price)}</td>
                      <td className="px-4 py-3 text-slate-600">{product.vatRate}%</td>
                      <td className="px-4 py-3 text-slate-600">{product.unit}</td>
                      <td className="px-4 py-3 font-bold text-[#0c1b2a]">{inventoryByProductId.get(product.id) ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#e4eee7] px-2.5 py-1 text-xs font-bold text-[#346154]">
                          {product.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="rounded-lg border border-[#b8c9bd] px-3 py-2 text-xs font-bold text-[#346154] transition hover:bg-[#e4eee7]"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1b2a]/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">
                  Catalog control
                </p>
                <h2 className="text-2xl font-black text-[#0c1b2a]">
                  {editingProduct ? 'Edit Product' : 'Add Product'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white"
              >
                Close
              </button>
            </div>

            {formError && (
              <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                {formError}
              </p>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-[#4f6b65]">
                Name
                <input required value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
              </label>
              <label className="text-sm font-bold text-[#4f6b65]">
                Barcode
                <input required value={form.barcode} onKeyDown={(event) => event.key === 'Enter' && event.preventDefault()} onChange={(event) => updateForm('barcode', event.target.value)} autoFocus placeholder="Scanner-friendly" className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
              </label>
              <label className="text-sm font-bold text-[#4f6b65]">
                Category
                <select required value={form.categoryId} onChange={(event) => updateForm('categoryId', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]">
                  <option value="">Select category</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold text-[#4f6b65]">
                Unit
                <select required value={form.unit} onChange={(event) => updateForm('unit', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]">
                  {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold text-[#4f6b65]">
                Price (EUR)
                <input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => updateForm('price', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
              </label>
              <label className="text-sm font-bold text-[#4f6b65]">
                VAT rate (%)
                <input required type="number" min="0" step="0.01" value={form.vatRate} onChange={(event) => updateForm('vatRate', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
              </label>
              <label className="text-sm font-bold text-[#4f6b65] sm:col-span-2">
                Initial stock
                <input disabled={Boolean(editingProduct)} required={!editingProduct} min="0" step="1" type="number" value={form.initialStock} onChange={(event) => updateForm('initialStock', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500" />
                <span className="mt-1 block text-xs font-medium text-slate-500">{editingProduct ? 'Inventory is not changed when editing a product.' : 'This quantity initializes the current store inventory.'}</span>
              </label>
              <div className="sm:col-span-2">
                <span className="text-sm font-bold text-[#4f6b65]">Product image</span>
                <div className="mt-1 rounded-lg border border-dashed border-[#b8c9bd] bg-white p-4">
                  {imagePreview ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <img src={imagePreview} alt="Selected product preview" className="h-28 w-28 rounded-lg object-cover" />
                      <div className="flex gap-2">
                        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                          Replace image
                          <input type="file" accept="image/*" onChange={(event) => handleImageChange(event.target.files?.[0])} className="sr-only" />
                        </label>
                        <button type="button" onClick={removeImage} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <label className="block cursor-pointer rounded-lg px-4 py-6 text-center text-sm font-bold text-[#346154] hover:bg-[#f8faf8]">
                      Upload product image
                      <input type="file" accept="image/*" onChange={(event) => handleImageChange(event.target.files?.[0])} className="sr-only" />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
                <button type="button" onClick={closeModal} disabled={isSubmitting} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-white">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#0c1b2a] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1c354c] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Saving...' : editingProduct ? 'Save changes' : 'Create product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}