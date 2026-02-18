'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Package } from 'lucide-react';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  const getErrorMessage = () => {
    switch (error) {
      case 'AccountBlocked':
        return 'Sua conta foi bloqueada. Entre em contato com o suporte.';
      case 'PendingApproval':
        return 'Sua conta está aguardando aprovação do administrador.';
      case 'Configuration':
        return 'Erro de configuração. Tente novamente mais tarde.';
      default:
        return 'Ocorreu um erro durante a autenticação. Tente novamente.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Erro de Autenticação</CardTitle>
          <CardDescription>{getErrorMessage()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <Link href="/auth/login">Voltar ao Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
