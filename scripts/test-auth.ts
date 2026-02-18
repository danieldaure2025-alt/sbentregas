// Test authentication directly
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testAuth() {
    console.log('Testing authentication...\n');

    const testEmail = 'admin@daureexpress.com';
    const testPassword = 'senha123';

    console.log(`Attempting login with:`);
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}\n`);

    // Find user
    const user = await prisma.user.findUnique({
        where: { email: testEmail }
    });

    if (!user) {
        console.log('❌ User not found!');
        await prisma.$disconnect();
        return;
    }

    console.log('✓ User found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Status: ${user.status}`);
    console.log(`  Has password: ${user.passwordHash ? 'Yes' : 'No'}`);

    if (!user.passwordHash) {
        console.log('\n❌ User has no password hash!');
        await prisma.$disconnect();
        return;
    }

    console.log(`  Password hash: ${user.passwordHash.substring(0, 30)}...\n`);

    // Test password
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);

    if (isValid) {
        console.log('✅ Password is CORRECT!');
        console.log('\n🎉 Authentication should work!');
    } else {
        console.log('❌ Password is INCORRECT!');
        console.log('\n⚠️  There is a problem with the password hash.');
    }

    await prisma.$disconnect();
}

testAuth().catch(console.error);
