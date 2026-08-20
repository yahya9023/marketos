'use server';

import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/authorization';

const maxFileSize = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(['OWNER', 'MANAGER']);
  if (authorization instanceof NextResponse) return authorization;

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'An image file is required' },
      { status: 400 },
    );
  }

  const extension = allowedTypes.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: 'Only JPG, PNG, WebP, and GIF images are supported' },
      { status: 400 },
    );
  }

  if (file.size === 0 || file.size > maxFileSize) {
    return NextResponse.json(
      { error: 'Image must be between 1 byte and 5 MB' },
      { status: 400 },
    );
  }

  const uploadDirectory = path.join(
    process.cwd(),
    'public',
    'uploads',
    'products',
  );
  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(uploadDirectory, filename);

  try {
    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

    return NextResponse.json(
      { imageUrl: `/uploads/products/${filename}` },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/uploads/product-image error:', error);
    return NextResponse.json(
      { error: 'Unable to upload image' },
      { status: 500 },
    );
  }
}
