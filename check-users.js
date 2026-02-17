const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
    try {
        console.log('🔍 Verificando usuários no banco...\n');

        // Count users by role
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        const clientCount = await prisma.user.count({ where: { role: 'CLIENT' } });
        const deliveryCount = await prisma.user.count({ where: { role: 'DELIVERY_PERSON' } });
        const establishmentCount = await prisma.user.count({ where: { role: 'ESTABLISHMENT' } });

        console.log('📊 Usuários por role:');
        console.log(`  - ADMIN: ${adminCount}`);
        console.log(`  - CLIENT: ${clientCount}`);
        console.log(`  - DELIVERY_PERSON: ${deliveryCount}`);
        console.log(`  - ESTABLISHMENT: ${establishmentCount}`);
        console.log('');

        // List all users
        const allUsers = await prisma.user.findMany({
            select: {
                email: true,
                name: true,
                role: true,
                status: true,
            },
        });

        console.log('👥 Todos os usuários:');
        allUsers.forEach(user => {
            console.log(`  - ${user.email} | ${user.name} | ${user.role} | ${user.status}`);
        });
        console.log('');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();
