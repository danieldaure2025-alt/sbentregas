'use client';

import { Loading } from '@/components/shared/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
    Bell,
    Bike,
    Clock,
    Eye,
    EyeOff,
    Image as ImageIcon,
    Link as LinkIcon,
    Loader2,
    Megaphone,
    Package,
    Plus,
    RefreshCw,
    Send,
    Star,
    Trash2,
    Users,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface Announcement {
    id: string;
    title: string;
    message: string;
    imageUrl?: string | null;
    targetAudience: string;
    linkUrl?: string | null;
    linkType?: string | null;
    type: string;
    isImportant: boolean;
    isActive: boolean;
    expiresAt?: string | null;
    sentAt: string;
    createdBy: string;
}

const AUDIENCE_LABELS: Record<string, string> = {
    ALL: 'Todos',
    CLIENTS: 'Clientes',
    DELIVERY_PERSONS: 'Entregadores',
    ESTABLISHMENTS: 'Estabelecimentos',
};

const AUDIENCE_ICONS: Record<string, any> = {
    ALL: Users,
    CLIENTS: Users,
    DELIVERY_PERSONS: Bike,
    ESTABLISHMENTS: Package,
};

const CATEGORY_LABELS: Record<string, string> = {
    INFORMATIVA: 'Informativa',
    URGENTE: 'Urgente',
    PROMOCIONAL: 'Promocional',
};

const CATEGORY_COLORS: Record<string, string> = {
    INFORMATIVA: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    URGENTE: 'text-red-400 bg-red-500/10 border-red-500/30',
    PROMOCIONAL: 'text-green-400 bg-green-500/10 border-green-500/30',
};

export default function CommunicationsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Notification form
    const [notifTitle, setNotifTitle] = useState('');
    const [notifBody, setNotifBody] = useState('');
    const [notifAudience, setNotifAudience] = useState('ALL');
    const [notifCategory, setNotifCategory] = useState('INFORMATIVA');
    const [sendingNotif, setSendingNotif] = useState(false);

    // Announcement form
    const [formTitle, setFormTitle] = useState('');
    const [formMessage, setFormMessage] = useState('');
    const [formAudience, setFormAudience] = useState('ALL');
    const [formCategory, setFormCategory] = useState('INFORMATIVA');
    const [formImageUrl, setFormImageUrl] = useState('');
    const [formLinkUrl, setFormLinkUrl] = useState('');
    const [formIsImportant, setFormIsImportant] = useState(false);
    const [formSendPush, setFormSendPush] = useState(false);
    const [formExpiresAt, setFormExpiresAt] = useState('');

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/announcements?activeOnly=false&includeExpired=true');
            if (!res.ok) {
                if (res.status === 403 || res.status === 401) {
                    router.push('/dashboard');
                    return;
                }
                throw new Error('Erro ao carregar');
            }
            const data = await res.json();
            setAnnouncements(data.announcements || []);
        } catch (error) {
            toast({ title: 'Erro', description: 'Não foi possível carregar os comunicados', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [router, toast]);

    useEffect(() => {
        fetchAnnouncements();
    }, [fetchAnnouncements]);

    const handleSendNotification = async () => {
        if (!notifTitle.trim() || !notifBody.trim()) {
            toast({ title: 'Erro', description: 'Preencha título e mensagem', variant: 'destructive' });
            return;
        }

        setSendingNotif(true);
        try {
            const res = await fetch('/api/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: notifTitle,
                    body: notifBody,
                    targetAudience: notifAudience,
                    category: notifCategory,
                    type: 'ADMIN_NOTICE',
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao enviar');

            toast({
                title: '✅ Notificação enviada!',
                description: `Enviada para ${data.targetUsers} usuários. Push: ${data.pushSent} sucesso, ${data.pushFailed} falhas.`,
            });

            setNotifTitle('');
            setNotifBody('');
            setNotifAudience('ALL');
            setNotifCategory('INFORMATIVA');
        } catch (error) {
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro ao enviar notificação',
                variant: 'destructive',
            });
        } finally {
            setSendingNotif(false);
        }
    };

    const handleCreateAnnouncement = async () => {
        if (!formTitle.trim() || !formMessage.trim()) {
            toast({ title: 'Erro', description: 'Preencha título e mensagem', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/admin/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formTitle,
                    message: formMessage,
                    targetAudience: formAudience,
                    type: formCategory,
                    imageUrl: formImageUrl || undefined,
                    linkUrl: formLinkUrl || undefined,
                    isImportant: formIsImportant,
                    sendPush: formSendPush,
                    expiresAt: formExpiresAt || undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao criar');

            toast({
                title: '✅ Comunicado criado!',
                description: formSendPush || formIsImportant
                    ? `Push enviado: ${data.pushSent} sucesso, ${data.pushFailed} falhas.`
                    : 'Comunicado criado com sucesso.',
            });

            // Reset form
            setFormTitle('');
            setFormMessage('');
            setFormAudience('ALL');
            setFormCategory('INFORMATIVA');
            setFormImageUrl('');
            setFormLinkUrl('');
            setFormIsImportant(false);
            setFormSendPush(false);
            setFormExpiresAt('');
            setShowCreateForm(false);
            fetchAnnouncements();
        } catch (error) {
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Erro ao criar comunicado',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleAnnouncement = async (id: string, isActive: boolean) => {
        setTogglingId(id);
        try {
            const res = await fetch('/api/admin/announcements', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: !isActive }),
            });

            if (!res.ok) throw new Error('Erro ao atualizar');

            toast({ title: 'Sucesso', description: `Comunicado ${!isActive ? 'ativado' : 'desativado'}` });
            fetchAnnouncements();
        } catch (error) {
            toast({ title: 'Erro', description: 'Erro ao atualizar comunicado', variant: 'destructive' });
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este comunicado?')) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' });

            if (!res.ok) throw new Error('Erro ao excluir');

            toast({ title: 'Sucesso', description: 'Comunicado excluído' });
            fetchAnnouncements();
        } catch (error) {
            toast({ title: 'Erro', description: 'Erro ao excluir comunicado', variant: 'destructive' });
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (loading) return <Loading />;

    const activeAnnouncements = announcements.filter(a => a.isActive);
    const inactiveAnnouncements = announcements.filter(a => !a.isActive);

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Comunicados & Notificações</h1>
                    <p className="text-foreground/60">Envie notificações e gerencie comunicados</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchAnnouncements}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="notifications" className="space-y-4">
                <TabsList className="bg-card border border-border">
                    <TabsTrigger value="notifications" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <Bell className="h-4 w-4 mr-2" />
                        Enviar Notificação
                    </TabsTrigger>
                    <TabsTrigger value="announcements" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <Megaphone className="h-4 w-4 mr-2" />
                        Comunicados ({activeAnnouncements.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <Clock className="h-4 w-4 mr-2" />
                        Histórico
                    </TabsTrigger>
                </TabsList>

                {/* === TAB: Enviar Notificação Push === */}
                <TabsContent value="notifications" className="space-y-4">
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="text-foreground flex items-center gap-2">
                                <Send className="h-5 w-5 text-orange-500" />
                                Enviar Notificação Push
                            </CardTitle>
                            <CardDescription>Envie notificações push diretamente para os dispositivos dos usuários</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Título *</label>
                                <input
                                    type="text"
                                    value={notifTitle}
                                    onChange={(e) => setNotifTitle(e.target.value)}
                                    placeholder="Ex: Novidade na plataforma!"
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Mensagem *</label>
                                <textarea
                                    value={notifBody}
                                    onChange={(e) => setNotifBody(e.target.value)}
                                    placeholder="Escreva a mensagem da notificação..."
                                    rows={3}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground/80 mb-1">Público-alvo</label>
                                    <select
                                        value={notifAudience}
                                        onChange={(e) => setNotifAudience(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    >
                                        <option value="ALL">Todos</option>
                                        <option value="CLIENTS">Clientes</option>
                                        <option value="DELIVERY_PERSONS">Entregadores</option>
                                        <option value="ESTABLISHMENTS">Estabelecimentos</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground/80 mb-1">Categoria</label>
                                    <select
                                        value={notifCategory}
                                        onChange={(e) => setNotifCategory(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    >
                                        <option value="INFORMATIVA">ℹ️ Informativa</option>
                                        <option value="URGENTE">🚨 Urgente</option>
                                        <option value="PROMOCIONAL">🎉 Promocional</option>
                                    </select>
                                </div>
                            </div>

                            <Button
                                onClick={handleSendNotification}
                                disabled={sendingNotif || !notifTitle.trim() || !notifBody.trim()}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3"
                            >
                                {sendingNotif ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    <Send className="h-5 w-5 mr-2" />
                                )}
                                {sendingNotif ? 'Enviando...' : 'Enviar Notificação Push'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* === TAB: Comunicados === */}
                <TabsContent value="announcements" className="space-y-4">
                    {/* Botão criar */}
                    {!showCreateForm && (
                        <Button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Comunicado
                        </Button>
                    )}

                    {/* Formulário de criação */}
                    {showCreateForm && (
                        <Card className="bg-card border-orange-500/30">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-foreground flex items-center gap-2">
                                        <Plus className="h-5 w-5 text-orange-500" />
                                        Novo Comunicado
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground/80 mb-1">Título *</label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="Título do comunicado"
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground/80 mb-1">Mensagem *</label>
                                    <textarea
                                        value={formMessage}
                                        onChange={(e) => setFormMessage(e.target.value)}
                                        placeholder="Conteúdo do comunicado..."
                                        rows={4}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">Público-alvo</label>
                                        <select
                                            value={formAudience}
                                            onChange={(e) => setFormAudience(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        >
                                            <option value="ALL">Todos</option>
                                            <option value="CLIENTS">Clientes</option>
                                            <option value="DELIVERY_PERSONS">Entregadores</option>
                                            <option value="ESTABLISHMENTS">Estabelecimentos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">Categoria</label>
                                        <select
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        >
                                            <option value="INFORMATIVA">ℹ️ Informativa</option>
                                            <option value="URGENTE">🚨 Urgente</option>
                                            <option value="PROMOCIONAL">🎉 Promocional</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">Expira em</label>
                                        <input
                                            type="datetime-local"
                                            value={formExpiresAt}
                                            onChange={(e) => setFormExpiresAt(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                                            <ImageIcon className="h-3.5 w-3.5 inline mr-1" />
                                            URL da Imagem (opcional)
                                        </label>
                                        <input
                                            type="url"
                                            value={formImageUrl}
                                            onChange={(e) => setFormImageUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                                            <LinkIcon className="h-3.5 w-3.5 inline mr-1" />
                                            URL do Link (opcional)
                                        </label>
                                        <input
                                            type="url"
                                            value={formLinkUrl}
                                            onChange={(e) => setFormLinkUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formIsImportant}
                                            onChange={(e) => setFormIsImportant(e.target.checked)}
                                            className="w-4 h-4 rounded border-border accent-orange-500"
                                        />
                                        <Star className="h-4 w-4 text-yellow-500" />
                                        <span className="text-sm text-foreground">Marcar como importante</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formSendPush}
                                            onChange={(e) => setFormSendPush(e.target.checked)}
                                            className="w-4 h-4 rounded border-border accent-orange-500"
                                        />
                                        <Bell className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm text-foreground">Enviar push notification</span>
                                    </label>
                                </div>

                                <Button
                                    onClick={handleCreateAnnouncement}
                                    disabled={submitting || !formTitle.trim() || !formMessage.trim()}
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3"
                                >
                                    {submitting ? (
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    ) : (
                                        <Megaphone className="h-5 w-5 mr-2" />
                                    )}
                                    {submitting ? 'Criando...' : 'Criar Comunicado'}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Lista de comunicados ativos */}
                    {activeAnnouncements.length === 0 && !showCreateForm ? (
                        <Card className="bg-card">
                            <CardContent className="py-12 text-center">
                                <Megaphone className="h-12 w-12 mx-auto mb-4 text-foreground/30" />
                                <p className="text-foreground/60">Nenhum comunicado ativo</p>
                                <p className="text-sm text-foreground/40 mt-1">Crie um novo comunicado para seus usuários</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {activeAnnouncements.map((announcement) => {
                                const AudienceIcon = AUDIENCE_ICONS[announcement.targetAudience] || Users;
                                return (
                                    <Card key={announcement.id} className="bg-card hover:border-orange-500/30 transition-colors">
                                        <CardContent className="pt-5">
                                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                                                <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {announcement.isImportant && (
                                                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                        )}
                                                        <h3 className="font-semibold text-foreground text-lg">{announcement.title}</h3>
                                                    </div>
                                                    <p className="text-foreground/70 text-sm whitespace-pre-wrap">{announcement.message}</p>
                                                    <div className="flex items-center gap-3 flex-wrap text-xs">
                                                        <span className={`px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[announcement.type] || 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                                                            {CATEGORY_LABELS[announcement.type] || announcement.type}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-foreground/50">
                                                            <AudienceIcon className="h-3.5 w-3.5" />
                                                            {AUDIENCE_LABELS[announcement.targetAudience] || announcement.targetAudience}
                                                        </span>
                                                        <span className="text-foreground/40">
                                                            {formatDate(announcement.sentAt)}
                                                        </span>
                                                        {announcement.expiresAt && (
                                                            <span className="text-foreground/40 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                Expira: {formatDate(announcement.expiresAt)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {announcement.imageUrl && (
                                                        <div className="mt-2">
                                                            <img
                                                                src={announcement.imageUrl}
                                                                alt="Imagem do comunicado"
                                                                className="max-h-32 rounded-lg border border-border"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleToggleAnnouncement(announcement.id, announcement.isActive)}
                                                        disabled={togglingId === announcement.id}
                                                        className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                                                    >
                                                        {togglingId === announcement.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <EyeOff className="h-4 w-4" />
                                                        )}
                                                        <span className="ml-1 hidden sm:inline">Desativar</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                        disabled={deletingId === announcement.id}
                                                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                                    >
                                                        {deletingId === announcement.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* === TAB: Histórico === */}
                <TabsContent value="history" className="space-y-4">
                    <Card className="bg-card">
                        <CardHeader>
                            <CardTitle className="text-foreground">Todos os Comunicados</CardTitle>
                            <CardDescription>Histórico completo incluindo comunicados desativados</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {announcements.length === 0 ? (
                                <div className="text-center py-8 text-foreground/60">
                                    <Clock className="h-12 w-12 mx-auto mb-4 text-foreground/30" />
                                    <p>Nenhum comunicado encontrado</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {announcements.map((announcement) => {
                                        const AudienceIcon = AUDIENCE_ICONS[announcement.targetAudience] || Users;
                                        const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();
                                        return (
                                            <div
                                                key={announcement.id}
                                                className={`border rounded-lg p-4 transition-colors ${announcement.isActive && !isExpired
                                                        ? 'border-border hover:border-orange-500/30'
                                                        : 'border-border/50 opacity-60'
                                                    }`}
                                            >
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {announcement.isImportant && (
                                                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                                            )}
                                                            <h4 className="font-semibold text-foreground">{announcement.title}</h4>
                                                            {!announcement.isActive && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/30">
                                                                    Desativado
                                                                </span>
                                                            )}
                                                            {isExpired && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                                                                    Expirado
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-foreground/60 mt-1 line-clamp-2">{announcement.message}</p>
                                                        <div className="flex items-center gap-3 mt-2 text-xs">
                                                            <span className={`px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[announcement.type] || 'text-gray-400 bg-gray-500/10 border-gray-500/30'}`}>
                                                                {CATEGORY_LABELS[announcement.type] || announcement.type}
                                                            </span>
                                                            <span className="flex items-center gap-1 text-foreground/50">
                                                                <AudienceIcon className="h-3.5 w-3.5" />
                                                                {AUDIENCE_LABELS[announcement.targetAudience] || announcement.targetAudience}
                                                            </span>
                                                            <span className="text-foreground/40">{formatDate(announcement.sentAt)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleToggleAnnouncement(announcement.id, announcement.isActive)}
                                                            disabled={togglingId === announcement.id}
                                                            className={
                                                                announcement.isActive
                                                                    ? 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10'
                                                                    : 'border-green-500/50 text-green-400 hover:bg-green-500/10'
                                                            }
                                                        >
                                                            {togglingId === announcement.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : announcement.isActive ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                            <span className="ml-1 hidden sm:inline">
                                                                {announcement.isActive ? 'Desativar' : 'Ativar'}
                                                            </span>
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                                                            disabled={deletingId === announcement.id}
                                                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                                        >
                                                            {deletingId === announcement.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
