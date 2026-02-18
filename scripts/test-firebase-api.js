/**
 * Script para testar a API de diagnóstico do Firebase
 * Execute com: node scripts/test-firebase-api.js
 */

async function testFirebaseDebugAPI() {
    console.log('🔍 Testando API de diagnóstico Firebase...\n');

    try {
        const response = await fetch('http://localhost:3000/api/admin/debug/firebase');

        console.log(`Status: ${response.status}`);

        if (response.status === 401) {
            console.log('\n❌ Erro 401: Não autorizado');
            console.log('Esta API requer autenticação de ADMIN.');
            console.log('\n💡 Solução: Acesse http://localhost:3000/api/admin/debug/firebase no navegador após fazer login como admin');
            return;
        }

        const data = await response.json();
        console.log('\n📊 Resultado:');
        console.log(JSON.stringify(data, null, 2));

        // Análise do resultado
        console.log('\n\n📋 ANÁLISE:');
        if (data.envCheck) {
            console.log(`FIREBASE_PROJECT_ID: ${data.envCheck.hasProjectId ? '✅' : '❌'}`);
            console.log(`FIREBASE_CLIENT_EMAIL: ${data.envCheck.hasClientEmail ? '✅' : '❌'}`);
            console.log(`FIREBASE_PRIVATE_KEY: ${data.envCheck.hasPrivateKey ? '✅' : '❌'}`);
        }

        if (data.firebase?.moduleStatus) {
            console.log(`\nStatus do módulo: ${data.firebase.moduleStatus}`);
        }

        if (data.firebase?.error) {
            console.log(`\n❌ Erro: ${data.firebase.error}`);
        }

    } catch (error) {
        console.error('❌ Erro ao chamar API:', error.message);
        console.log('\n💡 Certifique-se de que o servidor Next.js está rodando na porta 3000');
    }
}

testFirebaseDebugAPI();
