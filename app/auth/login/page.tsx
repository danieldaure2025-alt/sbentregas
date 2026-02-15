'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { WhatsAppButton } from '@/components/shared/whatsapp-button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: 'Erro no login',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login realizado!',
          description: 'Bem-vindo de volta!',
        });
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao fazer login. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-orange-500/50 shadow-lg shadow-orange-500/20">
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
            <span className="text-[#00a2ff]">Daure</span>{' '}
            <span className="text-orange-500">Express</span>
          </CardTitle>
          <CardDescription className="text-gray-400">Entre na sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-[hsl(220,20%,15%)] border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-300">Senha</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-orange-500 hover:text-orange-400 hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 bg-[hsl(220,20%,15%)] border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20"
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Não tem uma conta? </span>
            <Link href="/auth/signup" className="text-orange-500 hover:text-orange-400 hover:underline font-medium">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>

      <WhatsAppButton />
    </div>
  );
}
