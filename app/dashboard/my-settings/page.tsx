'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@prisma/client';
import {
    Bike,
    Building2,
    CreditCard,
    FileText,
    Loader2,
    MapPin,
    Phone,
    Save,
    Settings,
    User,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface UserSettings {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: UserRole;
    documentType: string | null;
    documentNumber: string | null;
    pixKeyType: string | null;
    pixKey: string | null;
    bankCode: string | null;
    bankName: string | null;
    agencyNumber: string | null;
    accountNumber: string | null;
    accountType: string | null;
    accountHolder: string | null;
    cpfCnpj: string | null;
    establishmentName: string | null;
    establishmentAddress: string | null;
    establishmentLatitude: number | null;
    establishmentLongitude: number | null;
    establishmentPhone: string | null;
    establishmentCnpj: string | null;
    vehicleType: string | null;
    licenseNumber: string | null;
    endOfDayBilling: boolean;
}

export default function MySettingsPage() {
    const { data: session } = useSession() || {};
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [geocoding, setGeocoding] = useState(false);
    const [settings, setSettings] = useState<UserSettings | null>(null);

    const userRole = session?.user?.role as UserRole | undefined;

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/me/settings');
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const updateField = (field: keyof UserSettings, value: string | number | boolean | null) => {
        setSettings((prev) => prev ? { ...prev, [field]: value } : prev);
    };

    const handleGeocodeAddress = async () => {
        if (!settings?.establishmentAddress?.trim()) {
            toast({ title: 'Erro', description: 'Digite um endereço primeiro', variant: 'destructive' });
            return;
        }

        setGeocoding(true);
        try {
            const res = await fetch('/api/maps/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: settings.establishmentAddress }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.coordinates?.lat && data.coordinates?.lng) {
                    updateField('establishmentLatitude', data.coordinates.lat);
                    updateField('establishmentLongitude', data.coordinates.lng);
                    toast({ title: 'Sucesso', description: 'Coordenadas encontradas!' });
                } else {
                    toast({ title: 'Aviso', description: 'Não foi possível encontrar coordenadas para este endereço', variant: 'destructive' });
                }
            } else {
                toast({ title: 'Aviso', description: 'Não foi possível encontrar coordenadas', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Erro', description: 'Erro ao buscar coordenadas', variant: 'destructive' });
        } finally {
            setGeocoding(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const res = await fetch('/api/me/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            const data = await res.json();

            if (res.ok) {
                toast({ title: 'Configurações Salvas!', description: 'Suas configurações foram atualizadas com sucesso.' });
                if (data.user) setSettings(data.user);
            } else {
                toast({ title: 'Erro', description: data.error || 'Erro ao salvar', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'Erro', description: 'Erro ao salvar configurações', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                Erro ao carregar configurações
            </div>
        );
    }

    const isClient = userRole === UserRole.CLIENT;
    const isEstablishment = userRole === UserRole.ESTABLISHMENT;
    const isDeliveryPerson = userRole === UserRole.DELIVERY_PERSON;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Settings className="w-8 h-8 text-orange-500" />
                    Configurações
                </h1>
                <p className="text-muted-foreground">
                    Gerencie seus dados pessoais, financeiros e preferências
                </p>
            </div>

            {/* ===== DADOS PESSOAIS ===== */}
            <Card className="border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-400" />
                        Dados Pessoais
                    </CardTitle>
                    <CardDescription>Informações básicas da sua conta</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome</Label>
                            <Input
                                id="name"
                                value={settings.name || ''}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="Seu nome"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                value={settings.email || ''}
                                disabled
                                className="opacity-60"
                            />
                            <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5" />
                                Telefone
                            </Label>
                            <Input
                                id="phone"
                                value={settings.phone || ''}
                                onChange={(e) => updateField('phone', e.target.value)}
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="documentType" className="flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                Tipo de Documento
                            </Label>
                            <select
                                id="documentType"
                                value={settings.documentType || ''}
                                onChange={(e) => updateField('documentType', e.target.value || null)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Selecione</option>
                                <option value="CPF">CPF</option>
                                <option value="CNPJ">CNPJ</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="documentNumber">Número do Documento</Label>
                            <Input
                                id="documentNumber"
                                value={settings.documentNumber || ''}
                                onChange={(e) => updateField('documentNumber', e.target.value)}
                                placeholder="000.000.000-00"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ===== ENDEREÇO DE COLETA FIXO (CLIENT + ESTABLISHMENT) ===== */}
            {(isClient || isEstablishment) && (
                <Card className="border-orange-500/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-orange-500" />
                            {isEstablishment ? 'Endereço do Estabelecimento' : 'Endereço de Coleta Fixo'}
                        </CardTitle>
                        <CardDescription>
                            {isEstablishment
                                ? 'Este endereço será usado como origem em todas as suas entregas'
                                : 'Salve um endereço de coleta fixo para não precisar digitar toda vez ao criar um pedido'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="establishmentAddress">Endereço Completo</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="establishmentAddress"
                                    value={settings.establishmentAddress || ''}
                                    onChange={(e) => updateField('establishmentAddress', e.target.value)}
                                    placeholder="Rua, número, bairro, cidade - UF"
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleGeocodeAddress}
                                    disabled={geocoding}
                                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500 hover:text-white"
                                >
                                    {geocoding ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <MapPin className="w-4 h-4" />
                                    )}
                                    <span className="ml-1 hidden sm:inline">Localizar</span>
                                </Button>
                            </div>
                        </div>

                        {settings.establishmentLatitude && settings.establishmentLongitude && (
                            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <span className="text-sm text-green-300">
                                    Coordenadas salvas: {settings.establishmentLatitude.toFixed(6)}, {settings.establishmentLongitude.toFixed(6)}
                                </span>
                            </div>
                        )}

                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">
                                💡 {isEstablishment
                                    ? 'Este endereço será usado automaticamente como origem ao criar novas entregas. Clique em "Localizar" para obter as coordenadas GPS.'
                                    : 'Este endereço será preenchido automaticamente como endereço de origem ao criar um novo pedido. Clique em "Localizar" para obter as coordenadas GPS.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ===== DADOS DO ESTABELECIMENTO ===== */}
            {isEstablishment && (
                <Card className="border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-purple-400" />
                            Dados do Estabelecimento
                        </CardTitle>
                        <CardDescription>Informações comerciais do seu estabelecimento</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="establishmentName">Nome do Estabelecimento</Label>
                                <Input
                                    id="establishmentName"
                                    value={settings.establishmentName || ''}
                                    onChange={(e) => updateField('establishmentName', e.target.value)}
                                    placeholder="Nome fantasia"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="establishmentCnpj">CNPJ</Label>
                                <Input
                                    id="establishmentCnpj"
                                    value={settings.establishmentCnpj || ''}
                                    onChange={(e) => updateField('establishmentCnpj', e.target.value)}
                                    placeholder="00.000.000/0000-00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="establishmentPhone" className="flex items-center gap-1">
                                    <Phone className="w-3.5 h-3.5" />
                                    Telefone do Estabelecimento
                                </Label>
                                <Input
                                    id="establishmentPhone"
                                    value={settings.establishmentPhone || ''}
                                    onChange={(e) => updateField('establishmentPhone', e.target.value)}
                                    placeholder="(00) 0000-0000"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ===== DADOS DO VEÍCULO (DELIVERY_PERSON) ===== */}
            {isDeliveryPerson && (
                <Card className="border-gray-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bike className="w-5 h-5 text-green-400" />
                            Dados do Veículo
                        </CardTitle>
                        <CardDescription>Informações sobre o seu veículo de entrega</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="vehicleType">Tipo de Veículo</Label>
                                <select
                                    id="vehicleType"
                                    value={settings.vehicleType || ''}
                                    onChange={(e) => updateField('vehicleType', e.target.value || null)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Selecione</option>
                                    <option value="MOTO">Moto</option>
                                    <option value="BICICLETA">Bicicleta</option>
                                    <option value="CARRO">Carro</option>
                                    <option value="VAN">Van</option>
                                    <option value="A_PE">A pé</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="licenseNumber">CNH / Placa</Label>
                                <Input
                                    id="licenseNumber"
                                    value={settings.licenseNumber || ''}
                                    onChange={(e) => updateField('licenseNumber', e.target.value)}
                                    placeholder="Número da CNH ou Placa"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ===== DADOS FINANCEIROS ===== */}
            <Card className="border-gray-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                        Dados Financeiros
                    </CardTitle>
                    <CardDescription>Configure seus dados para recebimentos e pagamentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* PIX */}
                    <div>
                        <h3 className="text-sm font-semibold text-orange-400 mb-3">Chave PIX</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="pixKeyType">Tipo de Chave</Label>
                                <select
                                    id="pixKeyType"
                                    value={settings.pixKeyType || ''}
                                    onChange={(e) => updateField('pixKeyType', e.target.value || null)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Selecione</option>
                                    <option value="CPF">CPF</option>
                                    <option value="CNPJ">CNPJ</option>
                                    <option value="EMAIL">Email</option>
                                    <option value="PHONE">Telefone</option>
                                    <option value="RANDOM">Chave aleatória</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pixKey">Chave PIX</Label>
                                <Input
                                    id="pixKey"
                                    value={settings.pixKey || ''}
                                    onChange={(e) => updateField('pixKey', e.target.value)}
                                    placeholder="Sua chave PIX"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Account */}
                    <div>
                        <h3 className="text-sm font-semibold text-orange-400 mb-3">Conta Bancária (TED)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bankName">Banco</Label>
                                <Input
                                    id="bankName"
                                    value={settings.bankName || ''}
                                    onChange={(e) => updateField('bankName', e.target.value)}
                                    placeholder="Nome do banco"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bankCode">Código do Banco</Label>
                                <Input
                                    id="bankCode"
                                    value={settings.bankCode || ''}
                                    onChange={(e) => updateField('bankCode', e.target.value)}
                                    placeholder="Ex: 001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agencyNumber">Agência</Label>
                                <Input
                                    id="agencyNumber"
                                    value={settings.agencyNumber || ''}
                                    onChange={(e) => updateField('agencyNumber', e.target.value)}
                                    placeholder="0000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accountNumber">Conta</Label>
                                <Input
                                    id="accountNumber"
                                    value={settings.accountNumber || ''}
                                    onChange={(e) => updateField('accountNumber', e.target.value)}
                                    placeholder="00000-0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accountType">Tipo de Conta</Label>
                                <select
                                    id="accountType"
                                    value={settings.accountType || ''}
                                    onChange={(e) => updateField('accountType', e.target.value || null)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="">Selecione</option>
                                    <option value="CORRENTE">Corrente</option>
                                    <option value="POUPANCA">Poupança</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="accountHolder">Titular</Label>
                                <Input
                                    id="accountHolder"
                                    value={settings.accountHolder || ''}
                                    onChange={(e) => updateField('accountHolder', e.target.value)}
                                    placeholder="Nome completo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cpfCnpj">CPF/CNPJ do Titular</Label>
                                <Input
                                    id="cpfCnpj"
                                    value={settings.cpfCnpj || ''}
                                    onChange={(e) => updateField('cpfCnpj', e.target.value)}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ===== SALVAR ===== */}
            <div className="flex justify-end pb-6">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="lg"
                    className="bg-orange-500 hover:bg-orange-600 text-white min-w-[200px]"
                >
                    {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
            </div>
        </div>
    );
}
