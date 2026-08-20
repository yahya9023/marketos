import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
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

function getInventoryInput(body: unknown) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object' } as const;
  }

  const input = body as Record<string, unknown>;
  const productId = input.productId;
  const quantity = input.quantity;

  if (typeof productId !== 'string' || !productId.trim()) {
    return { error: 'productId must be a non-empty string' } as const;
  }

  if (!Number.isInteger(quantity) || (quantity as number) < 0) {
    return { error: 'quantity must be an integer greater than or equal to 0' } as const;
  }

  return { productId: productId.trim(), quantity: quantity as number } as const;
}

async function parseRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const authorization = await authorizeApiStoreRequest(['OWNER', 'MANAGER', 'CASHIER']);
  if (authorization instanceof NextResponse) return authorization;

  try {
    const inventory = await prisma.inventory.findMany({
      where: {
        storeId: authorization.store.id,
        product: { storeProducts: { some: { storeId: authorization.store.id, active: true } } },
      },
      select: inventorySelect,
      orderBy: { product: { name: 'asc' } },
    });

    return NextResponse.json(inventory);
  } catch {
    return NextResponse.json(
      { error: 'Unable to fetch inventory' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiStoreRequest(['OWNER', 'MANAGER']);
  if (authorization instanceof NextResponse) return authorization;

  const input = getInventoryInput(await parseRequestBody(request));

  if ('error' in input) {
    return NextResponse.json(input, { status: 400 });
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: input.productId,
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

    const existingInventory = await prisma.inventory.findUnique({
      where: {
        storeId_productId: {
          storeId: authorization.store.id,
          productId: product.id,
        },
      },
      select: { id: true },
    });

    if (existingInventory) {
      return NextResponse.json(
        { error: 'Inventory already exists for this product and store' },
        { status: 409 },
      );
    }

    const inventory = await prisma.inventory.create({
      data: {
        storeId: authorization.store.id,
        productId: product.id,
        quantity: input.quantity,
      },
      select: inventorySelect,
    });

    return NextResponse.json(inventory, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Inventory already exists for this product and store' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to create inventory' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const authorization = await authorizeApiStoreRequest(['OWNER', 'MANAGER']);
  if (authorization instanceof NextResponse) return authorization;

  const input = getInventoryInput(await parseRequestBody(request));

  if ('error' in input) {
    return NextResponse.json(input, { status: 400 });
  }

  try {
    const existingInventory = await prisma.inventory.findUnique({
      where: {
        storeId_productId: {
          storeId: authorization.store.id,
          productId: input.productId,
        },
      },
      select: { id: true },
    });

    if (!existingInventory) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 },
      );
    }

    const inventory = await prisma.inventory.update({
      where: { id: existingInventory.id },
      data: { quantity: input.quantity },
      select: inventorySelect,
    });

    return NextResponse.json(inventory);
  } catch {
    return NextResponse.json(
      { error: 'Unable to update inventory' },
      { status: 500 },
    );
  }
}