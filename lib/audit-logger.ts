import { prisma } from './db';
import { NextRequest } from 'next/server';

export async function createAuditLog({
  userId,
  orderId,
  action,
  details,
  ipAddress,
  userAgent,
}: {
  userId?: string;
  orderId?: string;
  action: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        orderId,
        action,
        details,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Alias for logAuditAction that extracts request info
export async function logAuditAction({
  userId,
  orderId,
  action,
  details,
  request,
}: {
  userId?: string;
  orderId?: string;
  action: string;
  details?: string;
  request?: NextRequest;
}) {
  const ipAddress = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || undefined;
  const userAgent = request?.headers.get('user-agent') || undefined;

  return createAuditLog({
    userId,
    orderId,
    action,
    details,
    ipAddress,
    userAgent,
  });
}
