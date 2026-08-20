import { requirePageRole } from '@/lib/authorization';
import { AuthenticatedShell } from '@/components/navigation/authenticated-shell';

export default async function SalesLayout({ children }: LayoutProps<'/sales'>) {
  await requirePageRole(['OWNER', 'MANAGER']);
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}