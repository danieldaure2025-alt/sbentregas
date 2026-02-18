/**
 * Script de diagnóstico para testar o sistema de notificações
 * Execute com: node scripts/test-notifications.js
 */

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para fazer requisição HTTP
async function testAPI(endpoint, method = 'GET', body = null, sessionCookie = null) {
    const url = `http://localhost:3000${endpoint}`;
    console.log(`\n🔍 Testando: ${method} ${endpoint}`);

    const headers = {
        'Content-Type': 'application/json',
    };

    if (sessionCookie) {
        headers['Cookie'] = sessionCookie;
    }

    try {
        const options = {
            method,
            headers,
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        console.log(`\n📊 Status: ${response.status}`);

        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
            console.log('📦 Response:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log('📦 Response (text):', text.substring(0, 200));
        }

        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return { ok: false, error: error.message };
    }
}

// Teste 1: Verificar FCM tokens no banco
async function checkFCMTokens() {
    console.log('\n\n==================== TESTE 1: FCM Tokens ====================');

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
        const usersWithTokens = await prisma.user.count({
            where: {
                fcmToken: { not: null }
            }
        });

        const deliveryPersonsWithTokens = await prisma.user.count({
            where: {
                role: 'DELIVERY_PERSON',
                fcmToken: { not: null }
            }
        });

        const clientsWithTokens = await prisma.user.count({
            where: {
                role: 'CLIENT',
                fcmToken: { not: null }
            }
        });

        console.log(`✅ Total de usuários com FCM token: ${usersWithTokens}`);
        console.log(`✅ Entregadores com FCM token: ${deliveryPersonsWithTokens}`);
        console.log(`✅ Clientes com FCM token: ${clientsWithTokens}`);

        if (usersWithTokens === 0) {
            console.log('\n⚠️  NENHUM USUÁRIO TEM FCM TOKEN REGISTRADO!');
            console.log('   Isso significa que nenhuma notificação será enviada.');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar tokens:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Teste 2: Verificar Firebase Admin
async function checkFirebaseConfig() {
    console.log('\n\n==================== TESTE 2: Firebase Config ====================');

    const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;

    console.log(`FIREBASE_PROJECT_ID: ${hasProjectId ? '✅ Configurado' : '❌ NÃO configurado'}`);
    console.log(`FIREBASE_CLIENT_EMAIL: ${hasClientEmail ? '✅ Configurado' : '❌ NÃO configurado'}`);
    console.log(`FIREBASE_PRIVATE_KEY: ${hasPrivateKey ? '✅ Configurado' : '❌ NÃO configurado'}`);

    if (!hasProjectId || !hasClientEmail || !hasPrivateKey) {
        console.log('\n❌ CONFIGURAÇÃO DO FIREBASE INCOMPLETA!');
        return false;
    }

    return true;
}

// Teste 3: Tentar enviar notificação (requer autenticação)
async function testNotificationAPI() {
    console.log('\n\n==================== TESTE 3: API de Notificações ====================');
    console.log('⚠️  Este teste requer autenticação de ADMIN.');
    console.log('   Se você não tiver um cookie de sessão, este teste falhará com 401.');

    // Tentar sem autenticação primeiro
    await testAPI('/api/admin/announcements', 'GET');

    console.log('\n💡 Para testar o envio de notificações:');
    console.log('   1. Faça login como ADMIN no navegador');
    console.log('   2. Abra DevTools (F12) → Application → Cookies');
    console.log('   3. Copie o valor do cookie de sessão');
    console.log('   4. Execute este script novamente com o cookie');
}

// Teste 4: Verificar se há anúncios existentes
async function checkExistingAnnouncements() {
    console.log('\n\n==================== TESTE 4: Anúncios Existentes ====================');

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
        const announcements = await prisma.announcement.findMany({
            orderBy: { sentAt: 'desc' },
            take: 5,
            include: {
                admin: {
                    select: { name: true, email: true }
                }
            }
        });

        const pushNotifications = await prisma.pushNotification.findMany({
            orderBy: { sentAt: 'desc' },
            take: 5,
            include: {
                admin: {
                    select: { name: true, email: true }
                }
            }
        });

        console.log(`\n📢 Total de anúncios: ${announcements.length}`);
        announcements.forEach((ann, i) => {
            console.log(`   ${i + 1}. ${ann.title} (${ann.targetAudience}) - ${ann.isImportant ? '⭐ IMPORTANTE' : ''}`);
        });

        console.log(`\n🔔 Total de push notifications enviadas: ${pushNotifications.length}`);
        pushNotifications.forEach((notif, i) => {
            console.log(`   ${i + 1}. ${notif.title} (${notif.recipientCount} destinatários)`);
        });

    } catch (error) {
        console.error('❌ Erro ao verificar anúncios:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Executar todos os testes
async function runAllTests() {
    console.log('🚀 INICIANDO DIAGNÓSTICO DO SISTEMA DE NOTIFICAÇÕES\n');

    await checkFirebaseConfig();
    await checkFCMTokens();
    await checkExistingAnnouncements();
    await testNotificationAPI();

    console.log('\n\n✅ DIAGNÓSTICO COMPLETO!\n');
    console.log('📋 RESUMO:');
    console.log('   1. Se não há usuários com FCM tokens → Problema: Dispositivos não registrados');
    console.log('   2. Se Firebase não está configurado → Problema: Variáveis de ambiente');
    console.log('   3. Se API retorna 401 → Problema: Autenticação');
    console.log('   4. Se API retorna outro erro → Ver logs do servidor');

    rl.close();
}

// Executar
runAllTests().catch(console.error);
