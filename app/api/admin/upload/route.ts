import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Verificar se é admin
        if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
        }

        // Validar tipo de arquivo
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' },
                { status: 400 }
            );
        }

        // Validar tamanho
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'Arquivo muito grande. Máximo 5MB.' },
                { status: 400 }
            );
        }

        // Gerar nome único
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const filename = `announcement_${timestamp}.${extension}`;

        // Converter para buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Salvar arquivo
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'announcements');
        const filepath = join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // Retornar URL pública
        const publicUrl = `/uploads/announcements/${filename}`;

        return NextResponse.json({ url: publicUrl }, { status: 200 });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json(
            { error: 'Erro ao fazer upload do arquivo' },
            { status: 500 }
        );
    }
}
