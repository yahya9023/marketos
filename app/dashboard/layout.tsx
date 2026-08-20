import { requirePageRole } from '@/lib/authorization';

export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  await requirePageRole(['OWNER', 'MANAGER']);
  return children;
}