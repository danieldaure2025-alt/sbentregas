// Script para criar usuários de teste
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('teste123', 10);

    console.log('Criando usuários de teste...\n');

    // 1. Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@teste.com' },
        update: {},
        create: {
            email: 'admin@teste.com',
            name: 'Administrador Teste',
            passwordHash: hashedPassword,
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });
    console.log('✅ Admin criado:', admin.email);

    // 2. Cliente Normal
    const clientNormal = await prisma.user.upsert({
        where: { email: 'cliente@teste.com' },
        update: {},
        create: {
            email: 'cliente@teste.com',
            name: 'Cliente Normal Teste',
            passwordHash: hashedPassword,
            role: 'CLIENT',
            clientType: 'NORMAL',
            status: 'ACTIVE',
        },
    });
    console.log('✅ Cliente Normal criado:', clientNormal.email);

    // 3. Cliente DELIVERY (Estabelecimento)
    const clientDelivery = await prisma.user.upsert({
        where: { email: 'restaurante@teste.com' },
        update: {
            clientType: 'DELIVERY',
            clientAddress: 'Rua das Flores, 123 - Centro - São Paulo/SP',
        },
        create: {
            email: 'restaurante@teste.com',
            name: 'Restaurante Teste',
            passwordHash: hashedPassword,
            role: 'CLIENT',
            clientType: 'DELIVERY',
            clientAddress: 'Rua das Flores, 123 - Centro - São Paulo/SP',
            status: 'ACTIVE',
        },
    });
    console.log('✅ Cliente DELIVERY criado:', clientDelivery.email);
    console.log('   Endereço:', clientDelivery.clientAddress);

    // 4. Entregador
    const deliveryPerson = await prisma.user.upsert({
        where: { email: 'entregador@teste.com' },
        update: {
            licenseNumber: 'ABC-1234',
            phone: '(11) 99999-9999',
        },
        create: {
            email: 'entregador@teste.com',
            name: 'Entregador Teste',
            passwordHash: hashedPassword,
            role: 'DELIVERY_PERSON',
            vehicleType: 'MOTORCYCLE',
            licenseNumber: 'ABC-1234',
            phone: '(11) 99999-9999',
            deliveryStatus: 'OFFLINE',
            status: 'ACTIVE',
        },
    });
    console.log('✅ Entregador criado:', deliveryPerson.email);
    console.log('   Placa:', deliveryPerson.licenseNumber);

    console.log('\n📋 CREDENCIAIS DE TESTE (todas com senha: teste123)');
    console.log('═══════════════════════════════════════════════════');
    console.log('1. Admin:              admin@teste.com');
    console.log('2. Cliente Normal:     cliente@teste.com');
    console.log('3. Cliente DELIVERY:   restaurante@teste.com');
    console.log('4. Entregador:         entregador@teste.com');
    console.log('═══════════════════════════════════════════════════\n');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
