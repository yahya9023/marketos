import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

export const userRoles = ['OWNER', 'MANAGER', 'CASHIER'] as const;
export type UserRole = (typeof userRoles)[number];

function isUserRole(role: string): role is UserRole {
  return userRoles.includes(role as UserRole);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Employee credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) return null;

        const employee = await prisma.employee.findFirst({
          where: {
            email: { equals: email, mode: 'insensitive' },
            active: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            storeId: true,
            passwordHash: true,
          },
        });

        if (
          !employee ||
          !isUserRole(employee.role) ||
          !verifyPassword(password, employee.passwordHash)
        ) {
          return null;
        }

        return {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          storeId: employee.storeId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.employeeId = user.id;
        token.role = user.role;
        token.storeId = user.storeId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.employeeId && token.role && token.storeId) {
        session.user.id = token.employeeId;
        session.user.role = token.role;
        session.user.storeId = token.storeId;
      }

      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

export async function getCurrentEmployee() {
  const session = await getServerSession(authOptions);
  const employeeId = session?.user?.id;

  if (!employeeId) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      storeId: true,
      active: true,
    },
  });

  if (!employee || !employee.active || !isUserRole(employee.role)) {
    return null;
  }

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    storeId: employee.storeId,
  };
}