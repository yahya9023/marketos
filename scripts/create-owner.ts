import 'dotenv/config';
import { hashPassword } from '../lib/password';
import { prisma } from '../lib/prisma';

const ownerRole = 'OWNER';

console.log('Starting owner creation...');

async function createOwner() {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length !== 3) {
    throw new Error('Usage: npx tsx scripts/create-owner.ts "owner name" "owner email" "owner password"');
  }

  const [nameArgument, emailArgument, password] = argumentsList;
  const name = nameArgument.trim();
  const email = emailArgument.trim().toLowerCase();

  if (!name) throw new Error('OWNER_NAME must not be empty');
  if (!email) throw new Error('OWNER_EMAIL must not be empty');
  if (!password) throw new Error('OWNER_PASSWORD must not be empty');

  const result = await prisma.$transaction(async (transaction) => {
    const store = await transaction.store.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!store) throw new Error('No store found.');

    console.log(`Store found: ${store.id}`);

    const existingEmployee = await transaction.employee.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
      select: { id: true },
    });

    if (existingEmployee) throw new Error(`Employee already exists: ${email}`);

    const employee = await transaction.employee.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: ownerRole,
        active: true,
        storeId: store.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        storeId: true,
        active: true,
      },
    });

    return { existing: false as const, employee };
  });

  console.log('OWNER CREATED');
  console.log(`employee id: ${result.employee.id}`);
  console.log(`email: ${result.employee.email}`);
  console.log(`role: ${result.employee.role}`);
  console.log(`active: ${result.employee.active}`);
  console.log(`storeId: ${result.employee.storeId}`);
}

async function main() {
  await createOwner();
}

function reportError(error: unknown) {
  const isError = error instanceof Error;
  const errorName = isError ? error.name : typeof error;
  const errorMessage = isError ? error.message : String(error);
  const errorStack = isError ? error.stack : 'N/A';

  console.error('ERROR NAME:', errorName);
  console.error('ERROR MESSAGE:', errorMessage);
  console.error('ERROR STACK:', errorStack ?? 'N/A');

  if (isError && error.name.startsWith('PrismaClient')) {
    const prismaError = error as Error & {
      code?: unknown;
      meta?: unknown;
      clientVersion?: unknown;
    };

    console.error('ERROR CODE:', prismaError.code ?? 'N/A');
    console.error('ERROR META:', prismaError.meta ?? 'N/A');
    console.error('ERROR CLIENT VERSION:', prismaError.clientVersion ?? 'N/A');
  }
}

main().catch((error: unknown) => {
  reportError(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());