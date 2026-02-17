'use client';

import { Bell } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';

interface NotificationPreviewProps {
    title: string;
    body: string;
    imageUrl?: string;
}

export function NotificationPreview({ title, body, imageUrl }: NotificationPreviewProps) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Preview da Notificação:</p>
            <div className="max-w-sm mx-auto">
                <Card className="bg-white shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                                    <Bell className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{title || 'Título da notificação'}</p>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{body || 'Mensagem da notificação aparecerá aqui...'}</p>
                                {imageUrl && (
                                    <div className="mt-2 relative w-full h-32 rounded overflow-hidden">
                                        <Image
                                            src={imageUrl}
                                            alt="Notification"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                )}
                                <p className="text-xs text-gray-400 mt-2">agora</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
