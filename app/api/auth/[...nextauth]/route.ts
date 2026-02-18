import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Ensure NEXTAUTH_URL is set correctly for all environments
// Use VERCEL_URL for dynamic deployment URLs
if (!process.env.NEXTAUTH_URL) {
  if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
  } else {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
