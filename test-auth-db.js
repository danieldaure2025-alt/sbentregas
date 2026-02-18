const { PrismaClient } = require('@prisma/client');

async function testAuthDatabase() {
    const prisma = new PrismaClient({
        log: ['query', 'error', 'warn'],
    });

    try {
        console.log('🔍 Testing database connection...');

        // Test 1: Count users
        const userCount = await prisma.user.count();
        console.log(`✅ Total users in database: ${userCount}`);

        // Test 2: Get a sample user
        const sampleUser = await prisma.user.findFirst({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                passwordHash: true,
            },
        });

        if (sampleUser) {
            console.log('\n✅ Sample user found:');
            console.log('  - Email:', sampleUser.email);
            console.log('  - Name:', sampleUser.name);
            console.log('  - Role:', sampleUser.role);
            console.log('  - Status:', sampleUser.status);
            console.log('  - Has passwordHash:', !!sampleUser.passwordHash);
        } else {
            console.log('\n⚠️  No users found in database!');
        }

        // Test 3: Check for users with credentials (passwordHash)
        const usersWithPassword = await prisma.user.count({
            where: {
                passwordHash: {
                    not: null,
                },
            },
        });
        console.log(`\n✅ Users with password credentials: ${usersWithPassword}`);

        // Test 4: Check NextAuth tables
        const accountCount = await prisma.account.count();
        const sessionCount = await prisma.session.count();
        console.log(`\n✅ NextAuth accounts: ${accountCount}`);
        console.log(`✅ NextAuth sessions: ${sessionCount}`);

        console.log('\n✅ Database connection test SUCCESSFUL!');

    } catch (error) {
        console.error('\n❌ Database connection test FAILED!');
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testAuthDatabase();
