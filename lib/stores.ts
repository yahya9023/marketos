import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/lib/auth';

export const currentStoreCookie = 'marketos-current-store';

export type AccessibleStore = {
  id: string;
  name: string;
  address: string;
  active: boolean;
};

export async function getAccessibleStores(employee: {
  role: UserRole;
  storeId: string;
}) {
  if (employee.role === 'OWNER') {
    return prisma.store.findMany({
      where: { active: true },
      select: { id: true, name: true, address: true, active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  const store = await prisma.store.findFirst({
    where: { id: employee.storeId, active: true },
    select: { id: true, name: true, address: true, active: true },
  });

  return store ? [store] : [];
}

export async function getCurrentStoreContext(employee: {
  role: UserRole;
  storeId: string;
}) {
  const stores = await getAccessibleStores(employee);
  if (stores.length === 0) return { stores, store: null };

  const cookieStore = await cookies();
  const selectedStoreId = cookieStore.get(currentStoreCookie)?.value;
  const selectedStore =
    employee.role === 'OWNER' && selectedStoreId
      ? stores.find((store) => store.id === selectedStoreId)
      : undefined;

  return {
    stores,
    store: selectedStore ?? stores[0],
  };
}

export async function getCurrentStoreForEmployee(employee: {
  role: UserRole;
  storeId: string;
}) {
  const context = await getCurrentStoreContext(employee);
  return context.store;
}