import { UserRole, UserStatus, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    status?: UserStatus;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    status: string;
  }
}

export interface CreateOrderInput {
  originAddress: string;
  destinationAddress: string;
  notes?: string;
  distance: number;
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: OrderStatus;
}

export interface CreateRatingInput {
  orderId: string;
  rating: number;
  comment?: string;
}

export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalUsers?: number;
  activeDeliveryPersons?: number;
}

export interface DeliveryPersonStats {
  totalDeliveries: number;
  totalEarnings: number;
  averageRating: number;
  pendingOrders: number;
  activeOrders: number;
}

export interface SystemSettings {
  baseFee: number;
  pricePerKm: number;
  platformFeePercentage: number;
}
