import { requirePageRole } from '@/lib/authorization';
import { AuthenticatedShell } from '@/components/navigation/authenticated-shell';

export default async function SettingsLayout({ children }: LayoutProps<'/settings'>) {
  await requirePageRole(['OWNER']);
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}