'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/components/i18n/provider';

type Role = 'OWNER' | 'MANAGER' | 'CASHIER';

type Store = {
  id: string;
  name: string;
  address?: string;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  storeId: string;
  createdAt: string;
  store: { id: string; name: string };
};

type EmployeeForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
  storeId: string;
  active: boolean;
};

const emptyForm: EmployeeForm = {
  name: '',
  email: '',
  password: '',
  role: 'MANAGER',
  storeId: '',
  active: true,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export default function EmployeesPage() {
  const { t } = useI18n();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function loadData() {
    setLoadError('');

    try {
      const response = await fetch('/api/employees');
      const result: { error?: string; employees?: Employee[]; stores?: Store[] } =
        await response.json();

      if (!response.ok || !result.employees || !result.stores) {
        throw new Error(result.error ?? 'Unable to load employees');
      }

      setEmployees(result.employees);
      setStores(result.stores);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load employees');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData());
  }, []);

  function updateForm(field: keyof EmployeeForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setEditingEmployee(null);
    setForm({ ...emptyForm, storeId: stores[0]?.id ?? '' });
    setFormError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(employee: Employee) {
    setEditingEmployee(employee);
    setForm({
      name: employee.name,
      email: employee.email,
      password: '',
      role: employee.role,
      storeId: employee.storeId,
      active: employee.active,
    });
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

    if (!form.name.trim() || !form.email.trim() || !form.storeId) {
      setFormError('Name, email, and store are required.');
      return;
    }
    if (!editingEmployee && !form.password) {
      setFormError('Password is required when creating an employee.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees',
        {
          method: editingEmployee ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            storeId: form.storeId,
            active: form.active,
            ...(form.password ? { password: form.password } : {}),
          }),
        },
      );
      const result: { error?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to save employee');
      }

      setIsModalOpen(false);
      setSuccessMessage(editingEmployee ? 'Employee updated successfully.' : 'Employee created successfully.');
      await loadData();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save employee');
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
                Employee management
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
              Dashboard
            </Link>
            <button type="button" onClick={openCreateModal} disabled={stores.length === 0} className="rounded-lg bg-[#e1f25b] px-4 py-3 text-sm font-black text-[#0c1b2a] transition hover:bg-[#d4e94e] disabled:cursor-not-allowed disabled:opacity-50">
              + Create Employee
            </button>
          </div>
        </header>

        <section className="rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl shadow-black/10 sm:p-7">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">Access control</p>
              <h1 className="text-3xl font-black tracking-tight text-[#0c1b2a] sm:text-4xl">{t('Employees')}</h1>
            </div>
            <span className="text-sm font-semibold text-[#5f746d]">{employees.length} employees</span>
          </div>

          {successMessage && <p className="mb-4 rounded-lg bg-[#e4eee7] px-4 py-3 text-sm font-bold text-[#346154]">{successMessage}</p>}
          {loadError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{loadError}</p>}

          {isLoading ? (
            <p className="rounded-xl border border-dashed border-[#b8c9bd] px-4 py-12 text-center text-sm font-semibold text-[#5f746d]">Loading employees...</p>
          ) : employees.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#b8c9bd] px-4 py-12 text-center text-sm font-semibold text-[#5f746d]">No employees found.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {employees.map((employee) => (
                <article key={employee.id} className="min-w-0 rounded-xl border border-[#dce5df] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black text-[#0c1b2a]">{employee.name}</h2>
                      <p className="mt-1 truncate text-sm text-slate-500">{employee.email}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${employee.active ? 'bg-[#e4eee7] text-[#346154]' : 'bg-slate-100 text-slate-500'}`}>
                      {employee.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <dl className="mt-4 space-y-2 border-t border-[#edf1ed] pt-3 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Role</dt><dd className="font-black text-[#346154]">{employee.role}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Store</dt><dd className="truncate text-right font-semibold text-[#0c1b2a]">{employee.store.name}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Created</dt><dd className="text-right text-slate-600">{formatDate(employee.createdAt)}</dd></div>
                  </dl>
                  <button type="button" onClick={() => openEditModal(employee)} className="mt-4 w-full rounded-lg border border-[#b8c9bd] px-3 py-2 text-sm font-bold text-[#346154] transition hover:bg-[#e4eee7]">
                    Edit employee
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1b2a]/70 p-4">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-[#f5f7f2] p-5 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4f6b65]">Access control</p>
                <h2 className="text-2xl font-black text-[#0c1b2a]">{editingEmployee ? 'Edit employee' : 'Create employee'}</h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-white">Close</button>
            </div>

            {formError && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{formError}</p>}

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-[#4f6b65]">Name
                <input required value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
              </label>
              <label className="block text-sm font-bold text-[#4f6b65]">Email
                <input required type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
              </label>
              <label className="block text-sm font-bold text-[#4f6b65]">Role
                <select value={form.role} onChange={(event) => updateForm('role', event.target.value as Role)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]">
                  {!editingEmployee && <option value="MANAGER">MANAGER</option>}
                  {!editingEmployee && <option value="CASHIER">CASHIER</option>}
                  {editingEmployee && <><option value="OWNER">OWNER</option><option value="MANAGER">MANAGER</option><option value="CASHIER">CASHIER</option></>}
                </select>
              </label>
              <label className="block text-sm font-bold text-[#4f6b65]">Store
                <select required value={form.storeId} onChange={(event) => updateForm('storeId', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]">
                  <option value="">Select store</option>
                  {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-[#4f6b65] sm:col-span-2">{editingEmployee ? 'New password (optional)' : 'Password'}
                <input required={!editingEmployee} type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => updateForm('password', event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]" />
                <span className="mt-1 block text-xs font-medium text-slate-500">Minimum 8 characters. Existing password stays unchanged when left empty.</span>
              </label>
              {editingEmployee && (
                <label className="flex items-center gap-3 text-sm font-bold text-[#4f6b65] sm:col-span-2">
                  <input type="checkbox" checked={form.active} onChange={(event) => updateForm('active', event.target.checked)} className="h-4 w-4 accent-[#8caa4d]" />
                  Active employee
                </label>
              )}
              <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
                <button type="button" onClick={closeModal} disabled={isSubmitting} className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-white">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="rounded-lg bg-[#0c1b2a] px-5 py-3 text-sm font-black text-white transition hover:bg-[#1c354c] disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Saving...' : editingEmployee ? 'Save changes' : 'Create employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}