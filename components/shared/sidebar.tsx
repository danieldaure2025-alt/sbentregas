'use client';

import { Button } from '@/components/ui/button';
import { useSidebarState } from '@/contexts/sidebar-context';
import { USER_ROLE_LABELS } from '@/lib/constants';
import { UserRole } from '@prisma/client';
import {
    AlertTriangle,
    Bike,
    Calendar,
    ChevronLeft,
    ChevronRight,
    DollarSign,
    History,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageCircle,
    Package,
    PlusCircle,
    Settings,
    Users,
    X,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Sidebar() {
    const { collapsed, toggle } = useSidebarState();
    const [mounted, setMounted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { data: session } = useSession() || {};
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close mobile menu on navigation
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

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
                { href: '/dashboard/finances', label: 'Finanças', icon: DollarSign },
                { href: '/dashboard/my-settings', label: 'Configurações', icon: Settings },
            ];
        }

        return baseLinks;
    };

    const navLinks = getNavLinks();

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/auth/login' });
    };

    const sidebarContent = (
        <>
            {/* Logo area */}
            <div className="flex items-center h-16 px-4 border-b border-orange-500/20">
                <Link href="/dashboard" className="flex items-center space-x-3 overflow-hidden">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-orange-500/50 flex-shrink-0">
                        <Image
                            src="/logo.jpg"
                            alt="Daure Express"
                            fill
                            className="object-cover"
                            priority
                        />
                    </div>
                    {!collapsed && (
                        <span className="font-bold text-lg text-white whitespace-nowrap">
                            <span className="text-[#00a2ff]">Daure</span>{' '}
                            <span className="text-orange-500">Express</span>
                        </span>
                    )}
                </Link>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link key={link.href} href={link.href}>
                            <div
                                className={`group flex items-center rounded-lg px-3 py-2.5 transition-all duration-200 ${isActive
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    } ${collapsed ? 'justify-center' : ''}`}
                                title={collapsed ? link.label : undefined}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:text-orange-400'}`} />
                                {!collapsed && (
                                    <span className="ml-3 text-sm font-medium whitespace-nowrap">{link.label}</span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section: User info + Collapse toggle */}
            <div className="border-t border-orange-500/20 p-3 space-y-3">
                {/* User info */}
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-400 text-xs font-bold">
                            {session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
                            <p className="text-xs text-orange-400 truncate">
                                {USER_ROLE_LABELS[userRole as UserRole]}
                            </p>
                        </div>
                    )}
                </div>

                {/* Logout button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className={`w-full border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 ${collapsed ? 'px-2' : ''
                        }`}
                    title={collapsed ? 'Sair' : undefined}
                >
                    <LogOut className="w-4 h-4" />
                    {!collapsed && <span className="ml-2">Sair</span>}
                </Button>

                {/* Collapse toggle (desktop only) */}
                <button
                    onClick={toggle}
                    className="hidden md:flex w-full items-center justify-center py-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    title={collapsed ? 'Expandir menu' : 'Recolher menu'}
                >
                    {collapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden fixed top-4 left-4 z-[60] p-2 rounded-lg bg-[hsl(220,20%,13%)] border border-orange-500/20 text-white"
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 z-[49] bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Desktop sidebar */}
            <aside
                className={`hidden md:flex fixed top-0 left-0 z-50 h-screen flex-col border-r border-orange-500/20 bg-[hsl(220,20%,10%)] transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[260px]'
                    }`}
            >
                {sidebarContent}
            </aside>

            {/* Mobile sidebar */}
            <aside
                className={`md:hidden fixed top-0 left-0 z-[55] h-screen w-[260px] flex flex-col border-r border-orange-500/20 bg-[hsl(220,20%,10%)] transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
