'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_SYSTEM_SETTINGS } from '@/lib/constants';
import { DollarSign, Loader2, MapPin, Percent, Plus, Settings as SettingsIcon, ImagePlus, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState, useRef, useCallback } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    baseFee: DEFAULT_SYSTEM_SETTINGS.BASE_FEE,
    pricePerKm: DEFAULT_SYSTEM_SETTINGS.PRICE_PER_KM,
    platformFeePercentage: DEFAULT_SYSTEM_SETTINGS.PLATFORM_FEE_PERCENTAGE * 100,
    extraStopFee: DEFAULT_SYSTEM_SETTINGS.EXTRA_STOP_FEE,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pricing' | 'routing' | 'carousel'>('pricing');
  const { toast } = useToast();

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

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'pricing'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          💰 Taxas e Preços
        </button>
        <button
          onClick={() => setActiveTab('routing')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'routing'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          🗺️ Otimização de Rotas
        </button>
        <button
          onClick={() => setActiveTab('carousel')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'carousel'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          🖼️ Carrossel de Logos
        </button>
      </div>

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <>
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
              <p>• A taxa base é cobrada em todas as entregas independente da distância</p>
              <p>• O preço por km é multiplicado pela distância calculada entre origem e destino</p>
              <p>• A taxa da plataforma é calculada sobre o valor da taxa de entrega (base + distância)</p>
              <p>• O entregador recebe apenas a taxa de entrega (sem a taxa da plataforma)</p>
              <p>• Alterações afetam apenas novos pedidos criados após salvar</p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Routing Tab */}
      {activeTab === 'routing' && <RoutingSettingsSection />}

      {/* Carousel Tab */}
      {activeTab === 'carousel' && <CarouselSettingsSection />}
    </div>
  );
}

// ======================================================================
// Routing Optimization Settings Sub-Component
// ======================================================================

interface RoutingSetting {
  key: string;
  label: string;
  value: string;
  default: string;
}

function RoutingSettingsSection() {
  const [routingSettings, setRoutingSettings] = useState<RoutingSetting[]>([]);
  const [loadingRouting, setLoadingRouting] = useState(true);
  const [savingRouting, setSavingRouting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRouting = async () => {
      try {
        const res = await fetch('/api/settings/routing');
        if (res.ok) {
          const data = await res.json();
          setRoutingSettings(data.settings || []);
        }
      } catch (error) {
        console.error('Error fetching routing settings:', error);
      } finally {
        setLoadingRouting(false);
      }
    };
    fetchRouting();
  }, []);

  const handleRoutingChange = (key: string, value: string) => {
    setRoutingSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
  };

  const handleSaveRouting = async () => {
    setSavingRouting(true);
    try {
      const settingsObj: Record<string, string> = {};
      routingSettings.forEach((s) => {
        settingsObj[s.key] = s.value;
      });

      const res = await fetch('/api/settings/routing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsObj }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Roteirização Salva',
          description: 'Configurações de roteirização atualizadas com sucesso!',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao salvar roteirização',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving routing settings:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar roteirização',
        variant: 'destructive',
      });
    } finally {
      setSavingRouting(false);
    }
  };

  const isEnabled = routingSettings.find((s) => s.key === 'ROUTING_ENABLED')?.value === 'true';

  const getIcon = (key: string) => {
    const icons: Record<string, string> = {
      ROUTING_MAX_GROUPING_DISTANCE_KM: '📏',
      ROUTING_MAX_DETOUR_DISTANCE_KM: '↩️',
      ROUTING_MAX_ADDITIONAL_TIME_MIN: '⏱️',
      ROUTING_MAX_ORDERS_PER_ROUTE: '📦',
      ROUTING_BEARING_TOLERANCE_DEG: '🧭',
      ROUTING_AVG_SPEED_KMH: '🚗',
      ROUTING_AVG_DELIVERY_TIME_MIN: '⏳',
      ROUTING_ENABLED: '🔀',
    };
    return icons[key] || '⚙️';
  };

  const getUnit = (key: string) => {
    if (key.includes('DISTANCE') || key.includes('KM')) return 'km';
    if (key.includes('TIME') || key.includes('MIN')) return 'min';
    if (key.includes('DEG')) return '°';
    if (key.includes('SPEED') || key.includes('KMH')) return 'km/h';
    if (key.includes('ORDERS')) return 'pedidos';
    return '';
  };

  if (loadingRouting) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isEnabled ? 'border-blue-500/30' : 'border-muted opacity-75'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>🗺️</span>
              <span>Otimização de Rotas</span>
            </CardTitle>
            <CardDescription>
              Configure o agrupamento automático de pedidos e sugestões de rota
            </CardDescription>
          </div>
          <button
            onClick={() => handleRoutingChange('ROUTING_ENABLED', isEnabled ? 'false' : 'true')}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${isEnabled ? 'bg-blue-500' : 'bg-muted'
              }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${isEnabled ? 'translate-x-8' : 'translate-x-1'
                }`}
            />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routingSettings
            .filter((s) => s.key !== 'ROUTING_ENABLED')
            .map((setting) => (
              <div key={setting.key} className="space-y-2">
                <Label className="flex items-center space-x-2 text-sm">
                  <span>{getIcon(setting.key)}</span>
                  <span>{setting.label}</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step={setting.key.includes('ORDERS') ? '1' : '0.5'}
                    min="0"
                    value={setting.value}
                    onChange={(e) => handleRoutingChange(setting.key, e.target.value)}
                    disabled={!isEnabled}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground min-w-[40px]">
                    {getUnit(setting.key)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Padrão: {setting.default} {getUnit(setting.key)}
                </p>
              </div>
            ))}
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-blue-400">ℹ️ Como funciona</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Pedidos próximos são agrupados automaticamente para o mesmo entregador</li>
            <li>Entregadores em rota recebem sugestões de novos pedidos próximos</li>
            <li>A direção (bearing) garante que os pedidos estão no mesmo sentido de viagem</li>
            <li>Limites de tempo e distância protegem contra atrasos nas entregas</li>
          </ul>
        </div>

        <div className="pt-4 border-t">
          <Button
            onClick={handleSaveRouting}
            size="lg"
            disabled={savingRouting}
            variant={isEnabled ? 'default' : 'secondary'}
          >
            {savingRouting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SettingsIcon className="w-4 h-4" />
            )}
            {savingRouting ? 'Salvando...' : 'Salvar Roteirização'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ======================================================================
// Carousel Settings Sub-Component
// ======================================================================

interface CarouselImageItem {
  id: string;
  title: string | null;
  imageUrl: string;
  imageKey: string;
  sortOrder: number;
  isActive: boolean;
}

function CarouselSettingsSection() {
  const [images, setImages] = useState<CarouselImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch('/api/carousel');
      if (res.ok) {
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching carousel images:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Erro', description: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // 1. Obter presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true }),
      });

      if (!presignedRes.ok) throw new Error('Erro ao gerar URL de upload');
      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      // 2. Upload para S3
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Erro ao fazer upload da imagem');

      // 3. Construir URL pública
      const imageUrl = uploadUrl.split('?')[0];

      // 4. Salvar no banco
      const saveRes = await fetch('/api/carousel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          imageKey: cloud_storage_path,
          title: title || null,
        }),
      });

      if (!saveRes.ok) throw new Error('Erro ao salvar imagem');

      toast({ title: 'Sucesso', description: 'Imagem adicionada ao carrossel!' });
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchImages();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Erro', description: 'Erro ao fazer upload da imagem', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta imagem?')) return;

    try {
      const res = await fetch(`/api/carousel/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Sucesso', description: 'Imagem removida do carrossel!' });
        setImages((prev) => prev.filter((img) => img.id !== id));
      } else {
        throw new Error('Erro ao remover imagem');
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao remover imagem', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/carousel/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        setImages((prev) =>
          prev.map((img) => (img.id === id ? { ...img, isActive: !isActive } : img))
        );
        toast({ title: 'Sucesso', description: `Imagem ${!isActive ? 'ativada' : 'desativada'}!` });
      }
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao atualizar imagem', variant: 'destructive' });
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((img) => img.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const newImages = [...sorted];
    [newImages[index], newImages[swapIndex]] = [newImages[swapIndex], newImages[index]];

    // Atualizar sortOrder
    const updated = newImages.map((img, i) => ({ ...img, sortOrder: i }));
    setImages(updated);

    try {
      await fetch('/api/carousel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: updated.map((img) => ({ id: img.id, sortOrder: img.sortOrder })),
        }),
      });
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <Card className="border-orange-500/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ImagePlus className="w-5 h-5" />
            <span>Adicionar Imagem ao Carrossel</span>
          </CardTitle>
          <CardDescription>
            As imagens aparecerão na tela de login como um carrossel automático
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="carousel-title">Título (opcional)</Label>
            <Input
              id="carousel-title"
              placeholder="Ex: Parceiro XYZ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleUpload}
              className="hidden"
              id="carousel-file-input"
              disabled={uploading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Selecionar Imagem</>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Formatos: JPEG, PNG, WebP, GIF
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Images list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span>🖼️</span>
              <span>Imagens do Carrossel</span>
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {sortedImages.filter((i) => i.isActive).length} ativa(s) de {sortedImages.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedImages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImagePlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma imagem no carrossel</p>
              <p className="text-sm">Adicione imagens acima para exibir na tela de login</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedImages.map((image, index) => (
                <div
                  key={image.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${image.isActive
                      ? 'border-orange-500/20 bg-orange-500/5'
                      : 'border-muted bg-muted/30 opacity-60'
                    }`}
                >
                  {/* Preview */}
                  <div className="relative w-24 h-14 rounded-md overflow-hidden bg-black/20 flex-shrink-0">
                    <Image
                      src={image.imageUrl}
                      alt={image.title || `Imagem ${index + 1}`}
                      fill
                      className="object-contain"
                      sizes="96px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {image.title || `Imagem ${index + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Posição: {index + 1} • {image.isActive ? '✅ Ativa' : '⏸ Inativa'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(image.id, 'up')}
                      disabled={index === 0}
                      title="Mover para cima"
                      className="h-8 w-8"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReorder(image.id, 'down')}
                      disabled={index === sortedImages.length - 1}
                      title="Mover para baixo"
                      className="h-8 w-8"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(image.id, image.isActive)}
                      title={image.isActive ? 'Desativar' : 'Ativar'}
                      className="h-8 w-8"
                    >
                      {image.isActive ? (
                        <Eye className="w-4 h-4 text-green-500" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(image.id)}
                      title="Remover"
                      className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
