# Database Connection Testing Script

## Issue Found

The database **IS working** and has 6 active users! ✅

The problem is that the local application cannot connect through the **connection pooler** at:
```
aws-0-us-west-2.pooler.supabase.com:6543
```

But the Supabase API (via MCP) can access the data fine, which confirms:
- ✅ Database is active and healthy
- ✅ Users exist with password hashes
- ✅ Credentials are valid
- ❌ Connection pooler URL might be incorrectly formatted or blocked

## Test Results

### Via Supabase MCP API ✅
- **User Count**: 6
- **Sample Users**:
  - admin@daure.com (ADMIN, ACTIVE)
  - entregador@teste.com (DELIVERY_PERSON, ACTIVE)
  - cliente@teste.com (CLIENT, ACTIVE)
- All users have `passwordHash` configured

### Via Local Prisma Connection ❌
```
Error: Can't reach database server at `aws-0-us-west-2.pooler.supabase.com:6543`
```

## Root Cause

The issue is likely one of:
1. **Connection pooler mode mismatch** - pgBouncer requires specific connection modes
2. **Local network/firewall blocking port 6543**
3. **Pooler URL format needs updating**

## Solutions

### Solution 1: Use Direct Connection for Local Dev
Update `.env.local` to use `DIRECT_URL` instead of pooled connection:
```env
DATABASE_URL="postgresql://postgres:oG6Jff6GvkoV5ldk@db.zxmimzwqqrykzionfikn.supabase.co:5432/postgres"
```

### Solution 2: Fix Pooler Mode
Ensure connection uses `session` mode instead of `transaction` mode:
```env
DATABASE_URL="postgresql://postgres.zxmimzwqqrykzionfikn:oG6Jff6GvkoV5ldk@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

### Solution 3: Get Fresh Connection Strings
Pull latest connection strings from Supabase dashboard.
