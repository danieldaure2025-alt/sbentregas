'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, ImagePlus, X, Loader2, ScanText, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExtractedInfo {
  originAddress?: string;
  destinationAddress?: string;
  phone?: string;
  recipientName?: string;
  notes?: string;
  zipCode?: string;
  neighborhood?: string;
  city?: string;
}

interface CameraCaptureProps {
  onExtract: (info: ExtractedInfo) => void;
  onClose?: () => void;
}

export function CameraCapture({ onExtract, onClose }: CameraCaptureProps) {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione uma imagem',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 10MB',
          variant: 'destructive',
        });
        return;
      }

      setFile(selectedFile);
      setExtractedInfo(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, [toast]);

  const handleExtract = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/ocr/extract-delivery-info', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar imagem');
      }

      if (data.success && data.data) {
        setExtractedInfo(data.data);
        toast({
          title: 'Informações extraídas!',
          description: 'As informações foram identificadas na imagem',
        });
      } else {
        toast({
          title: 'Nenhuma informação encontrada',
          description: 'Não foi possível identificar informações de entrega na imagem',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao processar imagem',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseInfo = () => {
    if (extractedInfo) {
      onExtract(extractedInfo);
      toast({
        title: 'Informações aplicadas!',
        description: 'Os campos foram preenchidos automaticamente',
      });
    }
  };

  const handleReset = () => {
    setImage(null);
    setFile(null);
    setExtractedInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <Card className="bg-gray-900 border-orange-500/30">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScanText className="h-5 w-5 text-orange-500" />
            <span className="font-semibold text-white">Extrair Informações da Foto</span>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Image capture buttons */}
        {!image && (
          <div className="grid grid-cols-2 gap-3">
            {/* Camera button */}
            <div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                id="camera-input"
              />
              <label htmlFor="camera-input">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 flex-col gap-2 bg-gray-800 border-orange-500/50 hover:bg-orange-500/20 hover:border-orange-500 text-white cursor-pointer"
                  asChild
                >
                  <span>
                    <Camera className="h-8 w-8 text-orange-500" />
                    <span className="text-sm">Tirar Foto</span>
                  </span>
                </Button>
              </label>
            </div>

            {/* Gallery button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="gallery-input"
              />
              <label htmlFor="gallery-input">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-24 flex-col gap-2 bg-gray-800 border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-500 text-white cursor-pointer"
                  asChild
                >
                  <span>
                    <ImagePlus className="h-8 w-8 text-blue-500" />
                    <span className="text-sm">Galeria</span>
                  </span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {/* Image preview */}
        {image && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-gray-700">
              <img
                src={image}
                alt="Preview"
                className="w-full h-48 object-contain bg-gray-800"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleReset}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Extract button */}
            {!extractedInfo && (
              <Button
                type="button"
                onClick={handleExtract}
                disabled={isProcessing}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ScanText className="mr-2 h-4 w-4" />
                    Extrair Informações
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Extracted info preview */}
        {extractedInfo && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-3 space-y-2 text-sm">
              <h4 className="font-semibold text-green-400 flex items-center gap-2">
                <Check className="h-4 w-4" /> Informações Encontradas:
              </h4>
              
              {extractedInfo.originAddress && (
                <div className="text-gray-300">
                  <span className="text-gray-500">Origem:</span> {extractedInfo.originAddress}
                </div>
              )}
              
              {extractedInfo.destinationAddress && (
                <div className="text-gray-300">
                  <span className="text-gray-500">Destino:</span> {extractedInfo.destinationAddress}
                </div>
              )}
              
              {extractedInfo.phone && (
                <div className="text-gray-300">
                  <span className="text-gray-500">Telefone:</span> {extractedInfo.phone}
                </div>
              )}
              
              {extractedInfo.recipientName && (
                <div className="text-gray-300">
                  <span className="text-gray-500">Destinatário:</span> {extractedInfo.recipientName}
                </div>
              )}
              
              {extractedInfo.notes && (
                <div className="text-gray-300">
                  <span className="text-gray-500">Observações:</span> {extractedInfo.notes}
                </div>
              )}

              {!extractedInfo.originAddress && !extractedInfo.destinationAddress && !extractedInfo.phone && !extractedInfo.recipientName && (
                <div className="text-yellow-500">Nenhuma informação identificada na imagem.</div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Nova Foto
              </Button>
              <Button
                type="button"
                onClick={handleUseInfo}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="mr-2 h-4 w-4" />
                Usar Informações
              </Button>
            </div>
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center">
          Tire uma foto ou selecione uma imagem com informações de entrega para preenchimento automático.
        </p>
      </CardContent>
    </Card>
  );
}
