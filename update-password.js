const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function updatePassword() {
    try {
        console.log('Atualizando senha...');

        const password = await bcrypt.hash('Salmo91.', 10);

        await prisma.user.update({
            where: { email: 'danieldaure2025@gmail.com' },
            data: {
                passwordHash: password,
            },
        });

        console.log('✅ Senha atualizada com sucesso!');
        console.log('');
        console.log('📧 Email: danieldaure2025@gmail.com');
        console.log('🔑 Nova senha: Salmo91.');
        console.log('');

    } catch (error) {
        console.error('❌ Erro ao atualizar senha:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

updatePassword();
