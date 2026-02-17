const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createCustomUser() {
    try {
        console.log('Criando usuário personalizado...');

        const password = await bcrypt.hash('admin123', 10);

        const user = await prisma.user.upsert({
            where: { email: 'danieldaure2025@gmail.com' },
            update: {
                passwordHash: password,
                status: 'ACTIVE',
            },
            create: {
                email: 'danieldaure2025@gmail.com',
                passwordHash: password,
                name: 'Daniel Daure',
                role: 'ADMIN',
                status: 'ACTIVE',
                phone: '(47) 99999-9999',
            },
        });

        console.log('✅ Usuário criado/atualizado com sucesso!');
        console.log('');
        console.log('📧 Email: danieldaure2025@gmail.com');
        console.log('🔑 Senha: admin123');
        console.log('');

    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createCustomUser();
