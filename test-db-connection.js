const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
})

async function testConnection() {
    try {
        console.log('🔍 Testando conexão com banco de dados...\n')

        // Test 1: Basic connection
        console.log('Test 1: Contando usuários...')
        const userCount = await prisma.user.count()
        console.log('✅ Conexão OK! Total de usuários:', userCount)
        console.log('')

        // Test 2: Find specific user
        console.log('Test 2: Buscando usuário específico...')
        const user = await prisma.user.findUnique({
            where: { email: 'danieldaure2025@gmail.com' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
            }
        })

        if (user) {
            console.log('✅ Usuário encontrado:')
            console.log('   - Nome:', user.name)
            console.log('   - Email:', user.email)
            console.log('   - Role:', user.role)
            console.log('   - Status:', user.status)
        } else {
            console.log('⚠️  Usuário não encontrado')
        }
        console.log('')

        // Test 3: Count by role
        console.log('Test 3: Contando usuários por role...')
        const roles = await prisma.user.groupBy({
            by: ['role'],
            _count: true,
        })
        console.log('✅ Usuários por role:')
        roles.forEach(r => {
            console.log(`   - ${r.role}: ${r._count}`)
        })
        console.log('')

        // Test 4: Recent orders
        console.log('Test 4: Buscando pedidos recentes...')
        const orderCount = await prisma.order.count()
        console.log('✅ Total de pedidos:', orderCount)
        console.log('')

        console.log('🎉 Todos os testes passaram com sucesso!')
        console.log('✅ Prepared statements fix está funcionando corretamente')

    } catch (error) {
        console.error('\n❌ ERRO NA CONEXÃO:\n')
        console.error('Mensagem:', error.message)
        console.error('Código:', error.code)

        if (error.code === 'P2024') {
            console.error('\n💡 Este erro indica problema de connection pooling.')
            console.error('   Verifique se statement_cache_size=0 está configurado.')
        } else if (error.message.includes('prepared statement')) {
            console.error('\n💡 Este é o erro de prepared statement!')
            console.error('   A correção do lib/db.ts deve resolver isso.')
        }

        console.error('\nDetalhes completos:', error)
    } finally {
        await prisma.$disconnect()
        console.log('\n🔌 Desconectado do banco de dados')
    }
}

testConnection()
