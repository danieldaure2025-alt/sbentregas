import { NextResponse } from 'next/server';

// Rota temporária para verificar configuração do S3
// REMOVER APÓS DIAGNÓSTICO
export async function GET() {
    return NextResponse.json({
        AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME ? '✅ configurado' : '❌ NÃO configurado',
        AWS_REGION: process.env.AWS_REGION ? '✅ configurado' : '❌ NÃO configurado',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '✅ configurado' : '❌ NÃO configurado',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '✅ configurado' : '❌ NÃO configurado',
        AWS_FOLDER_PREFIX: process.env.AWS_FOLDER_PREFIX ? '✅ configurado' : '❌ NÃO configurado',
    });
}
