'use client';

import { Badge } from '@/components/ui/badge';
import { OrderStatus, PaymentStatus, UserStatus } from '@prisma/client';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  USER_STATUS_LABELS,
} from '@/lib/constants';

interface StatusBadgeProps {
  status: OrderStatus | PaymentStatus | UserStatus;
  type: 'order' | 'payment' | 'user';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const getVariant = () => {
    if (type === 'order') {
      switch (status as OrderStatus) {
        case 'AWAITING_PAYMENT':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'PENDING':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'ACCEPTED':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'PICKED_UP':
          return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        case 'IN_TRANSIT':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'DELIVERED':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'CANCELLED':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'NO_COURIER_AVAILABLE':
          return 'bg-rose-100 text-rose-800 border-rose-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else if (type === 'payment') {
      switch (status as PaymentStatus) {
        case 'PENDING':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'COMPLETED':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'REFUNDED':
          return 'bg-orange-100 text-orange-800 border-orange-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    } else if (type === 'user') {
      switch (status as UserStatus) {
        case 'ACTIVE':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'PENDING_APPROVAL':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'BLOCKED':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getLabel = () => {
    if (type === 'order') {
      return ORDER_STATUS_LABELS[status as OrderStatus] || status;
    } else if (type === 'payment') {
      return PAYMENT_STATUS_LABELS[status as PaymentStatus] || status;
    } else if (type === 'user') {
      return USER_STATUS_LABELS[status as UserStatus] || status;
    }
    return status;
  };

  return (
    <Badge className={getVariant()} variant="outline">
      {getLabel()}
    </Badge>
  );
}
