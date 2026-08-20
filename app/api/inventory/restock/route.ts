import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { NextResponse } from 'next/server';
import { authorizeApiStoreRequest } from '@/lib/authorization';

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

const inventorySelect = {
  id: true,
  quantity: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      barcode: true,
      name: true,
      price: true,
      unit: true,
      imageUrl: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

export async function POST(request: Request) {
  const authorization = await authorizeApiStoreRequest(['OWNER', 'MANAGER']);
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
  const productId = input.productId;
  const quantity = input.quantity;

  if (typeof productId !== 'string' || !productId.trim()) {
    return NextResponse.json(
      { error: 'productId must be a non-empty string' },
      { status: 400 },
    );
  }

  if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
    return NextResponse.json(
      { error: 'quantity must be a positive integer' },
      { status: 400 },
    );
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: productId.trim(),
        storeProducts: { some: { storeId: authorization.store.id, active: true } },
        active: true,
      },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Active product not found' },
        { status: 404 },
      );
    }

    const inventory = await prisma.$transaction((transaction) =>
      transaction.inventory.upsert({
        where: {
          storeId_productId: {
            storeId: authorization.store.id,
            productId: product.id,
          },
        },
        update: { quantity: { increment: quantity as number } },
        create: {
          storeId: authorization.store.id,
          productId: product.id,
          quantity: quantity as number,
        },
        select: inventorySelect,
      }),
    );

    return NextResponse.json(inventory);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Inventory could not be updated safely; please retry' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to add stock' },
      { status: 500 },
    );
  }
}
