// Script to update test user passwords with proper bcrypt hashes
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePasswords() {
    console.log('Updating test user passwords...');

    const password = 'senha123';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Generated hash:', hashedPassword);

    const userIds = [
        'user_admin_001',
        'user_client_001',
        'user_client_002',
        'user_delivery_001',
        'user_delivery_002',
        'user_estab_001'
    ];

    for (const userId of userIds) {
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword }
        });
        console.log(`✓ Updated password for ${userId}`);
    }

    console.log('\n✅ All passwords updated successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: admin@daureexpress.com (or any test user)');
    console.log('Password: senha123');

    await prisma.$disconnect();
}

updatePasswords().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
