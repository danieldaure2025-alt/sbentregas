'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Settings, CreditCard, Info, Mail, Phone } from 'lucide-react';

interface AdminSettings {
    pixKeyType: string;
    pixKey: string;
    pixAccountName: string;
    platformName: string;
    supportEmail: string;
    supportPhone: string;
}

export default function AdminSettingsPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<AdminSettings>({
        pixKeyType: '',
        pixKey: '',
        pixAccountName: '',
        platformName: '',
        supportEmail: '',
        supportPhone: '',
    });

    useEffect(() => {
        // Verificar se é admin
        if (session && session.user?.role !== 'ADMIN') {
            router.push('/dashboard');
            return;
        }

        fetchSettings();
    }, [session, router]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    pixKeyType: data.pixKeyType || '',
                    pixKey: data.pixKey || '',
                    pixAccountName: data.pixAccountName || '',
                    platformName: data.platformName || '',
                    supportEmail: data.supportEmail || '',
                    supportPhone: data.supportPhone || '',
                });
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao salvar configurações');
            }

            toast({
                title: 'Sucesso!',
                description: 'Configurações salvas com sucesso',
            });
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message || 'Erro ao salvar configurações',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Configurações da Plataforma</h1>
                <p className="text-muted-foreground">
                    Configure informações da plataforma e métodos de pagamento
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Dados de Pagamento PIX
                    </CardTitle>
                    <CardDescription>
                        Configure a chave PIX para recebimento de pagamentos da plataforma
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="pixKeyType">Tipo de Chave PIX</Label>
                        <Select
                            value={settings.pixKeyType}
                            onValueChange={(value) => setSettings({ ...settings, pixKeyType: value })}
                        >
                            <SelectTrigger id="pixKeyType">
                                <SelectValue placeholder="Selecione o tipo de chave" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CPF">CPF</SelectItem>
                                <SelectItem value="CNPJ">CNPJ</SelectItem>
                                <SelectItem value="EMAIL">Email</SelectItem>
                                <SelectItem value="PHONE">Telefone</SelectItem>
                                <SelectItem value="RANDOM">Chave Aleatória</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pixKey">Chave PIX</Label>
                        <Input
                            id="pixKey"
                            value={settings.pixKey}
                            onChange={(e) => setSettings({ ...settings, pixKey: e.target.value })}
                            placeholder="Digite a chave PIX"
                        />
                        <p className="text-xs text-muted-foreground">
                            Chave PIX da conta que receberá os pagamentos da plataforma
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pixAccountName">Nome do Titular</Label>
                        <Input
                            id="pixAccountName"
                            value={settings.pixAccountName}
                            onChange={(e) => setSettings({ ...settings, pixAccountName: e.target.value })}
                            placeholder="Nome completo ou razão social"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Informações da Plataforma
                    </CardTitle>
                    <CardDescription>
                        Informações gerais e de contato da plataforma
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="platformName">Nome da Plataforma</Label>
                        <Input
                            id="platformName"
                            value={settings.platformName}
                            onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                            placeholder="Nome da sua plataforma"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="supportEmail" className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email de Suporte
                        </Label>
                        <Input
                            id="supportEmail"
                            type="email"
                            value={settings.supportEmail}
                            onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                            placeholder="suporte@exemplo.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="supportPhone" className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Telefone de Suporte
                        </Label>
                        <Input
                            id="supportPhone"
                            value={settings.supportPhone}
                            onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={handleSave} size="lg" disabled={saving}>
                    {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </div>

            <Card className="border-orange-500/30">
                <CardHeader>
                    <CardTitle className="text-sm">💡 Informações Importantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>
                        • As configurações de PIX são usadas para receber pagamentos de clientes delivery
                    </p>
                    <p>
                        • Certifique-se de que a chave PIX está correta antes de salvar
                    </p>
                    <p>
                        • Apenas administradores podem acessar e modificar estas configurações
                    </p>
                    <p>
                        • As alterações são salvas imediatamente e aplicadas a todos os novos pagamentos
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
