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

const productSelect = {
  id: true,
  barcode: true,
  name: true,
  categoryId: true,
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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeApiRequest(['OWNER', 'MANAGER']);
  if (authorization instanceof NextResponse) return authorization;

  const { id } = await context.params;
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
  const barcode = input.barcode;
  const name = input.name;
  const categoryId = input.categoryId;
  const price = input.price;
  const vatRate = input.vatRate;
  const unit = input.unit;
  const imageUrl = input.imageUrl;

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
  if (imageUrl !== null && imageUrl !== undefined && typeof imageUrl !== 'string') {
    return NextResponse.json(
      { error: 'imageUrl must be a string or null' },
      { status: 400 },
    );
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId.trim() },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 },
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        barcode: barcode.trim(),
        name: name.trim(),
        categoryId: category.id,
        price,
        vatRate,
        unit,
        ...(imageUrl === undefined
          ? {}
          : { imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null }),
      },
      select: productSelect,
    });

    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Product barcode already exists' },
          { status: 400 },
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      { error: 'Unable to update product' },
      { status: 500 },
    );
  }
}