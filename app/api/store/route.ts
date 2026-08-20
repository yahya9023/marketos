import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/authorization';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

const storeSelect = {
  id: true,
  name: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} as const;

function withCurrency<T extends object>(store: T, currency: string) {
  return { ...store, currency };
}

export async function GET() {
  const authorization = await authorizeApiRequest(['OWNER', 'MANAGER']);
  if (authorization instanceof NextResponse) return authorization;

  try {
    const store = await prisma.store.findFirst({
      orderBy: { createdAt: 'asc' },
      select: storeSelect,
    });

    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 },
      );
    }

    return NextResponse.json(withCurrency(store, 'EUR'));
  } catch {
    return NextResponse.json(
      { error: 'Unable to fetch store' },
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
    return NextResponse.json(
      { error: 'Request body must be valid JSON' },
      { status: 400 },
    );
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: 'Request body must be a JSON object' },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown>;
  const name = input.name;
  const address = input.address;
  const currency = input.currency === undefined ? 'EUR' : input.currency;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json(
      { error: 'name must be a non-empty string' },
      { status: 400 },
    );
  }

  if (typeof address !== 'string' || !address.trim()) {
    return NextResponse.json(
      { error: 'address must be a non-empty string' },
      { status: 400 },
    );
  }

  if (typeof currency !== 'string' || !currency.trim()) {
    return NextResponse.json(
      { error: 'currency must be a non-empty string' },
      { status: 400 },
    );
  }

  try {
    const existingStore = await prisma.store.findFirst({
      select: { id: true },
    });

    if (existingStore) {
      return NextResponse.json(
        { error: 'A store already exists' },
        { status: 409 },
      );
    }

    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        address: address.trim(),
      },
      select: storeSelect,
    });

    return NextResponse.json(withCurrency(store, currency.trim()), {
      status: 201,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A store already exists' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to create store' },
      { status: 500 },
    );
  }
}