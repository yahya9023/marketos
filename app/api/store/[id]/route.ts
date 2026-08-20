import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/authorization';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const storeSelect = {
  id: true,
  name: true,
  address: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

function withCurrency<T extends object>(store: T) {
  return { ...store, currency: 'EUR' };
}

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
  const address = typeof input.address === 'string' ? input.address.trim() : '';
  const active = input.active;

  if (!name) return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
  if (!address) return NextResponse.json({ error: 'address must be a non-empty string' }, { status: 400 });
  if (typeof active !== 'boolean') return NextResponse.json({ error: 'active must be true or false' }, { status: 400 });

  try {
    const store = await prisma.$transaction(async (transaction) => {
      const [currentStore, duplicateStore] = await Promise.all([
        transaction.store.findUnique({ where: { id }, select: { id: true, active: true } }),
        transaction.store.findFirst({
          where: { name: { equals: name, mode: 'insensitive' }, NOT: { id } },
          select: { id: true },
        }),
      ]);

      if (!currentStore) throw new Error('Store not found');
      if (duplicateStore) throw new Error('A store with that name already exists');

      if (currentStore.active && !active) {
        const activeStoreCount = await transaction.store.count({ where: { active: true } });
        if (activeStoreCount <= 1) throw new Error('At least one active store must remain.');
      }

      return transaction.store.update({
        where: { id },
        data: { name, address, active },
        select: storeSelect,
      });
    });

    return NextResponse.json(withCurrency(store));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update store' },
      { status: 400 },
    );
  }
}