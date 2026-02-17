import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Verificar variáveis de ambiente
        const firebaseConfig = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? '✅ Definida' : '❌ Não definida',
            privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
        };

        // Tentar inicializar Firebase Admin
        let firebaseStatus = 'Não testado';
        let firebaseError = null;

        try {
            const { sendPushNotificationToMultiple } = await import('@/lib/firebase-admin');
            firebaseStatus = '✅ Módulo carregado com sucesso';
        } catch (error: any) {
            firebaseStatus = '❌ Erro ao carregar módulo';
            firebaseError = error.message;
        }

        return NextResponse.json({
            status: 'ok',
            firebase: {
                config: firebaseConfig,
                moduleStatus: firebaseStatus,
                error: firebaseError,
            },
            envCheck: {
                hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
                hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
                hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
            }
        });
    } catch (error: any) {
        console.error('Error in debug route:', error);
        return NextResponse.json(
            { error: 'Erro no diagnóstico', details: error.message },
            { status: 500 }
        );
    }
}
