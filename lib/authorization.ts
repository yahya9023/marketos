import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { getCurrentEmployee, type UserRole } from '@/lib/auth';

export async function requirePageRole(allowedRoles: UserRole[]) {
  const employee = await getCurrentEmployee();

  if (!employee) redirect('/login');
  if (!allowedRoles.includes(employee.role)) redirect('/unauthorized');

  return employee;
}

export async function authorizeApiRequest(requiredRoles: UserRole[]) {
  const employee = await getCurrentEmployee();

  if (!employee) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (!requiredRoles.includes(employee.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  return employee;
}