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

const productSelect = {
  id: true,
  barcode: true,
  name: true,
  categoryId: true,
  storeId: true,
  price: true,
  vatRate: true,
  unit: true,
  imageUrl: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const validUnits = new Set([
  'piece',
  'kg',
  'g',
  'L',
  'ml',
  'pack',
  'bottle',
]);

export async function GET(request: Request) {
  const authorization = await authorizeApiStoreRequest(['OWNER', 'MANAGER', 'CASHIER']);
  if (authorization instanceof NextResponse) return authorization;

  const barcode = new URL(request.url).searchParams.get('barcode');

  try {
    if (barcode) {
      const product = await prisma.product.findFirst({
        where: {
          barcode,
          storeId: authorization.store.id,
          active: true,
        },
        select: productSelect,
      });

      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 },
        );
      }

      return NextResponse.json(product);
    }

    const products = await prisma.product.findMany({
      where: { storeId: authorization.store.id, active: true },
      select: productSelect,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json(
      { error: 'Unable to fetch products' },
      { status: 500 },
    );
  }
}

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

  const product = body as Record<string, unknown>;
  const barcode = product.barcode;
  const name = product.name;
  const categoryId = product.categoryId;
  const price = product.price;
  const vatRate = product.vatRate;
  const unit = product.unit;
  const initialStock = product.initialStock ?? 0;
  const imageUrl =
    typeof product.imageUrl === 'string' && product.imageUrl.trim()
      ? product.imageUrl.trim()
      : null;

  if (typeof barcode !== 'string' || !barcode.trim()) {
    return NextResponse.json(
      { error: 'barcode must be a non-empty string' },
      { status: 400 },
    );
  }

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json(
      { error: 'name must be a non-empty string' },
      { status: 400 },
    );
  }

  if (typeof categoryId !== 'string' || !categoryId.trim()) {
    return NextResponse.json(
      { error: 'categoryId must be a non-empty string' },
      { status: 400 },
    );
  }

  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { error: 'price must be a positive number' },
      { status: 400 },
    );
  }

  if (
    typeof vatRate !== 'number' ||
    !Number.isFinite(vatRate) ||
    vatRate < 0
  ) {
    return NextResponse.json(
      { error: 'vatRate must be a non-negative number' },
      { status: 400 },
    );
  }

  if (typeof unit !== 'string' || !validUnits.has(unit)) {
    return NextResponse.json(
      { error: 'unit must be one of piece, kg, g, L, ml, pack, or bottle' },
      { status: 400 },
    );
  }

  if (!Number.isInteger(initialStock) || (initialStock as number) < 0) {
    return NextResponse.json(
      { error: 'initialStock must be an integer greater than or equal to 0' },
      { status: 400 },
    );
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId.trim() },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    const createdProduct = await prisma.$transaction(async (transaction) =>
      transaction.product.create({
        data: {
          barcode: barcode.trim(),
          name: name.trim(),
          categoryId: category.id,
          storeId: authorization.store.id,
          price,
          vatRate,
          unit: unit.trim(),
          imageUrl,
          active: true,
          inventory: {
            create: {
              store: { connect: { id: authorization.store.id } },
              quantity: initialStock as number,
            },
          },
        },
        select: productSelect,
      }),
    );

    return NextResponse.json(createdProduct, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Product barcode already exists in this store' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to create product' },
      { status: 500 },
    );
  }
}