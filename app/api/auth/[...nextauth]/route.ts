import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Ensure NEXTAUTH_URL is set correctly for all environments
// This is critical for the Android APK which always accesses via the main domain
if (!process.env.NEXTAUTH_URL) {
  if (process.env.VERCEL_URL) {
    // Use the stable Vercel domain, not the deployment-specific URL
    process.env.NEXTAUTH_URL = `https://sbentregas-i17m.vercel.app`;
  } else {
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
