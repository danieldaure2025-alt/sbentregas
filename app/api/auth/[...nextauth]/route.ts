import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Dynamically set NEXTAUTH_URL for Vercel deployments if not explicitly configured
if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
