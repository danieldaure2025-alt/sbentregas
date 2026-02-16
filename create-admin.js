const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
    try {
        console.log('Criando usuário admin...');

        const password = await bcrypt.hash('admin123', 10);

        const admin = await prisma.user.upsert({
            where: { email: 'admin@daure.com' },
            update: {},
            create: {
                email: 'admin@daure.com',
                passwordHash: password,
                name: 'Administrador',
                role: 'ADMIN',
                status: 'ACTIVE',
                phone: '(47) 99999-9999',
            },
        });

        console.log('✅ Usuário admin criado com sucesso!');
        console.log('');
        console.log('📧 Email: admin@daure.com');
        console.log('🔑 Senha: admin123');
        console.log('');

    } catch (error) {
        console.error('❌ Erro ao criar admin:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
