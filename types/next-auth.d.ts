import { DefaultSession } from 'next-auth';
import { UserRole } from '@/lib/auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      storeId: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
    storeId: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    employeeId?: string;
    role?: UserRole;
    storeId?: string;
  }
}