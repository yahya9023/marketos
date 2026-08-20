import { requirePageRole } from '@/lib/authorization';

export default async function StockLayout({ children }: LayoutProps<'/stock'>) {
  await requirePageRole(['OWNER', 'MANAGER']);
  return children;
}