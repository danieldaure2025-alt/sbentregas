import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
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
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user?.passwordHash) {
          throw new Error('Credenciais inválidas');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Credenciais inválidas');
        }

        if (user?.status === 'BLOCKED') {
          throw new Error('Sua conta foi bloqueada. Entre em contato com o suporte.');
        }

        if (user?.status === 'PENDING_APPROVAL' && user?.role === 'DELIVERY_PERSON') {
          throw new Error('Sua conta está aguardando aprovação do administrador.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user?.email ?? '' },
          });

          if (existingUser) {
            if (existingUser?.status === 'BLOCKED') {
              return '/auth/error?error=AccountBlocked';
            }
            if (existingUser?.status === 'PENDING_APPROVAL' && existingUser?.role === 'DELIVERY_PERSON') {
              return '/auth/error?error=PendingApproval';
            }
            // Update googleId if not set
            if (!existingUser?.googleId) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { googleId: account.providerAccountId },
              });
            }
          }
          return true;
        } catch (error) {
          console.error('Error during Google sign in:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
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
