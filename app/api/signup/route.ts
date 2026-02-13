import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      email, password, name, role, phone, documentNumber, vehicleType, licenseNumber,
      pixKeyType, pixKey, bankCode, bankName, agencyNumber, accountNumber, accountType, accountHolder, cpfCnpj,
      // Establishment fields
      establishmentName, establishmentAddress, establishmentPhone, establishmentCnpj
    } = body;
    
    // Processar documento (CPF/CNPJ)
    const cleanDocument = documentNumber ? documentNumber.replace(/\D/g, '') : null;
    const documentType = cleanDocument ? (cleanDocument.length <= 11 ? 'CPF' : 'CNPJ') : null;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já existe com este email' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Determine user role and status
    const userRole = (role as UserRole) || UserRole.CLIENT;
    const userStatus =
      userRole === UserRole.DELIVERY_PERSON || userRole === UserRole.ESTABLISHMENT
        ? UserStatus.PENDING_APPROVAL
        : UserStatus.ACTIVE;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: userRole,
        status: userStatus,
        phone: phone || null,
        // Documento de identificação
        documentType: documentType,
        documentNumber: cleanDocument,
        // Delivery person fields
        vehicleType: userRole === UserRole.DELIVERY_PERSON ? vehicleType : null,
        licenseNumber: userRole === UserRole.DELIVERY_PERSON ? licenseNumber : null,
        // PIX data
        pixKeyType: userRole === UserRole.DELIVERY_PERSON && pixKeyType ? pixKeyType : null,
        pixKey: userRole === UserRole.DELIVERY_PERSON && pixKey ? pixKey : null,
        // TED data
        bankCode: userRole === UserRole.DELIVERY_PERSON && bankCode ? bankCode : null,
        bankName: userRole === UserRole.DELIVERY_PERSON && bankName ? bankName : null,
        agencyNumber: userRole === UserRole.DELIVERY_PERSON && agencyNumber ? agencyNumber : null,
        accountNumber: userRole === UserRole.DELIVERY_PERSON && accountNumber ? accountNumber : null,
        accountType: userRole === UserRole.DELIVERY_PERSON && accountType ? accountType : null,
        accountHolder: userRole === UserRole.DELIVERY_PERSON && accountHolder ? accountHolder : null,
        cpfCnpj: userRole === UserRole.DELIVERY_PERSON && cpfCnpj ? cpfCnpj : null,
        // Establishment fields
        establishmentName: userRole === UserRole.ESTABLISHMENT ? (establishmentName || name) : null,
        establishmentAddress: userRole === UserRole.ESTABLISHMENT ? establishmentAddress : null,
        establishmentPhone: userRole === UserRole.ESTABLISHMENT ? (establishmentPhone || phone) : null,
        establishmentCnpj: userRole === UserRole.ESTABLISHMENT ? establishmentCnpj : null,
        endOfDayBilling: userRole === UserRole.ESTABLISHMENT ? true : false,
      },
    });

    // Log the signup
    await createAuditLog({
      userId: user.id,
      action: 'USER_SIGNUP',
      details: `User signed up with role: ${userRole}`,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    const getMessage = () => {
      if (userRole === UserRole.DELIVERY_PERSON) {
        return 'Cadastro realizado! Sua conta será aprovada em breve.';
      } else if (userRole === UserRole.ESTABLISHMENT) {
        return 'Cadastro realizado! Sua conta de estabelecimento será aprovada em breve.';
      }
      return 'Cadastro realizado com sucesso!';
    };

    return NextResponse.json(
      {
        message: getMessage(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta. Tente novamente.' },
      { status: 500 }
    );
  }
}
