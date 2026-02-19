'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Package, Mail, Lock, User, Phone, Truck, FileText, Loader2, QrCode, Building2, CheckSquare, ExternalLink, MapPin } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { Checkbox } from '@/components/ui/checkbox';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    documentNumber: '', // CPF ou CNPJ
    role: 'CLIENT',
    vehicleType: '',
    licenseNumber: '',
    // Dados PIX
    pixKeyType: '',
    pixKey: '',
    // Dados bancários TED
    bankCode: '',
    bankName: '',
    agencyNumber: '',
    accountNumber: '',
    accountType: '',
    accountHolder: '',
    cpfCnpj: '',
    // Campos de estabelecimento (Cliente Delivery)
    establishmentAddress: '',
    establishmentPhone: '',
    establishmentCnpj: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

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
      setFormData((prev) => ({
        ...prev,
        documentNumber: formatted,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!acceptedTerms) {
      toast({
        title: 'Erro',
        description: 'Você deve aceitar os Termos de Uso para continuar',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Validar documento (CPF mínimo 11 dígitos, CNPJ 14 dígitos)
    const docNumbers = formData.documentNumber.replace(/\D/g, '');
    if (docNumbers.length < 11) {
      toast({
        title: 'Erro',
        description: 'CPF ou CNPJ é obrigatório',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (formData.role === 'DELIVERY_PERSON' && (!formData.vehicleType || !formData.licenseNumber)) {
      toast({
        title: 'Erro',
        description: 'Entregadores devem informar tipo de veículo e CNH',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao criar conta');
      }

      toast({
        title: 'Sucesso!',
        description: data?.message,
      });

      // Auto login após cadastro (apenas para CLIENT e ADMIN)
      if (formData.role !== 'DELIVERY_PERSON' && formData.role !== 'ESTABLISHMENT') {
        await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao criar conta',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "pl-10 bg-[hsl(220,20%,15%)] border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500/20";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,8%)] p-4 py-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-orange-500/20 bg-[hsl(220,20%,12%)]/95 backdrop-blur relative z-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Criar conta na{' '}
            <span className="text-[#00a2ff]">Daure</span>{' '}
            <span className="text-orange-500">Express</span>
          </CardTitle>
          <CardDescription className="text-gray-400">Preencha os dados para começar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="name"
                  name="name"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="phone"
                  name="phone"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNumber" className="text-gray-300">CPF ou CNPJ *</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="documentNumber"
                  name="documentNumber"
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  value={formData.documentNumber}
                  onChange={handleDocumentChange}
                  required
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500">
                Usado para recuperação de senha e identificação
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-gray-300">Tipo de conta</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md bg-[hsl(220,20%,15%)] border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
              >
                <option value="CLIENT">Cliente</option>
                <option value="ESTABLISHMENT">Cliente Delivery</option>
                <option value="DELIVERY_PERSON">Entregador</option>
              </select>
            </div>

            {formData.role === 'DELIVERY_PERSON' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vehicleType" className="text-gray-300">Tipo de veículo</Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="vehicleType"
                      name="vehicleType"
                      placeholder="Moto, Carro, Bicicleta..."
                      value={formData.vehicleType}
                      onChange={handleChange}
                      className={inputClass}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber" className="text-gray-300">CNH</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="licenseNumber"
                      name="licenseNumber"
                      placeholder="Número da CNH"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      className={inputClass}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Dados Bancários - Opcional */}
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-sm text-gray-400 mb-3">Dados para recebimento (opcional - pode cadastrar depois)</p>

                  {/* PIX */}
                  <div className="space-y-2 mb-3">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-blue-400" /> Chave PIX
                    </Label>
                    <select
                      name="pixKeyType"
                      value={formData.pixKeyType}
                      onChange={handleChange}
                      className="w-full h-10 rounded-md border px-3 py-2 text-sm bg-[hsl(220,20%,15%)] border-gray-700 text-white"
                      disabled={isLoading}
                    >
                      <option value="">Tipo da chave (opcional)</option>
                      <option value="CPF">CPF</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="PHONE">Telefone</option>
                      <option value="RANDOM">Chave Aleatória</option>
                    </select>
                    {formData.pixKeyType && (
                      <Input
                        name="pixKey"
                        placeholder="Digite sua chave PIX"
                        value={formData.pixKey}
                        onChange={handleChange}
                        className={inputClass}
                        disabled={isLoading}
                      />
                    )}
                  </div>

                  {/* TED */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400" /> Dados TED
                    </Label>
                    <select
                      name="bankCode"
                      value={formData.bankCode}
                      onChange={(e) => {
                        const banks: Record<string, string> = { '001': 'Banco do Brasil', '033': 'Santander', '104': 'Caixa', '237': 'Bradesco', '341': 'Itaú', '260': 'Nubank', '077': 'Inter' };
                        setFormData(prev => ({ ...prev, bankCode: e.target.value, bankName: banks[e.target.value] || '' }));
                      }}
                      className="w-full h-10 rounded-md border px-3 py-2 text-sm bg-[hsl(220,20%,15%)] border-gray-700 text-white"
                      disabled={isLoading}
                    >
                      <option value="">Selecione o banco (opcional)</option>
                      <option value="001">001 - Banco do Brasil</option>
                      <option value="033">033 - Santander</option>
                      <option value="104">104 - Caixa</option>
                      <option value="237">237 - Bradesco</option>
                      <option value="341">341 - Itaú</option>
                      <option value="260">260 - Nubank</option>
                      <option value="077">077 - Inter</option>
                    </select>
                    {formData.bankCode && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          name="agencyNumber"
                          placeholder="Agência"
                          value={formData.agencyNumber}
                          onChange={handleChange}
                          className={inputClass}
                          disabled={isLoading}
                        />
                        <Input
                          name="accountNumber"
                          placeholder="Conta"
                          value={formData.accountNumber}
                          onChange={handleChange}
                          className={inputClass}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {formData.role === 'ESTABLISHMENT' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="establishmentAddress" className="text-gray-300">Endereço do Estabelecimento *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="establishmentAddress"
                      name="establishmentAddress"
                      placeholder="Rua, número, bairro..."
                      value={formData.establishmentAddress}
                      onChange={handleChange}
                      required
                      className={inputClass}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="establishmentPhone" className="text-gray-300">Telefone do Estabelecimento</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="establishmentPhone"
                      name="establishmentPhone"
                      placeholder="(00) 00000-0000"
                      value={formData.establishmentPhone}
                      onChange={handleChange}
                      className={inputClass}
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="establishmentCnpj" className="text-gray-300">CNPJ do Estabelecimento</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      id="establishmentCnpj"
                      name="establishmentCnpj"
                      placeholder="00.000.000/0000-00"
                      value={formData.establishmentCnpj}
                      onChange={handleChange}
                      className={inputClass}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Termos de Uso */}
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-1 border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <label
                    htmlFor="terms"
                    className="text-sm text-gray-300 cursor-pointer leading-relaxed"
                  >
                    Li e aceito os{' '}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="text-orange-500 hover:text-orange-400 underline inline-flex items-center gap-1"
                    >
                      Termos de Uso e Política de Privacidade
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Você deve concordar com os termos para criar sua conta
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              disabled={isLoading || !acceptedTerms}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Já tem uma conta? </span>
            <Link href="/auth/login" className="text-orange-500 hover:text-orange-400 hover:underline font-medium">
              Entrar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
