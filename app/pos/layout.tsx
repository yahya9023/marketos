import { requirePageRole } from '@/lib/authorization';

export default async function PosLayout({ children }: LayoutProps<'/pos'>) {
  await requirePageRole(['OWNER', 'MANAGER', 'CASHIER']);
  return children;
}