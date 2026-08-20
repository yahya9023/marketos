import { requirePageRole } from '@/lib/authorization';
import { AuthenticatedShell } from '@/components/navigation/authenticated-shell';

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requirePageRole(['OWNER', 'MANAGER']);
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}