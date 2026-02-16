'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Truck, Phone, AlertCircle, Save } from 'lucide-react';

export default function DeliverySettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDeliveryPerson, setIsDeliveryPerson] = useState(false);
    const [licenseNumber, setLicenseNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [vehicleType, setVehicleType] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/delivery-settings');

            if (!res.ok) {
                if (res.status === 403) {
                    setIsDeliveryPerson(false);
                    setLoading(false);
                    return;
                }
                throw new Error('Erro ao carregar configurações');
            }

            const data = await res.json();
            setIsDeliveryPerson(true);
            setLicenseNumber(data.user?.licenseNumber || '');
            setPhone(data.user?.phone || '');
            setVehicleType(data.user?.vehicleType || '');
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

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/delivery-settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseNumber: licenseNumber.trim() || null,
                    phone: phone.trim() || null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao salvar');
            }

            toast({
                title: 'Sucesso',
                description: 'Configurações atualizadas com sucesso!',
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

    if (!isDeliveryPerson) {
        return (
            <div className="max-w-2xl mx-auto p-6">
                <Card className="border-yellow-500/30">
                    <CardContent className="pt-6">
                        <div className="text-center">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                            <p className="text-muted-foreground">
                                Esta página é exclusiva para entregadores.
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
        <div className="max-w-2xl mx-auto space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Configurações do Entregador</h1>
                <p className="text-muted-foreground">
                    Gerencie suas informações de contato e veículo
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        Informações do Veículo
                    </CardTitle>
                    <CardDescription>
                        Atualize os dados do seu veículo de entrega
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="vehicleType">Tipo de Veículo</Label>
                        <Input
                            id="vehicleType"
                            value={vehicleType}
                            disabled
                            className="bg-muted cursor-not-allowed"
                            placeholder="Não configurado"
                        />
                        <p className="text-xs text-muted-foreground">
                            O tipo de veículo não pode ser alterado por aqui
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="licenseNumber">Placa do Veículo</Label>
                        <Input
                            id="licenseNumber"
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            placeholder="Ex: ABC-1234"
                            maxLength={8}
                        />
                        <p className="text-xs text-muted-foreground">
                            Digite a placa do veículo que você utiliza para entregas
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        Dados de Contato
                    </CardTitle>
                    <CardDescription>
                        Mantenha seu telefone atualizado para contato com clientes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Ex: (11) 99999-9999"
                        />
                        <p className="text-xs text-muted-foreground">
                            Este número será usado para contato durante as entregas
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 text-lg bg-orange-500 hover:bg-orange-600"
            >
                {saving ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Salvando...
                    </>
                ) : (
                    <>
                        <Save className="w-5 h-5 mr-2" />
                        Salvar Alterações
                    </>
                )}
            </Button>
        </div>
    );
}
