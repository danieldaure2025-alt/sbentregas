const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('🔍 Testing database connection...\n');

        // Test 1: Count users
        const userCount = await prisma.user.count();
        console.log('✅ Connection SUCCESS!');
        console.log('📊 Total users in database:', userCount);
        console.log('');

        // Test 2: Find specific user
        const user = await prisma.user.findFirst({
            where: { email: 'danieldaure2025@gmail.com' }
        });

        if (user) {
            console.log('✅ Test user found:');
            console.log('   - Name:', user.name);
            console.log('   - Email:', user.email);
            console.log('   - Role:', user.role);
            console.log('   - Status:', user.status);
            console.log('   - Has password:', user.passwordHash ? 'Yes' : 'No');
        } else {
            console.log('⚠️  User danieldaure2025@gmail.com not found');
        }
        console.log('');

        console.log('🎉 Database connection working perfectly!');
        console.log('✅ You can now try login at http://localhost:3000/auth/login');

    } catch (error) {
        console.error('\n❌ Connection FAILED:', error.message);
        console.error('Full error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
