import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Safely construct DATABASE_URL with connection pooling parameters
function getDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL

  if (!baseUrl) {
    throw new Error('DATABASE_URL is not defined')
  }

  // CRITICAL FIX: Disable prepared statements for pgBouncer compatibility
  // Error "prepared statement 's0' already exists" occurs when using pgBouncer
  // in transaction mode with prepared statements enabled

  // Check if URL already has query parameters
  const separator = baseUrl.includes('?') ? '&' : '?'

  let url = baseUrl

  // For Vercel serverless: strict pgBouncer configuration
  if (!url.includes('pgbouncer=')) {
    url += `${separator}pgbouncer=true`
  }

  // CRITICAL: Disable prepared statements to fix "42P05" error
  if (!url.includes('statement_cache_size=')) {
    url += url.includes('?') ? '&' : '?'
    url += 'statement_cache_size=0'
  }

  // Connection pool configuration optimized for Vercel serverless
  const connectionLimit = process.env.VERCEL ? 1 : 5
  const poolTimeout = process.env.VERCEL ? 10 : 30

  if (!url.includes('connection_limit=')) {
    url += `&connection_limit=${connectionLimit}`
  }

  if (!url.includes('pool_timeout=')) {
    url += `&pool_timeout=${poolTimeout}`
  }

  return url
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}
