import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/authorization';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeApiRequest(['OWNER']);
  if (authorization instanceof NextResponse) return authorization;
  const { id } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const active = input.active;
  if (!name) return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
  if (typeof active !== 'boolean') return NextResponse.json({ error: 'active must be true or false' }, { status: 400 });

  try {
    const duplicate = await prisma.category.findFirst({ where: { name, NOT: { id } }, select: { id: true } });
    if (duplicate) return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    const category = await prisma.category.update({ where: { id }, data: { name, active } });
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Unable to update category' }, { status: 500 });
  }
}