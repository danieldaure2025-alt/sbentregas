import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { UserRole, UserStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

// GET single user
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = params.id;

    // Users can only see their own data unless they're admin
    if (session.user.role !== UserRole.ADMIN && session.user.id !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        image: true,
        vehicleType: true,
        licenseNumber: true,
        pixKeyType: true,
        pixKey: true,
        bankCode: true,
        bankName: true,
        agencyNumber: true,
        accountNumber: true,
        rating: true,
        totalDeliveries: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}

// PATCH update user (ADMIN or own profile)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = params.id;
    const body = await req.json();

    // Check permissions
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isOwnProfile = session.user.id === userId;

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Build update data based on role
    const updateData: any = {};

    // Fields that users can update on their own profile
    if (body?.name !== undefined) updateData.name = body.name;
    if (body?.phone !== undefined) updateData.phone = body.phone;
    if (body?.vehicleType !== undefined) updateData.vehicleType = body.vehicleType;
    if (body?.licenseNumber !== undefined) updateData.licenseNumber = body.licenseNumber;

    // Fields only admin can update
    if (isAdmin) {
      if (body?.status !== undefined) updateData.status = body.status;
      if (body?.role !== undefined) updateData.role = body.role;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        vehicleType: true,
        licenseNumber: true,
        pixKeyType: true,
        pixKey: true,
        bankCode: true,
        bankName: true,
        rating: true,
        totalDeliveries: true,
        updatedAt: true,
      },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: 'USER_UPDATED',
      details: `User ${userId} updated by ${session.user.id}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ user, message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    );
  }
}

// DELETE user (ADMIN only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const userId = params.id;

    // Don't allow admin to delete themselves
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: 'Você não pode excluir sua própria conta' },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // Log the action
    await createAuditLog({
      userId: session.user.id,
      action: 'USER_DELETED',
      details: `User ${userId} deleted`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir usuário' },
      { status: 500 }
    );
  }
}
