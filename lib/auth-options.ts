import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder-google-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder-google-client-secret',
      allowDangerousEmailAccountLinking: true,
    }),
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

          if (user?.status === 'PENDING_APPROVAL' && user?.role === 'DELIVERY_PERSON') {
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
            if (existingUser?.status === 'PENDING_APPROVAL' && existingUser?.role === 'DELIVERY_PERSON') {
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
        if (user) {
          token.id = user.id;
          token.role = (user as any)?.role || UserRole.CLIENT;
          token.status = (user as any)?.status || 'ACTIVE';
        }

        // Fetch fresh data on each request
        if (token?.email) {
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
