import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// GET all users (ADMIN only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        // Documento de identificação
        documentType: true,
        documentNumber: true,
        // Entregador
        vehicleType: true,
        licenseNumber: true,
        rating: true,
        totalDeliveries: true,
        // PIX data
        pixKeyType: true,
        pixKey: true,
        // Bank data (TED)
        bankCode: true,
        bankName: true,
        agencyNumber: true,
        accountNumber: true,
        accountType: true,
        accountHolder: true,
        cpfCnpj: true,
        // Geolocation
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
        isOnline: true,
        deliveryStatus: true,
        // Establishment
        establishmentName: true,
        establishmentAddress: true,
        establishmentPhone: true,
        establishmentCnpj: true,
        // Billing
        endOfDayBilling: true,
        // Timestamps
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
}
