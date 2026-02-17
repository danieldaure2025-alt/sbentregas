const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUsers() {
    try {
        console.log('Criando usuários de teste...\n');

        const password = await bcrypt.hash('Salmo91.', 10);

        // Create DELIVERY_PERSON user
        const delivery = await prisma.user.upsert({
            where: { email: 'entregador@teste.com' },
            update: {
                passwordHash: password,
                status: 'ACTIVE',
            },
            create: {
                email: 'entregador@teste.com',
                passwordHash: password,
                name: 'Entregador Teste',
                role: 'DELIVERY_PERSON',
                status: 'ACTIVE',
                phone: '(47) 98888-8888',
            },
        });

        console.log('✅ Entregador criado:');
        console.log('   📧 Email: entregador@teste.com');
        console.log('   🔑 Senha: Salmo91.');
        console.log('   👤 Role: DELIVERY_PERSON');
        console.log('');

        // Create CLIENT user
        const client = await prisma.user.upsert({
            where: { email: 'cliente@teste.com' },
            update: {
                passwordHash: password,
                status: 'ACTIVE',
            },
            create: {
                email: 'cliente@teste.com',
                passwordHash: password,
                name: 'Cliente Teste',
                role: 'CLIENT',
                status: 'ACTIVE',
                phone: '(47) 97777-7777',
            },
        });

        console.log('✅ Cliente criado:');
        console.log('   📧 Email: cliente@teste.com');
        console.log('   🔑 Senha: Salmo91.');
        console.log('   👤 Role: CLIENT');
        console.log('');

        // Create ESTABLISHMENT user
        const establishment = await prisma.user.upsert({
            where: { email: 'estabelecimento@teste.com' },
            update: {
                passwordHash: password,
                status: 'ACTIVE',
            },
            create: {
                email: 'estabelecimento@teste.com',
                passwordHash: password,
                name: 'Estabelecimento Teste',
                role: 'ESTABLISHMENT',
                status: 'ACTIVE',
                phone: '(47) 96666-6666',
            },
        });

        console.log('✅ Estabelecimento criado:');
        console.log('   📧 Email: estabelecimento@teste.com');
        console.log('   🔑 Senha: Salmo91.');
        console.log('   👤 Role: ESTABLISHMENT');
        console.log('');

        console.log('🎉 Todos os usuários de teste foram criados!');

    } catch (error) {
        console.error('❌ Erro ao criar usuários:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

createTestUsers();
