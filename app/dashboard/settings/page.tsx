'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, DollarSign, Percent, MapPin, Loader2, Plus } from 'lucide-react';
import { DEFAULT_SYSTEM_SETTINGS } from '@/lib/constants';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    baseFee: DEFAULT_SYSTEM_SETTINGS.BASE_FEE,
    pricePerKm: DEFAULT_SYSTEM_SETTINGS.PRICE_PER_KM,
    platformFeePercentage: DEFAULT_SYSTEM_SETTINGS.PLATFORM_FEE_PERCENTAGE * 100,
    extraStopFee: DEFAULT_SYSTEM_SETTINGS.EXTRA_STOP_FEE,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Carregar configurações do banco de dados
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings({
            baseFee: data.BASE_FEE ? parseFloat(data.BASE_FEE) : DEFAULT_SYSTEM_SETTINGS.BASE_FEE,
            pricePerKm: data.PRICE_PER_KM ? parseFloat(data.PRICE_PER_KM) : DEFAULT_SYSTEM_SETTINGS.PRICE_PER_KM,
            platformFeePercentage: data.PLATFORM_FEE_PERCENTAGE 
              ? parseFloat(data.PLATFORM_FEE_PERCENTAGE) * 100 
              : DEFAULT_SYSTEM_SETTINGS.PLATFORM_FEE_PERCENTAGE * 100,
            extraStopFee: data.EXTRA_STOP_FEE ? parseFloat(data.EXTRA_STOP_FEE) : DEFAULT_SYSTEM_SETTINGS.EXTRA_STOP_FEE,
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({
      ...prev,
      [e.target.name]: parseFloat(e.target.value) || 0,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Configurações Salvas',
          description: 'As configurações foram atualizadas com sucesso!',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao salvar configurações',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações',
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

  // Calculate example
  const exampleDistance = 10;
  const exampleDeliveryFee = settings.baseFee + exampleDistance * settings.pricePerKm;
  const examplePlatformFee = exampleDeliveryFee * (settings.platformFeePercentage / 100);
  const exampleTotal = exampleDeliveryFee + examplePlatformFee;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Configure taxas, comissões e parâmetros da plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Taxas e Preços</span>
          </CardTitle>
          <CardDescription>
            Defina os valores cobrados nas entregas e comissões da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseFee" className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Taxa Base (R$)</span>
              </Label>
              <Input
                id="baseFee"
                name="baseFee"
                type="number"
                step="0.01"
                value={settings.baseFee}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">
                Valor fixo cobrado em todas as entregas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePerKm" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Preço por KM (R$)</span>
              </Label>
              <Input
                id="pricePerKm"
                name="pricePerKm"
                type="number"
                step="0.01"
                value={settings.pricePerKm}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">
                Valor cobrado por quilômetro rodado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="platformFeePercentage" className="flex items-center space-x-2">
                <Percent className="w-4 h-4" />
                <span>Taxa da Plataforma (%)</span>
              </Label>
              <Input
                id="platformFeePercentage"
                name="platformFeePercentage"
                type="number"
                step="0.1"
                value={settings.platformFeePercentage}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">
                Percentual cobrado sobre o valor da entrega
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="extraStopFee" className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Taxa Parada Adicional (R$)</span>
              </Label>
              <Input
                id="extraStopFee"
                name="extraStopFee"
                type="number"
                step="0.01"
                value={settings.extraStopFee}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">
                Valor cobrado por cada parada adicional
              </p>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} size="lg" disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <SettingsIcon className="w-4 h-4" />
              )}
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-500/30 bg-card">
        <CardHeader>
          <CardTitle>Exemplo de Cálculo</CardTitle>
          <CardDescription>
            Simulação de preço para uma entrega de {exampleDistance} km
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxa Base:</span>
            <span className="font-medium">R$ {settings.baseFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Distância ({exampleDistance} km × R$ {settings.pricePerKm.toFixed(2)}):
            </span>
            <span className="font-medium">
              R$ {(exampleDistance * settings.pricePerKm).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal (Taxa de Entrega):</span>
            <span className="font-medium">R$ {exampleDeliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Taxa da Plataforma ({settings.platformFeePercentage}%):
            </span>
            <span className="font-medium">R$ {examplePlatformFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-3 border-t">
            <span className="font-semibold text-lg">Total para o Cliente:</span>
            <span className="font-bold text-2xl text-orange-500">
              R$ {exampleTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t bg-green-900/20 p-3 rounded-lg">
            <span className="font-medium">Entregador Recebe:</span>
            <span className="font-bold text-lg text-green-400">
              R$ {exampleDeliveryFee.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • A taxa base é cobrada em todas as entregas independente da distância
          </p>
          <p>
            • O preço por km é multiplicado pela distância calculada entre origem e destino
          </p>
          <p>
            • A taxa da plataforma é calculada sobre o valor da taxa de entrega (base + distância)
          </p>
          <p>
            • O entregador recebe apenas a taxa de entrega (sem a taxa da plataforma)
          </p>
          <p>
            • Alterações afetam apenas novos pedidos criados após salvar
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
