import { requirePageRole } from '@/lib/authorization';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requirePageRole(['OWNER', 'MANAGER']);
  return children;
}