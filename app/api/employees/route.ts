import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/authorization';
import { hashPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';

const managedRoles = ['MANAGER', 'CASHIER'] as const;
const minimumPasswordLength = 8;

function isManagedRole(value: unknown): value is (typeof managedRoles)[number] {
  return typeof value === 'string' && managedRoles.includes(value as (typeof managedRoles)[number]);
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

export async function GET() {
  const authorization = await authorizeApiRequest(['OWNER']);
  if (authorization instanceof NextResponse) return authorization;

  try {
    const [employees, stores] = await Promise.all([
      prisma.employee.findMany({
        where: { store: { ownerId: authorization.id } },
        select: employeeSelect,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.store.findMany({
        where: { ownerId: authorization.id, active: true },
        select: { id: true, name: true, address: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return NextResponse.json({ employees, stores });
  } catch {
    return NextResponse.json(
      { error: 'Unable to fetch employees' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(['OWNER']);
  if (authorization instanceof NextResponse) return authorization;

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
  const password = typeof input.password === 'string' ? input.password : '';
  const role = input.role;
  const storeId = typeof input.storeId === 'string' ? input.storeId.trim() : '';

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  if (password.length < minimumPasswordLength) {
    return NextResponse.json({ error: `Password must be at least ${minimumPasswordLength} characters` }, { status: 400 });
  }
  if (!isManagedRole(role)) {
    return NextResponse.json({ error: 'New employees can only be MANAGER or CASHIER' }, { status: 400 });
  }
  if (!storeId) return NextResponse.json({ error: 'A valid store is required' }, { status: 400 });

  try {
    const employee = await prisma.$transaction(async (transaction) => {
      const [existingEmployee, store] = await Promise.all([
        transaction.employee.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true },
        }),
        transaction.store.findFirst({
          where: { id: storeId, ownerId: authorization.id, active: true },
          select: { id: true },
        }),
      ]);

      if (existingEmployee) throw new Error('An employee with that email already exists');
      if (!store) throw new Error('Store not found');

      return transaction.employee.create({
        data: {
          name,
          email,
          passwordHash: hashPassword(password),
          role,
          active: true,
          storeId: store.id,
        },
        select: employeeSelect,
      });
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create employee';
    return NextResponse.json(
      { error: message },
      { status: message === 'Store not found' ? 404 : 400 },
    );
  }
}