import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import jwt from 'jsonwebtoken';

export interface MobileUser {
    id: string;
    email: string;
    role: string;
    name: string;
}

/**
 * Get the authenticated user from either NextAuth session (web) or Bearer JWT (mobile).
 * This allows API routes to work with both web and mobile clients.
 */
export async function getAuthUser(req?: NextRequest): Promise<MobileUser | null> {
    // 1. Try NextAuth session first (web)
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        return {
            id: session.user.id,
            email: session.user.email || '',
            role: (session.user as any).role || 'CLIENT',
            name: session.user.name || '',
        };
    }

    // 2. Try Bearer token (mobile)
    if (req) {
        const authHeader = req.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const secret = process.env.NEXTAUTH_SECRET;

            if (!secret) {
                console.error('NEXTAUTH_SECRET not configured');
                return null;
            }

            try {
                const decoded = jwt.verify(token, secret) as MobileUser;
                return {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    name: decoded.name,
                };
            } catch (error) {
                console.error('Invalid mobile JWT token:', error);
                return null;
            }
        }
    }

    return null;
}
