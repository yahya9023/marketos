import { requirePageRole } from '@/lib/authorization';
import { AuthenticatedShell } from '@/components/navigation/authenticated-shell';

export default async function StockLayout({ children }: LayoutProps<'/stock'>) {
  await requirePageRole(['OWNER', 'MANAGER']);
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}