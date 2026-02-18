import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { UserRole } from '@prisma/client';
import AdminDashboard from './_components/admin-dashboard';
import ClientDashboard from './_components/client-dashboard';
import DeliveryPersonDashboard from './_components/delivery-person-dashboard';
import EstablishmentDashboard from './_components/establishment-dashboard';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  const userRole = session.user.role;

  if (userRole === UserRole.ADMIN) {
    return <AdminDashboard />;
  } else if (userRole === UserRole.CLIENT) {
    return <ClientDashboard />;
  } else if (userRole === UserRole.DELIVERY_PERSON) {
    return <DeliveryPersonDashboard />;
  } else if (userRole === UserRole.ESTABLISHMENT) {
    return <EstablishmentDashboard />;
  }

  return <div>Perfil inválido</div>;
}
