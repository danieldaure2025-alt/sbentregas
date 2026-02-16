import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// import GoogleProvider from 'next-auth/providers/google'; // Disabled - configure credentials to enable
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  providers: [
    // Google OAuth temporarily disabled - configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID || '',
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    //   allowDangerousEmailAccountLinking: true,
    // }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTH] Credenciais incompletas');
            return null;
          }

          console.log('[AUTH] Tentando autenticar:', credentials.email);

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user?.passwordHash) {
            console.log('[AUTH] Usuário não encontrado ou sem senha:', credentials.email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          if (!isPasswordValid) {
            console.log('[AUTH] Senha inválida para:', credentials.email);
            return null;
          }

          if (user?.status === 'BLOCKED') {
            console.log('[AUTH] Conta bloqueada:', credentials.email);
            return null;
          }

          if (user?.status === 'PENDING_APPROVAL' && (user?.role === 'DELIVERY_PERSON' || user?.role === 'ESTABLISHMENT')) {
            console.log('[AUTH] Conta aguardando aprovação:', credentials.email);
            return null;
          }

          console.log('[AUTH] Autenticação bem-sucedida:', credentials.email);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            image: user.image,
          };
        } catch (error) {
          console.error('[AUTH ERROR] Erro durante autenticação:', error);
          console.error('[AUTH ERROR] Email tentado:', credentials?.email);

          // Log detailed Prisma errors
          if (error && typeof error === 'object') {
            console.error('[AUTH ERROR] Error details:', {
              name: (error as any).name,
              message: (error as any).message,
              code: (error as any).code,
              meta: (error as any).meta,
            });
          }

          // Always return null on error to prevent security leaks
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          console.log('[SIGNIN] Google login attempt:', user?.email);

          const existingUser = await prisma.user.findUnique({
            where: { email: user?.email ?? '' },
          });

          if (existingUser) {
            if (existingUser?.status === 'BLOCKED') {
              console.log('[SIGNIN] Account blocked:', user?.email);
              return '/auth/error?error=AccountBlocked';
            }
            if (existingUser?.status === 'PENDING_APPROVAL' && (existingUser?.role === 'DELIVERY_PERSON' || existingUser?.role === 'ESTABLISHMENT')) {
              console.log('[SIGNIN] Account pending approval:', user?.email);
              return '/auth/error?error=PendingApproval';
            }
            // Update googleId if not set
            if (!existingUser?.googleId) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { googleId: account.providerAccountId },
              });
              console.log('[SIGNIN] Updated googleId for:', user?.email);
            }
          }
          console.log('[SIGNIN] Google login successful:', user?.email);
          return true;
        } catch (error) {
          console.error('[SIGNIN ERROR] Error during Google sign in:', error);
          return false;
        }
      }
      console.log('[SIGNIN] Credentials login successful');
      return true;
    },
    async jwt({ token, user, account }) {
      try {
        // Initial sign in - set user data
        if (user) {
          token.id = user.id;
          token.role = (user as any)?.role || UserRole.CLIENT;
          token.status = (user as any)?.status || 'ACTIVE';
          token.lastRefresh = Date.now();
        }

        // Refresh user data only if token is older than 5 minutes
        // This reduces DB queries by ~95% and prevents connection pool exhaustion
        const shouldRefresh = !token.lastRefresh || (Date.now() - (token.lastRefresh as number)) > 5 * 60 * 1000;

        if (shouldRefresh && token?.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: token.email },
              select: { id: true, role: true, status: true, name: true, email: true, image: true },
            });

            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role;
              token.status = dbUser.status;
              token.name = dbUser.name;
              token.picture = dbUser.image;
              token.lastRefresh = Date.now();
            }
          } catch (dbError) {
            console.error('[JWT ERROR] Erro ao buscar dados do usuário (usando cache):', dbError);
            // Return cached token data on DB error
          }
        }

        return token;
      } catch (error) {
        console.error('[JWT ERROR] Erro ao processar JWT:', error);
        console.error('[JWT ERROR] Email:', token?.email);
        return token;
      }
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.status = token.status as string;
      }
      return session;
    },
  },
};
