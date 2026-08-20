import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { NextResponse } from 'next/server';
import { authorizeApiStoreRequest } from '@/lib/authorization';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function POST(request: Request) {
  const authorization = await authorizeApiStoreRequest(['OWNER', 'MANAGER']);
  if (authorization instanceof NextResponse) return authorization;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const productId = typeof body === 'object' && body !== null && 'productId' in body && typeof body.productId === 'string'
    ? body.productId.trim() : '';
  if (!productId) return NextResponse.json({ error: 'productId is required' }, { status: 400 });

  try {
    const assignment = await prisma.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({
        where: { id: productId, ownerId: authorization.store.ownerId, active: true },
        select: { id: true },
      });
      if (!product) throw new Error('Product not found');

      const assignment = await transaction.storeProduct.upsert({
        where: { storeId_productId: { storeId: authorization.store.id, productId } },
        update: { active: true },
        create: { storeId: authorization.store.id, productId, active: true },
      });
      await transaction.inventory.upsert({
        where: { storeId_productId: { storeId: authorization.store.id, productId } },
        update: {},
        create: { storeId: authorization.store.id, productId, quantity: 0 },
      });
      return assignment;
    });
    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Product or store not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to assign product' }, { status: 400 });
  }
}