'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { UploadImage } from '@/components/admin/upload-image';
import { NotificationPreview } from '@/components/admin/notification-preview';
import { Send, Megaphone, History, Loader2, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';

interface Announcement {
    id: string;
    title: string;
    message: string;
    imageUrl: string | null;
    targetAudience: string;
    sentAt: string;
    isActive: boolean;
    isImportant: boolean;
    admin: { name: string; email: string };
}

interface PushNotification {
    id: string;
    title: string;
    body: string;
    imageUrl: string | null;
    targetAudience: string;
    sentAt: string;
    recipientCount: number;
    admin: { name: string; email: string };
}

export default function NotificationsPage() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('send');

    // Send Notification Tab
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [notifImageUrl, setNotifImageUrl] = useState('');
    const [notifAudience, setNotifAudience] = useState('ALL');
    const [sending, setSending] = useState(false);

    // Announcements Tab
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [announcementForm, setAnnouncementForm] = useState({
        title: '',
        message: '',
        imageUrl: '',
        targetAudience: 'ALL',
        isActive: true,
        isImportant: false,
    });
    const [savingAnnouncement, setSavingAnnouncement] = useState(false);

    // History Tab
    const [history, setHistory] = useState<PushNotification[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (activeTab === 'announcements') {
            fetchAnnouncements();
        } else if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchAnnouncements = async () => {
        setLoadingAnnouncements(true);
        try {
            const res = await fetch('/api/admin/announcements');
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data.announcements || []);
            }
        } catch (error) {
            console.error('Error fetching announcements:', error);
        } finally {
            setLoadingAnnouncements(false);
        }
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch('/api/admin/notifications/history');
            if (res.ok) {
                const data = await res.json();
                setHistory(data.notifications || []);
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSendNotification = async () => {
        if (!notifTitle || !notifBody) {
            toast({ title: 'Erro', description: 'Título e mensagem são obrigatórios', variant: 'destructive' });
            return;
        }

        setSending(true);
        try {
            const res = await fetch('/api/admin/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: notifTitle,
                    body: notifBody,
                    imageUrl: notifImageUrl || undefined,
                    targetAudience: notifAudience,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao enviar notificação');
            }

            const data = await res.json();
            toast({
                title: 'Sucesso!',
                description: `Notificação enviada para ${data.result.successCount} usuários`,
            });

            // Limpar formulário
            setNotifTitle('');
            setNotifBody('');
            setNotifImageUrl('');
            setNotifAudience('ALL');
        } catch (error) {
            toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setSending(false);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!announcementForm.title || !announcementForm.message || !announcementForm.imageUrl) {
            toast({ title: 'Erro', description: 'Título, mensagem e imagem são obrigatórios', variant: 'destructive' });
            return;
        }

        setSavingAnnouncement(true);
        try {
            const res = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcementForm),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao criar anúncio');
            }

            toast({ title: 'Sucesso!', description: 'Anúncio criado com sucesso' });
            setShowAnnouncementForm(false);
            setAnnouncementForm({
                title: '',
                message: '',
                imageUrl: '',
                targetAudience: 'ALL',
                isActive: true,
                isImportant: false,
            });
            fetchAnnouncements();
        } catch (error) {
            toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
        } finally {
            setSavingAnnouncement(false);
        }
    };

    const handleToggleAnnouncement = async (id: string, isActive: boolean) => {
        try {
            const res = await fetch('/api/admin/announcements', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive }),
            });

            if (!res.ok) throw new Error('Erro ao atualizar anúncio');

            toast({ title: 'Sucesso!', description: isActive ? 'Anúncio ativado' : 'Anúncio desativado' });
            fetchAnnouncements();
        } catch (error) {
            toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm('Tem certeza que deseja deletar este anúncio?')) return;

        try {
            const res = await fetch(`/api/admin/announcements?id=${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error('Erro ao deletar anúncio');

            toast({ title: 'Sucesso!', description: 'Anúncio deletado' });
            fetchAnnouncements();
        } catch (error) {
            toast({ title: 'Erro', description: (error as Error).message, variant: 'destructive' });
        }
    };

    const getAudienceLabel = (audience: string) => {
        switch (audience) {
            case 'CLIENTS': return 'Clientes';
            case 'DELIVERY_PERSONS': return 'Entregadores';
            case 'ALL': return 'Todos';
            default: return audience;
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-3xl font-bold">Notificações e Anúncios</h1>
                <p className="text-muted-foreground">Envie notificações push e crie anúncios para usuários</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="send" className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Enviar Notificação
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        Anúncios
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Histórico
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: ENVIAR NOTIFICAÇÃO PUSH */}
                <TabsContent value="send" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Nova Notificação Push</CardTitle>
                                <CardDescription>Envie uma notificação instantânea para os usuários</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="notif-title">Título *</Label>
                                    <Input
                                        id="notif-title"
                                        value={notifTitle}
                                        onChange={(e) => setNotifTitle(e.target.value)}
                                        placeholder="Ex: Nova atualização disponível!"
                                        maxLength={60}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{notifTitle.length}/60</p>
                                </div>

                                <div>
                                    <Label htmlFor="notif-body">Mensagem *</Label>
                                    <Textarea
                                        id="notif-body"
                                        value={notifBody}
                                        onChange={(e) => setNotifBody(e.target.value)}
                                        placeholder="Digite a mensagem da notificação..."
                                        rows={4}
                                        maxLength={200}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">{notifBody.length}/200</p>
                                </div>

                                <div>
                                    <Label>Imagem (opcional)</Label>
                                    <UploadImage
                                        onUploadComplete={(url) => setNotifImageUrl(url)}
                                        currentImageUrl={notifImageUrl}
                                    />
                                </div>

                                <div>
                                    <Label>Público-alvo *</Label>
                                    <RadioGroup value={notifAudience} onValueChange={setNotifAudience}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="ALL" id="all" />
                                            <Label htmlFor="all" className="font-normal cursor-pointer">Todos os usuários</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="CLIENTS" id="clients" />
                                            <Label htmlFor="clients" className="font-normal cursor-pointer">Apenas Clientes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="DELIVERY_PERSONS" id="delivery" />
                                            <Label htmlFor="delivery" className="font-normal cursor-pointer">Apenas Entregadores</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <Button
                                    onClick={handleSendNotification}
                                    disabled={sending || !notifTitle || !notifBody}
                                    className="w-full"
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Enviar Agora
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>

                        <div>
                            <NotificationPreview
                                title={notifTitle}
                                body={notifBody}
                                imageUrl={notifImageUrl || undefined}
                            />
                        </div>
                    </div>
                </TabsContent>

                {/* TAB 2: ANÚNCIOS */}
                <TabsContent value="announcements" className="space-y-4">
                    {!showAnnouncementForm ? (
                        <>
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-600">Crie anúncios para exibir no app</p>
                                <Button onClick={() => setShowAnnouncementForm(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Novo Anúncio
                                </Button>
                            </div>

                            {loadingAnnouncements ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                                </div>
                            ) : announcements.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center text-gray-500">
                                        Nenhum anúncio criado ainda
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-4">
                                    {announcements.map((announcement) => (
                                        <Card key={announcement.id}>
                                            <CardContent className="p-4">
                                                <div className="flex gap-4">
                                                    {announcement.imageUrl && (
                                                        <div className="relative w-32 h-32 flex-shrink-0 rounded overflow-hidden">
                                                            <Image
                                                                src={announcement.imageUrl}
                                                                alt={announcement.title}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h3 className="font-semibold text-lg">{announcement.title}</h3>
                                                                <p className="text-sm text-gray-600 mt-1">{announcement.message}</p>
                                                                <div className="flex gap-2 mt-2">
                                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                                        {getAudienceLabel(announcement.targetAudience)}
                                                                    </span>
                                                                    <span className={`text-xs px-2 py-1 rounded ${announcement.isActive
                                                                        ? 'bg-green-100 text-green-700'
                                                                        : 'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {announcement.isActive ? 'Ativo' : 'Inativo'}
                                                                    </span>
                                                                    {announcement.isImportant && (
                                                                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                                                                            📢 Importante
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleToggleAnnouncement(announcement.id, !announcement.isActive)}
                                                                    title={announcement.isActive ? 'Desativar' : 'Ativar'}
                                                                >
                                                                    {announcement.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                                    className="text-red-600 hover:text-red-700"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Criar Novo Anúncio</CardTitle>
                                <CardDescription>Preencha as informações do anúncio</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="ann-title">Título *</Label>
                                    <Input
                                        id="ann-title"
                                        value={announcementForm.title}
                                        onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                        placeholder="Ex: Promoção de Verão!"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="ann-message">Descrição *</Label>
                                    <Textarea
                                        id="ann-message"
                                        value={announcementForm.message}
                                        onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                                        placeholder="Digite a descrição do anúncio..."
                                        rows={4}
                                    />
                                </div>

                                <div>
                                    <Label>Imagem *</Label>
                                    <UploadImage
                                        onUploadComplete={(url) => setAnnouncementForm({ ...announcementForm, imageUrl: url })}
                                        currentImageUrl={announcementForm.imageUrl}
                                    />
                                </div>

                                <div>
                                    <Label>Público-alvo *</Label>
                                    <RadioGroup value={announcementForm.targetAudience} onValueChange={(v) => setAnnouncementForm({ ...announcementForm, targetAudience: v })}>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="ALL" id="ann-all" />
                                            <Label htmlFor="ann-all" className="font-normal cursor-pointer">Todos</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="CLIENTS" id="ann-clients" />
                                            <Label htmlFor="ann-clients" className="font-normal cursor-pointer">Clientes</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="DELIVERY_PERSONS" id="ann-delivery" />
                                            <Label htmlFor="ann-delivery" className="font-normal cursor-pointer">Entregadores</Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="ann-active"
                                        checked={announcementForm.isActive}
                                        onCheckedChange={(checked) => setAnnouncementForm({ ...announcementForm, isActive: checked })}
                                    />
                                    <Label htmlFor="ann-active" className="font-normal cursor-pointer">Ativar imediatamente</Label>
                                </div>

                                <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <Switch
                                        id="ann-important"
                                        checked={announcementForm.isImportant}
                                        onCheckedChange={(checked) => setAnnouncementForm({ ...announcementForm, isImportant: checked })}
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor="ann-important" className="font-semibold cursor-pointer flex items-center gap-1">
                                            📢 Aviso Importante
                                        </Label>
                                        <p className="text-xs text-amber-700 mt-1">
                                            Envia notificação push automática para entregadores
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleCreateAnnouncement}
                                        disabled={savingAnnouncement}
                                    >
                                        {savingAnnouncement ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Salvando...
                                            </>
                                        ) : (
                                            'Criar Anúncio'
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowAnnouncementForm(false);
                                            setAnnouncementForm({
                                                title: '',
                                                message: '',
                                                imageUrl: '',
                                                targetAudience: 'ALL',
                                                isActive: true,
                                                isImportant: false,
                                            });
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* TAB 3: HISTÓRICO */}
                <TabsContent value="history">
                    {loadingHistory ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : history.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-gray-500">
                                Nenhuma notificação enviada ainda
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Notificações</CardTitle>
                                <CardDescription>Todas as notificações enviadas</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {history.map((notif) => (
                                        <div
                                            key={notif.id}
                                            className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-medium">{notif.title}</h4>
                                                    <p className="text-sm text-gray-600 mt-1">{notif.body}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                            {getAudienceLabel(notif.targetAudience)}
                                                        </span>
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                            {notif.recipientCount} destinatários
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right text-sm text-gray-500">
                                                    {new Date(notif.sentAt).toLocaleString('pt-BR')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
