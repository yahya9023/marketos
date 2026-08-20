import { requirePageRole } from '@/lib/authorization';
import { AuthenticatedShell } from '@/components/navigation/authenticated-shell';

export default async function PosLayout({ children }: LayoutProps<'/pos'>) {
  await requirePageRole(['OWNER', 'MANAGER', 'CASHIER']);
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}