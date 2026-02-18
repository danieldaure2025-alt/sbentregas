'use client';

import { Button } from '@/components/ui/button';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { UserRole } from '@prisma/client';
import {
  AlertTriangle,
  Bike,
  Calendar,
  DollarSign,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PlusCircle,
  Settings,
  ShoppingCart,
  TruckIcon,
  Users,
  Wallet,
  X
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationBadge } from './notification-badge';

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession() || {};
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !session?.user) return null;

  const userRole = session?.user?.role;

  const getNavLinks = () => {
    const baseLinks = [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];

    if (userRole === UserRole.ADMIN) {
      return [
        ...baseLinks,
        { href: '/dashboard/emergencies', label: 'Emergências', icon: AlertTriangle },
        { href: '/dashboard/deliveries', label: 'Entregas', icon: Package },
        { href: '/dashboard/delivery-persons', label: 'Motoboys', icon: Bike },
        { href: '/dashboard/communications', label: 'Comunicados', icon: MessageCircle },
        { href: '/dashboard/finances/admin', label: 'Finanças', icon: DollarSign },
        { href: '/dashboard/daily-closing', label: 'Fechamento', icon: Calendar },
        { href: '/dashboard/users', label: 'Usuários', icon: Users },
        { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
      ];
    } else if (userRole === UserRole.CLIENT) {
      return [
        ...baseLinks,
        { href: '/dashboard/new-order', label: 'Novo Pedido', icon: PlusCircle },
        { href: '/dashboard/orders', label: 'Meus Pedidos', icon: History },
      ];
    } else if (userRole === UserRole.DELIVERY_PERSON) {
      return [
        ...baseLinks,
        { href: '/dashboard/available', label: 'Disponíveis', icon: ShoppingCart },
        { href: '/dashboard/my-deliveries', label: 'Minhas Entregas', icon: TruckIcon },
        { href: '/dashboard/finances', label: 'Finanças', icon: Wallet },
      ];
    } else if (userRole === UserRole.ESTABLISHMENT) {
      return [
        ...baseLinks,
        { href: '/dashboard/establishment', label: 'Painel', icon: Package },
        { href: '/dashboard/orders', label: 'Pedidos', icon: History },
        { href: '/dashboard/finances', label: 'Finanças', icon: Wallet },
      ];
    }

    return baseLinks;
  };

  const navLinks = getNavLinks();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-orange-500/20 bg-[hsl(220,20%,10%)]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500/50">
                <Image
                  src="/logo.jpg"
                  alt="Daure Express"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl text-white">
                  <span className="text-[#00a2ff]">Daure</span>{' '}
                  <span className="text-orange-500">Express</span>
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={`flex items-center space-x-2 ${isActive
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{link.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Badge */}
            <NotificationBadge />

            <div className="hidden sm:block text-sm text-right">
              <p className="font-medium text-white">{session?.user?.name}</p>
              <p className="text-xs text-orange-400">
                {USER_ROLE_LABELS[userRole as UserRole]}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-orange-500"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Sair</span>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-orange-500/20 mt-2 pt-4">
            <div className="flex flex-col space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      size="sm"
                      className={`w-full justify-start ${isActive
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      <span>{link.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
