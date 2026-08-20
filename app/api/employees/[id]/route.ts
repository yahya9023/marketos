import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/authorization';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

const employeeRoles = ['OWNER', 'MANAGER', 'CASHIER'] as const;
const minimumPasswordLength = 8;

function isRole(value: unknown): value is (typeof employeeRoles)[number] {
  return typeof value === 'string' && employeeRoles.includes(value as (typeof employeeRoles)[number]);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  storeId: true,
  createdAt: true,
  store: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeApiRequest(['OWNER']);
  if (authorization instanceof NextResponse) return authorization;

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const role = input.role;
  const storeId = typeof input.storeId === 'string' ? input.storeId.trim() : '';
  const active = input.active;
  const password = typeof input.password === 'string' ? input.password : '';

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  if (!isRole(role)) return NextResponse.json({ error: 'Role must be OWNER, MANAGER, or CASHIER' }, { status: 400 });
  if (!storeId) return NextResponse.json({ error: 'A valid store is required' }, { status: 400 });
  if (typeof active !== 'boolean') return NextResponse.json({ error: 'Active status must be true or false' }, { status: 400 });
  if (password && password.length < minimumPasswordLength) {
    return NextResponse.json({ error: `Password must be at least ${minimumPasswordLength} characters` }, { status: 400 });
  }

  try {
    const employee = await prisma.$transaction(async (transaction) => {
      const [currentEmployee, duplicateEmployee, store] = await Promise.all([
        transaction.employee.findUnique({
          where: { id },
          select: { id: true, role: true, active: true },
        }),
        transaction.employee.findFirst({
          where: { email: { equals: email, mode: 'insensitive' }, NOT: { id } },
          select: { id: true },
        }),
        transaction.store.findUnique({ where: { id: storeId }, select: { id: true } }),
      ]);

      if (!currentEmployee) throw new Error('Employee not found');
      if (duplicateEmployee) throw new Error('An employee with that email already exists');
      if (!store) throw new Error('Store not found');

      const removesActiveOwner =
        currentEmployee.role === 'OWNER' &&
        currentEmployee.active &&
        (role !== 'OWNER' || !active);

      if (removesActiveOwner) {
        const activeOwnerCount = await transaction.employee.count({
          where: { role: 'OWNER', active: true },
        });
        if (activeOwnerCount <= 1) {
          throw new Error('At least one active OWNER must remain');
        }
      }

      return transaction.employee.update({
        where: { id },
        data: {
          name,
          email,
          role,
          active,
          storeId: store.id,
          ...(password ? { passwordHash: hashPassword(password) } : {}),
        },
        select: employeeSelect,
      });
    });

    return NextResponse.json(employee);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update employee' },
      { status: 400 },
    );
  }
}