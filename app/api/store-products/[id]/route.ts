import { NextResponse } from 'next/server';
import { authorizeApiStoreRequest } from '@/lib/authorization';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authorization = await authorizeApiStoreRequest(['OWNER', 'MANAGER']);
  if (authorization instanceof NextResponse) return authorization;
  const { id } = await context.params;

  const assignment = await prisma.storeProduct.findFirst({
    where: { id, storeId: authorization.store.id, product: { ownerId: authorization.store.ownerId } },
    select: { id: true },
  });
  if (!assignment) return NextResponse.json({ error: 'Product assignment not found' }, { status: 404 });

  await prisma.storeProduct.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ id, active: false });
}