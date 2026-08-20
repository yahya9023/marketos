import Link from 'next/link';
import { getCurrentEmployee } from '@/lib/auth';
import { getCurrentStoreContext } from '@/lib/stores';
import { LogoutButton } from '@/components/auth/logout-button';
import { StoreSelector } from '@/components/navigation/store-selector';

const links = [
  { href: '/dashboard', label: 'Dashboard', roles: ['OWNER', 'MANAGER'] },
  { href: '/pos', label: 'POS', roles: ['OWNER', 'MANAGER', 'CASHIER'] },
  { href: '/admin/products', label: 'Products', roles: ['OWNER', 'MANAGER'] },
  { href: '/stock', label: 'Inventory', roles: ['OWNER', 'MANAGER'] },
  { href: '/sales', label: 'Sales', roles: ['OWNER', 'MANAGER'] },
  { href: '/employees', label: 'Employees', roles: ['OWNER'] },
  { href: '/settings/stores', label: 'Stores', roles: ['OWNER'] },
] as const;

export async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const employee = await getCurrentEmployee();
  if (!employee) return children;

  const { stores, store } = await getCurrentStoreContext(employee);
  const visibleLinks = links.filter((link) => link.roles.some((role) => role === employee.role));

  return (
    <div className="min-h-screen bg-[#0c1b2a]">
      <header className="border-b border-white/10 px-4 py-3 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3">
          <Link href="/pos" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e1f25b] font-black text-[#0c1b2a]">M.</span>
            <span className="font-bold tracking-tight">MarketOS</span>
          </Link>
          <nav className="order-3 flex min-w-0 max-w-full flex-1 gap-1 overflow-x-auto pb-1 sm:order-2 sm:ml-3 sm:pb-0">
            {visibleLinks.map((link) => <Link key={link.href} href={link.href} className="shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white">{link.label}</Link>)}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-3 sm:order-3">
            {store && <StoreSelector stores={stores} selectedStoreId={store.id} canSwitch={employee.role === 'OWNER'} />}
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}