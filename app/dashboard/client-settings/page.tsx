'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, MapPin, Plus, Trash2, AlertCircle, Building2, Home, Search, Check, Percent } from 'lucide-react';

interface Neighborhood {
    id: string;
    neighborhood: string;
    price: number;
    platformFee: number;
    platformFeePercentage?: number;
    isActive: boolean;
}

export default function ClientSettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pricingType, setPricingType] = useState<'POR_KM' | 'POR_BAIRRO'>('POR_KM');
    const [fixedDeliveryFee, setFixedDeliveryFee] = useState('');
    const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
    const [newNeighborhood, setNewNeighborhood] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [addingNeighborhood, setAddingNeighborhood] = useState(false);
    const [clientType, setClientType] = useState<string | null>(null);
    const [platformFeePercentage, setPlatformFeePercentage] = useState<number>(0);

    // Estados para endereço do estabelecimento
    const [establishmentInfo, setEstablishmentInfo] = useState({
        establishmentAddress: '',
        establishmentNeighborhood: '',
        establishmentCity: '',
        establishmentState: '',
        establishmentLatitude: null as number | null,
        establishmentLongitude: null as number | null,
    });
    const [savingAddress, setSavingAddress] = useState(false);
    const [geocoding, setGeocoding] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const [settingsRes, neighborhoodsRes] = await Promise.all([
                fetch('/api/client-settings'),
                fetch('/api/client-settings/neighborhoods'),
            ]);

            if (!settingsRes.ok) {
                throw new Error('Erro ao carregar configurações');
            }

            const settingsData = await settingsRes.json();
            const neighborhoodsData = neighborhoodsRes.ok ? await neighborhoodsRes.json() : { neighborhoods: [] };

            setClientType(settingsData.user?.clientType || null);
            setPricingType(settingsData.user?.pricingType || 'POR_KM');
            setFixedDeliveryFee(settingsData.user?.fixedDeliveryFee?.toString() || '');
            setPlatformFeePercentage(settingsData.user?.platformFeePercentage || 0);
            setNeighborhoods(neighborhoodsData.neighborhoods || []);

            // Carregar endereço do estabelecimento
            setEstablishmentInfo({
                establishmentAddress: settingsData.user?.establishmentAddress || '',
                establishmentNeighborhood: settingsData.user?.establishmentNeighborhood || '',
                establishmentCity: settingsData.user?.establishmentCity || '',
                establishmentState: settingsData.user?.establishmentState || '',
                establishmentLatitude: settingsData.user?.establishmentLatitude,
                establishmentLongitude: settingsData.user?.establishmentLongitude,
            });
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao carregar configurações',
                variant: 'destructive',
            });
            router.push('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleSavePricingType = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/client-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pricingType,
                    fixedDeliveryFee: fixedDeliveryFee ? parseFloat(fixedDeliveryFee) : null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao salvar');
            }

            toast({
                title: 'Sucesso',
                description: 'Configurações de precificação atualizadas!',
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

    const handleAddNeighborhood = async () => {
        if (!newNeighborhood.trim() || !newPrice) {
            toast({
                title: 'Erro',
                description: 'Preencha o bairro e o preço',
                variant: 'destructive',
            });
            return;
        }

        setAddingNeighborhood(true);
        try {
            const res = await fetch('/api/client-settings/neighborhoods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    neighborhood: newNeighborhood.trim(),
                    price: parseFloat(newPrice),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao adicionar bairro');
            }

            setNeighborhoods([...neighborhoods, data.neighborhood]);
            setNewNeighborhood('');
            setNewPrice('');
            toast({
                title: 'Sucesso',
                description: 'Bairro adicionado!',
            });
        } catch (error: any) {
            toast({
                title: 'Erro',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setAddingNeighborhood(false);
        }
    };

    const handleToggleNeighborhood = async (id: string, isActive: boolean) => {
        try {
            const res = await fetch(`/api/client-settings/neighborhoods/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive }),
            });

            if (!res.ok) {
                throw new Error('Erro ao atualizar bairro');
            }

            setNeighborhoods(neighborhoods.map(n => n.id === id ? { ...n, isActive } : n));
            toast({
                title: 'Sucesso',
                description: `Bairro ${isActive ? 'ativado' : 'desativado'}`,
            });
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Erro ao atualizar bairro',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteNeighborhood = async (id: string) => {
        if (!confirm('Deseja realmente remover este bairro?')) return;

        try {
            const res = await fetch(`/api/client-settings/neighborhoods/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('Erro ao remover bairro');
            }

            setNeighborhoods(neighborhoods.filter(n => n.id !== id));
            toast({
                title: 'Sucesso',
                description: 'Bairro removido',
            });
        } catch (error) {
            toast({
                title: 'Erro',
                description: 'Erro ao remover bairro',
                variant: 'destructive',
            });
        }
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEstablishmentInfo((prev) => ({
            ...prev,
            establishmentAddress: e.target.value,
        }));
    };

    const handleGeocodeAddress = async () => {
        if (!establishmentInfo.establishmentAddress || establishmentInfo.establishmentAddress.trim().length < 5) {
            toast({
                title: 'Endereço inválido',
                description: 'Por favor, digite um endereço completo',
                variant: 'destructive',
            });
            return;
        }

        setGeocoding(true);
        try {
            const response = await fetch('/api/geocode/neighborhood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: establishmentInfo.establishmentAddress }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                setEstablishmentInfo((prev) => ({
                    ...prev,
                    establishmentNeighborhood: result.data.neighborhood || '',
                    establishmentCity: result.data.city || '',
                    establishmentState: result.data.state || '',
                    establishmentLatitude: result.data.latitude,
                    establishmentLongitude: result.data.longitude,
                }));

                toast({
                    title: 'Sucesso!',
                    description: 'Bairro, cidade e estado preenchidos automaticamente.',
                });
            } else {
                toast({
                    title: 'Erro',
                    description: result.error || 'Não foi possível encontrar o endereço',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error geocoding address:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao buscar informações do endereço',
                variant: 'destructive',
            });
        } finally {
            setGeocoding(false);
        }
    };

    const handleSaveAddress = async () => {
        setSavingAddress(true);
        try {
            const response = await fetch('/api/client-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(establishmentInfo),
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: 'Endereço Salvo',
                    description: 'O endereço do estabelecimento foi atualizado com sucesso!',
                });
            } else {
                toast({
                    title: 'Erro',
                    description: result.error || 'Erro ao salvar endereço',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error('Error saving address:', error);
            toast({
                title: 'Erro',
                description: 'Erro ao salvar endereço',
                variant: 'destructive',
            });
        } finally {
            setSavingAddress(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (clientType !== 'DELIVERY') {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <Card className="border-yellow-500/30">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                            <p className="text-muted-foreground">
                                Esta página é exclusiva para clientes tipo DELIVERY (estabelecimentos).
                            </p>
                            <Button onClick={() => router.push('/dashboard')} className="mt-4">
                                Voltar para o Dashboard
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Configurações do Cliente</h1>
                <p className="text-muted-foreground">
                    Configure a precificação de seus pedidos
                </p>
            </div>

            <Tabs defaultValue="pricing" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pricing">Precificação</TabsTrigger>
                    <TabsTrigger value="address">Endereço</TabsTrigger>
                </TabsList>

                <TabsContent value="pricing" className="space-y-4">
                    {/* Pricing Strategy Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Estratégia de Precificação
                            </CardTitle>
                            <CardDescription>
                                Escolha como deseja calcular o preço das entregas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                {/* Fixed Fee Option */}
                                <div className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <Label className="text-base font-semibold">Taxa Fixa do Estabelecimento</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Defina um valor fixo para todas as entregas, independente da distância ou bairro
                                            </p>
                                        </div>
                                        <Switch
                                            checked={!!fixedDeliveryFee && parseFloat(fixedDeliveryFee) > 0}
                                            onCheckedChange={(checked) => {
                                                if (!checked) setFixedDeliveryFee('');
                                            }}
                                        />
                                    </div>
                                    {!!fixedDeliveryFee && parseFloat(fixedDeliveryFee) > 0 && (
                                        <div className="space-y-2">
                                            <Label htmlFor="fixedFee">Valor da Taxa Fixa (R$)</Label>
                                            <Input
                                                id="fixedFee"
                                                type="number"
                                                step="0.01"
                                                value={fixedDeliveryFee}
                                                onChange={(e) => setFixedDeliveryFee(e.target.value)}
                                                placeholder="Ex: 8.00"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Dynamic Pricing (only if no fixed fee) */}
                                {(!fixedDeliveryFee || parseFloat(fixedDeliveryFee) <= 0) && (
                                    <div className="border rounded-lg p-4 space-y-3">
                                        <Label className="text-base font-semibold">Precificação Dinâmica</Label>
                                        <div className="grid gap-3">
                                            <button
                                                onClick={() => setPricingType('POR_KM')}
                                                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${pricingType === 'POR_KM'
                                                    ? 'border-orange-500 bg-orange-500/10'
                                                    : 'border-border hover:border-orange-500/50'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 ${pricingType === 'POR_KM' ? 'border-orange-500 bg-orange-500' : 'border-border'
                                                    }`} />
                                                <div className="flex-1 text-left">
                                                    <p className="font-medium">Por Quilômetro</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Preço calculado com base na distância percorrida
                                                    </p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => setPricingType('POR_BAIRRO')}
                                                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${pricingType === 'POR_BAIRRO'
                                                    ? 'border-orange-500 bg-orange-500/10'
                                                    : 'border-border hover:border-orange-500/50'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 ${pricingType === 'POR_BAIRRO' ? 'border-orange-500 bg-orange-500' : 'border-border'
                                                    }`} />
                                                <div className="flex-1 text-left">
                                                    <p className="font-medium">Por Bairro</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Defina um preço fixo para cada bairro de entrega
                                                    </p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleSavePricingType}
                                disabled={saving}
                                className="w-full"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
                                {saving ? 'Salvando...' : 'Salvar Configurações'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Neighborhood Pricing (only if POR_BAIRRO and no fixed fee) */}
                    {pricingType === 'POR_BAIRRO' && (!fixedDeliveryFee || parseFloat(fixedDeliveryFee) <= 0) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-orange-500" />
                                    Preços por Bairro
                                </CardTitle>
                                <CardDescription>
                                    Configure a <strong>taxa de entrega da plataforma</strong> que será cobrada do cliente final para cada bairro.
                                    Este é o valor que seus clientes pagarão pela entrega.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Info Alert */}
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                    <div className="flex gap-3">
                                        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1 text-sm">
                                            <p className="font-semibold text-blue-500">💡 Sobre a Taxa de Entrega</p>
                                            <p className="text-muted-foreground">
                                                O valor configurado aqui é a <strong>taxa de entrega da plataforma</strong> que será cobrada do seu cliente final quando ele fizer um pedido para o bairro especificado.
                                            </p>
                                            <p className="text-muted-foreground text-xs">
                                                Exemplo: Se você definir R$ 10,00 para o bairro "Centro", quando um cliente solicitar uma entrega para o Centro, ele pagará R$ 10,00 de taxa de entrega.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {/* Add Neighborhood Form */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Adicionar Novo Bairro</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Ex: Centro, Jardins, Vila Mariana"
                                            value={newNeighborhood}
                                            onChange={(e) => setNewNeighborhood(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="Taxa (R$)"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            className="w-32"
                                        />
                                        <Button
                                            onClick={handleAddNeighborhood}
                                            disabled={addingNeighborhood}
                                            className="bg-orange-500 hover:bg-orange-600"
                                        >
                                            {addingNeighborhood ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Plus className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Digite o bairro e taxa de entrega total. Taxa da plataforma ({platformFeePercentage}%) será aplicada automaticamente.
                                    </p>
                                </div>

                                {/* Neighborhoods List */}
                                <div className="space-y-2">
                                    {neighborhoods.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                            <p>Nenhum bairro configurado ainda</p>
                                        </div>
                                    ) : (
                                        neighborhoods.map((n) => (
                                            <div
                                                key={n.id}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${n.isActive ? 'border-border' : 'border-border bg-muted/50 opacity-60'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <MapPin className={`w-4 h-4 ${n.isActive ? 'text-orange-500' : 'text-muted-foreground'}`} />
                                                    <div>
                                                        <p className="font-medium">{n.neighborhood}</p>
                                                        <div>
                                                            <p className="text-sm text-orange-500">Taxa Total: R$ {n.price.toFixed(2)}</p>
                                                            {n.platformFee > 0 && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Taxa Plataforma: R$ {n.platformFee.toFixed(2)} |
                                                                    Entregador: R$ {(n.price - n.platformFee).toFixed(2)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={n.isActive}
                                                        onCheckedChange={(checked) => handleToggleNeighborhood(n.id, checked)}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteNeighborhood(n.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Address Tab */}
                <TabsContent value="address" className="space-y-4">
                    <Card className="border-orange-500/30">
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <Home className="w-5 h-5 text-orange-500" />
                                <span>Endereço do Estabelecimento</span>
                            </CardTitle>
                            <CardDescription>
                                Configure o endereço base para suas entregas. O bairro é preenchido automaticamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="establishmentAddress">Endereço Completo *</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="establishmentAddress"
                                        value={establishmentInfo.establishmentAddress}
                                        onChange={handleAddressChange}
                                        placeholder="Ex: Rua das Flores, 123, Centro"
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleGeocodeAddress}
                                        disabled={geocoding || !establishmentInfo.establishmentAddress}
                                        size="lg"
                                        className="bg-orange-500 hover:bg-orange-600"
                                    >
                                        {geocoding ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Search className="w-4 h-4 mr-2" />
                                        )}
                                        {geocoding ? 'Buscando...' : 'Auto-preencher'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Digite o endereço completo e clique em "Auto-preencher" para buscar o bairro
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="establishmentNeighborhood">Bairro</Label>
                                    <Input
                                        id="establishmentNeighborhood"
                                        value={establishmentInfo.establishmentNeighborhood}
                                        readOnly
                                        disabled
                                        placeholder="Auto-preenchido"
                                        className="bg-muted"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="establishmentCity">Cidade</Label>
                                    <Input
                                        id="establishmentCity"
                                        value={establishmentInfo.establishmentCity}
                                        readOnly
                                        disabled
                                        placeholder="Auto-preenchido"
                                        className="bg-muted"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="establishmentState">Estado</Label>
                                    <Input
                                        id="establishmentState"
                                        value={establishmentInfo.establishmentState}
                                        readOnly
                                        disabled
                                        placeholder="Auto-preenchido"
                                        className="bg-muted"
                                    />
                                </div>
                            </div>

                            {establishmentInfo.establishmentNeighborhood && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-900/20 border border-green-500/30">
                                    <Check className="w-4 h-4 text-green-400" />
                                    <p className="text-sm text-green-400">
                                        Bairro identificado: <strong>{establishmentInfo.establishmentNeighborhood}</strong>
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 border-t">
                                <Button
                                    onClick={handleSaveAddress}
                                    size="lg"
                                    disabled={savingAddress || !establishmentInfo.establishmentAddress}
                                    className="bg-orange-500 hover:bg-orange-600"
                                >
                                    {savingAddress ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Home className="w-4 h-4 mr-2" />
                                    )}
                                    {savingAddress ? 'Salvando...' : 'Salvar Endereço'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
