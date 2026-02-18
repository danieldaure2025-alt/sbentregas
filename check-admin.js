const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkAdminUser() {
    const prisma = new PrismaClient();

    try {
        console.log('🔍 Checking for admin user...\n');

        // Check if admin@daure.com exists
        const adminUser = await prisma.user.findUnique({
            where: { email: 'admin@daure.com' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                passwordHash: true,
            },
        });

        if (adminUser) {
            console.log('✅ Admin user found:');
            console.log('  - Email:', adminUser.email);
            console.log('  - Name:', adminUser.name);
            console.log('  - Role:', adminUser.role);
            console.log('  - Status:', adminUser.status);
            console.log('  - Has passwordHash:', !!adminUser.passwordHash);

            // Test password
            if (adminUser.passwordHash) {
                const isValid = await bcrypt.compare('admin123', adminUser.passwordHash);
                console.log('  - Password "admin123" is valid:', isValid);
            }
        } else {
            console.log('❌ Admin user not found! Email: admin@daure.com');
            console.log('\nLet me check all users...\n');

            const allUsers = await prisma.user.findMany({
                select: {
                    email: true,
                    name: true,
                    role: true,
                    status: true,
                },
                orderBy: {
                    role: 'asc',
                },
            });

            console.log('All users in database:');
            allUsers.forEach((user, index) => {
                console.log(`${index + 1}. Email: ${user.email} | Name: ${user.name} | Role: ${user.role} | Status: ${user.status}`);
            });
        }

    } catch (error) {
        console.error('\n❌ Error checking admin user!');
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdminUser();
