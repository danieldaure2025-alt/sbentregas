import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// Dynamically detect the correct NEXTAUTH_URL based on the request host header.
// This ensures authentication works correctly on ANY domain:
// - Custom domains (saobentoentregas.vercel.app)
// - Vercel deployment URLs (sbentregas-i17m-xxx.vercel.app)
// - Preview deployments
// - localhost during development
function setNextAuthUrl(req: Request) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';

  if (host) {
    // Use the actual host from the request — this is the domain the user accessed
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  } else if (!process.env.NEXTAUTH_URL) {
    // Fallback: use VERCEL_URL or localhost
    if (process.env.VERCEL_URL) {
      process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
    } else {
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
    }
  }
}

const nextAuthHandler = NextAuth(authOptions);

async function handler(req: Request, context: any) {
  setNextAuthUrl(req);
  return nextAuthHandler(req, context);
}

export { handler as GET, handler as POST };
