import { requirePageRole } from '@/lib/authorization';
import { AuthenticatedShell } from '@/components/navigation/authenticated-shell';

export default async function EmployeesLayout({ children }: LayoutProps<'/employees'>) {
  await requirePageRole(['OWNER']);
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}