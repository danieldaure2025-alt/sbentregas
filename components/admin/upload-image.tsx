'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface UploadImageProps {
    onUploadComplete: (url: string) => void;
    currentImageUrl?: string;
}

export function UploadImage({ onUploadComplete, currentImageUrl }: UploadImageProps) {
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(currentImageUrl || null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const validateFile = (file: File): string | null => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            return 'Formato inválido. Use JPG, PNG ou WebP.';
        }

        if (file.size > maxSize) {
            return 'Arquivo muito grande. Máximo 5MB.';
        }

        return null;
    };

    const handleUpload = async (file: File) => {
        const error = validateFile(file);
        if (error) {
            toast({ title: 'Erro', description: error, variant: 'destructive' });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao fazer upload');
            }

            const data = await response.json();
            setImagePreview(data.url);
            onUploadComplete(data.url);
            toast({ title: 'Sucesso!', description: 'Imagem enviada com sucesso' });
        } catch (error) {
            toast({
                title: 'Erro',
                description: (error as Error).message,
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleUpload(file);
        }
    };

    const handleRemove = () => {
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
            />

            {imagePreview ? (
                <div className="relative w-full h-48 border-2 border-gray-300 rounded-lg overflow-hidden">
                    <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                    />
                    <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemove}
                        disabled={uploading}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragActive
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-300 hover:border-orange-400'
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                            <p className="text-sm text-gray-600">Enviando...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-700">
                                    Arraste uma imagem ou clique para selecionar
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    JPG, PNG ou WebP (máx. 5MB)
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
