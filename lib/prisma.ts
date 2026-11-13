import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

function limitPrismaConnections(connectionString: string) {
  const url = new URL(connectionString)
  const configuredLimit = Number(url.searchParams.get('connection_limit'))

  if (!Number.isInteger(configuredLimit) || configuredLimit < 1 || configuredLimit > 3) {
    url.searchParams.set('connection_limit', '3')
  }

  return url.toString()
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  const caPath = process.env.SUPABASE_DB_CA

  if (!connectionString) throw new Error('DATABASE_URL is required to connect to Supabase.')
  if (!caPath) {
    if (process.env.NODE_ENV === 'production') {
      return new PrismaClient({
        datasources: { db: { url: limitPrismaConnections(connectionString) } },
      })
    }
    throw new Error('Set SUPABASE_DB_CA to the Supabase database CA certificate path to use the verified Windows PostgreSQL adapter.')
  }

  const pool = new Pool({
    connectionString,
    // Supabase's session pool limit is shared across Next.js worker processes.
    max: 3,
    idleTimeoutMillis: 5_000,
    ssl: {
      ca: readFileSync(path.resolve(process.cwd(), caPath), 'utf8'),
      rejectUnauthorized: true,
    },
  })

  return new PrismaClient({ adapter: new PrismaPg(pool) })
}

export const prisma = global.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma
