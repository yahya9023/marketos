import { requirePageRole } from '@/lib/authorization';

export default async function EmployeesLayout({ children }: LayoutProps<'/employees'>) {
  await requirePageRole(['OWNER']);
  return children;
}