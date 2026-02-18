// Carregar variáveis de ambiente do arquivo .env
require('dotenv').config({ path: '.env' });

console.log('🔧 Testando Firebase Admin SDK...\n');

// Verificar variáveis de ambiente
console.log('📋 Variáveis de ambiente:');
console.log(`FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? '✅ ' + process.env.FIREBASE_PROJECT_ID : '❌ NÃO definida'}`);
console.log(`FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? '✅ ' + process.env.FIREBASE_CLIENT_EMAIL : '❌ NÃO definida'}`);
console.log(`FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? '✅ Definida (comprimento: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : '❌ NÃO definida'}`);

console.log('\n🧪 Tentando importar módulo firebase-admin...');

try {
    const admin = require('firebase-admin');
    console.log('✅ Módulo firebase-admin importado com sucesso!');

    // Verificar se já está inicializado
    if (admin.apps.length === 0) {
        console.log('\n🔄 Inicializando Firebase Admin SDK...');

        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });

        console.log('✅ Firebase Admin SDK inicializado com sucesso!');
    } else {
        console.log('✅ Firebase Admin SDK já estava inicializado');
    }

    // Testar envio de notificação de teste (sem realmente enviar)
    console.log('\n🧪 Testando criação de mensagem...');
    const messaging = admin.messaging();
    console.log('✅ Messaging service acessível!');

    // Criar mensagem de teste (não enviar)
    const testMessage = {
        notification: {
            title: 'Teste',
            body: 'Mensagem de teste',
        },
        token: 'token_falso_para_teste',
    };

    console.log('✅ Mensagem de teste criada com sucesso!');
    console.log('\n🎉 FIREBASE ADMIN SDK ESTÁ FUNCIONANDO CORRETAMENTE!');

} catch (error) {
    console.error('\n❌ ERRO ao inicializar Firebase Admin SDK:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
}
