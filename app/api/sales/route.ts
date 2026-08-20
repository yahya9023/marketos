import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { NextResponse } from 'next/server';

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

type SaleInputItem = {
  productId: string;
  quantity: number;
};

class InsufficientInventoryError extends Error {
  constructor(
    public readonly productName: string,
    public readonly availableQuantity: number,
  ) {
    super('Insufficient inventory');
  }
}

const salesHistorySelect = {
  id: true,
  subtotal: true,
  vat: true,
  total: true,
  paymentMethod: true,
  status: true,
  createdAt: true,
  items: {
    select: {
      quantity: true,
      unitPrice: true,
      total: true,
      product: {
        select: {
          name: true,
        },
      },
    },
  },
} as const;

export async function GET() {
  try {
    const store = await prisma.store.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 },
      );
    }

    const sales = await prisma.sale.findMany({
      where: {
        storeId: store.id,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      select: salesHistorySelect,
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('GET /api/sales error:', error);
    return NextResponse.json(
      { error: 'Unable to fetch sales' },
      { status: 500 },
    );
  }
}

function parseSaleItems(items: unknown) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'items must be a non-empty array' } as const;
  }

  const parsedItems: SaleInputItem[] = [];

  for (const item of items) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { error: 'Each item must be a JSON object' } as const;
    }

    const input = item as Record<string, unknown>;
    const productId = input.productId;
    const quantity = input.quantity;

    if (typeof productId !== 'string' || !productId.trim()) {
      return { error: 'Each item requires a valid productId' } as const;
    }

    if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
      return {
        error: 'Each item quantity must be a positive integer',
      } as const;
    }

    parsedItems.push({
      productId: productId.trim(),
      quantity: quantity as number,
    });
  }

  return { items: parsedItems } as const;
}

export async function POST(request: Request) {
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
  const parsedItems = parseSaleItems(input.items);

  if ('error' in parsedItems) {
    return NextResponse.json(parsedItems, { status: 400 });
  }

  const paymentMethod = input.paymentMethod;
  if (paymentMethod !== 'CASH' && paymentMethod !== 'CARD') {
    return NextResponse.json(
      { error: 'paymentMethod must be CASH or CARD' },
      { status: 400 },
    );
  }

  try {
    const store = await prisma.store.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: 'No store found' },
        { status: 404 },
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { storeId: store.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'No employee found for the current store' },
        { status: 404 },
      );
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: parsedItems.items.map((item) => item.productId) },
        active: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        vatRate: true,
        inventory: {
          where: { storeId: store.id },
          select: { quantity: true },
        },
      },
    });

    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    const missingProduct = parsedItems.items.find(
      (item) => !productsById.has(item.productId),
    );

    if (missingProduct) {
      return NextResponse.json(
        { error: `Active product not found: ${missingProduct.productId}` },
        { status: 404 },
      );
    }

    const requestedQuantities = new Map<string, number>();
    for (const item of parsedItems.items) {
      requestedQuantities.set(
        item.productId,
        (requestedQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    for (const [productId, requestedQuantity] of requestedQuantities) {
      const product = productsById.get(productId);
      if (!product) {
        continue;
      }

      const availableQuantity = product.inventory[0]?.quantity ?? 0;
      if (availableQuantity < requestedQuantity) {
        return NextResponse.json(
          {
            error: `Insufficient inventory for ${product.name}`,
            productName: product.name,
            availableQuantity,
          },
          { status: 400 },
        );
      }
    }

    const calculatedItems = parsedItems.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new Error('Product lookup failed');
      }

      const lineSubtotal = Number(product.price) * item.quantity;
      const lineVat = lineSubtotal * (Number(product.vatRate) / 100);

      return {
        product,
        quantity: item.quantity,
        lineSubtotal,
        lineVat,
        lineTotal: lineSubtotal + lineVat,
      };
    });

    const subtotal = calculatedItems.reduce(
      (total, item) => total + item.lineSubtotal,
      0,
    );
    const vat = calculatedItems.reduce(
      (total, item) => total + item.lineVat,
      0,
    );
    const total = subtotal + vat;

    const sale = await prisma.$transaction(async (transaction) => {
      const createdSale = await transaction.sale.create({
        data: {
          storeId: store.id,
          employeeId: employee.id,
          subtotal,
          vat,
          total,
          paymentMethod,
          status: 'COMPLETED',
          items: {
            create: calculatedItems.map((item) => ({
              productId: item.product.id,
              quantity: item.quantity,
              unitPrice: item.product.price,
              total: item.lineTotal,
            })),
          },
        },
        select: {
          id: true,
          status: true,
          paymentMethod: true,
          subtotal: true,
          vat: true,
          total: true,
          createdAt: true,
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              total: true,
              product: { select: { name: true } },
            },
          },
        },
      });

      for (const [productId, requestedQuantity] of requestedQuantities) {
        const inventoryUpdate = await transaction.inventory.updateMany({
          where: {
            storeId: store.id,
            productId,
            quantity: { gte: requestedQuantity },
          },
          data: { quantity: { decrement: requestedQuantity } },
        });

        if (inventoryUpdate.count !== 1) {
          const product = productsById.get(productId);
          throw new InsufficientInventoryError(
            product?.name ?? productId,
            0,
          );
        }

        await transaction.stockMovement.create({
          data: {
            productId,
            storeId: store.id,
            quantity: -requestedQuantity,
            type: 'OUT',
            reason: `Sale ${createdSale.id}`,
          },
        });
      }

      return createdSale;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    console.error('POST /api/sales error:', error);

    if (error instanceof InsufficientInventoryError) {
      return NextResponse.json(
        {
          error: `Insufficient inventory for ${error.productName}`,
          productName: error.productName,
          availableQuantity: error.availableQuantity,
        },
        { status: 400 },
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Unable to create sale' },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Unable to create sale' },
      { status: 500 },
    );
  }
}