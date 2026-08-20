import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/authorization';
import { currentStoreCookie, getAccessibleStores } from '@/lib/stores';

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(['OWNER']);
  if (authorization instanceof NextResponse) return authorization;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }

  const storeId =
    typeof body === 'object' && body !== null && 'storeId' in body &&
    typeof body.storeId === 'string'
      ? body.storeId
      : '';
  const stores = await getAccessibleStores(authorization);
  if (!stores.some((store) => store.id === storeId)) {
    return NextResponse.json({ error: 'Store is not accessible' }, { status: 403 });
  }

  const response = NextResponse.json({ storeId });
  response.cookies.set(currentStoreCookie, storeId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return response;
}