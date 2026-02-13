'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileText, Lock, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'document' | 'reset'>('document');
  const [documentNumber, setDocumentNumber] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Formatar CPF/CNPJ enquanto digita
  const formatDocument = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      // CPF: 000.000.000-00
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // CNPJ: 00.000.000/0000-00
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDocument(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 14) {
      setDocumentNumber(formatted);
    }
  };

  const handleFindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentNumber }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao buscar conta');
      }

      setResetToken(data.resetToken);
      setMaskedEmail(data.maskedEmail);
      setUserName(data.userName);
      setStep('reset');

      toast({
        title: 'Conta encontrada!',
        description: 'Agora defina sua nova senha.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Conta não encontrada',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao redefinir senha');
      }

      setSuccess(true);
      toast({
        title: 'Sucesso!',
        description: 'Sua senha foi alterada. Faça login com a nova senha.',
      });

      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao redefinir senha',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "pl-10 bg-[hsl(220,20%,15%)] border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,8%)] p-4">
        <Card className="w-full max-w-md shadow-2xl border-green-500/50 bg-[hsl(220,20%,12%)]/95 backdrop-blur">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Senha Alterada!</h2>
            <p className="text-gray-400">Redirecionando para o login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,8%)] p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-orange-500/20 bg-[hsl(220,20%,12%)]/95 backdrop-blur relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-orange-500/50 shadow-lg shadow-orange-500/20">
              <Image
                src="/logo.jpg"
                alt="Daure Express"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Recuperar Senha
          </CardTitle>
          <CardDescription className="text-gray-400">
            {step === 'document'
              ? 'Digite seu CPF ou CNPJ para encontrar sua conta'
              : `Olá, ${userName}! Defina sua nova senha`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'document' ? (
            <form onSubmit={handleFindAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document" className="text-gray-300">CPF ou CNPJ</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="document"
                    type="text"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    value={documentNumber}
                    onChange={handleDocumentChange}
                    required
                    className={inputClass}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Digite o CPF (para clientes/entregadores) ou CNPJ (para estabelecimentos)
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold" 
                disabled={isLoading || documentNumber.replace(/\D/g, '').length < 11}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Buscando...
                  </>
                ) : (
                  'Buscar Conta'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                <p className="text-sm text-blue-400">
                  📧 Email associado: <span className="font-medium">{maskedEmail}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-gray-300">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputClass}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className={inputClass}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-gray-400 hover:text-white"
                onClick={() => setStep('document')}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Lembrou sua senha? </span>
            <Link href="/auth/login" className="text-orange-500 hover:text-orange-400 hover:underline font-medium">
              Fazer Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
