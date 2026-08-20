import { requirePageRole } from '@/lib/authorization';

export default async function SalesLayout({ children }: LayoutProps<'/sales'>) {
  await requirePageRole(['OWNER', 'MANAGER']);
  return children;
}