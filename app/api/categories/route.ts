import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
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

export async function GET(request: Request) {
  const authorization = await authorizeApiRequest(['OWNER', 'MANAGER', 'CASHIER']);
  if (authorization instanceof NextResponse) return authorization;

  try {
    const includeInactive = new URL(request.url).searchParams.get('includeInactive') === 'true';
    const categories = await prisma.category.findMany({
      ...(includeInactive && authorization.role === 'OWNER' ? {} : { where: { active: true } }),
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch {
    return NextResponse.json(
      { error: 'Unable to fetch categories' },
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

  const name =
    typeof body === 'object' && body !== null && 'name' in body
      ? body.name
      : undefined;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json(
      { error: 'name must be a non-empty string' },
      { status: 400 },
    );
  }

  const trimmedName = name.trim();

  try {
    const existingCategory = await prisma.category.findFirst({
      where: { name: trimmedName },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: { name: trimmedName },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to create category' },
      { status: 500 },
    );
  }
}