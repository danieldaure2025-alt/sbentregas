import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generatePresignedUploadUrl } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { fileName, contentType, isPublic = true } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'Nome do arquivo e tipo de conteúdo são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar tipos de arquivo permitidos
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.' },
        { status: 400 }
      );
    }

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic
    );

    return NextResponse.json({
      uploadUrl,
      cloud_storage_path,
    });
  } catch (error: any) {
    console.error('Erro ao gerar presigned URL:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao gerar URL de upload' },
      { status: 500 }
    );
  }
}
