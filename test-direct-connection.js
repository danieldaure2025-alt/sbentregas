const { PrismaClient } = require('@prisma/client');

async function testDirectConnection() {
    // Test with DIRECT_URL instead of pooled connection
    const directUrl = process.env.DIRECT_URL;

    if (!directUrl) {
        console.error('❌ DIRECT_URL not found in environment');
        process.exit(1);
    }

    console.log('🔍 Testing DIRECT database connection...');
    console.log('📍 Using DIRECT_URL (port 5432)');

    const prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
            db: {
                url: directUrl,
            },
        },
    });

    try {
        console.log('\n⏳ Attempting connection...');

        const userCount = await prisma.user.count();
        console.log(`✅ SUCCESS! Total users: ${userCount}`);

        const sampleUser = await prisma.user.findFirst({
            select: {
                email: true,
                name: true,
                role: true,
                status: true,
            },
        });

        if (sampleUser) {
            console.log('\n✅ Sample user:');
            console.log('  -', sampleUser.email, `(${sampleUser.role})`);
        }

        console.log('\n✅ DIRECT CONNECTION WORKS!');
        console.log('\n💡 Solution: Use DIRECT_URL for local development');
        console.log('   Keep DATABASE_URL with pooler for production (Vercel)');

    } catch (error) {
        console.error('\n❌ DIRECT CONNECTION ALSO FAILED!');
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testDirectConnection();
