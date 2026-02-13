'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EstablishmentDashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/establishment');
  }, [router]);

  return null;
}
