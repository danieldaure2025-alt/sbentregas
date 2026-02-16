'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/shared/loading';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Filter, CheckCircle, XCircle, Loader2, Star, Clock,
  FileText, QrCode, Building2, MapPin, Phone, Mail, Truck, ChevronDown, ChevronUp, Trash2, Bell
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { USER_ROLE_LABELS } from '@/lib/constants';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  // Documento
  documentType?: string;
  documentNumber?: string;
  // Entregador
  vehicleType?: string;
  licenseNumber?: string;
  rating?: number;
  totalDeliveries?: number;
  isOnline?: boolean;
  deliveryStatus?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: string;
  // PIX
  pixKeyType?: string;
  pixKey?: string;
  // Bank
  bankCode?: string;
  bankName?: string;
  agencyNumber?: string;
  accountNumber?: string;
  accountType?: string;
  accountHolder?: string;
  cpfCnpj?: string;
  // Establishment
  establishmentName?: string;
  establishmentAddress?: string;
  establishmentPhone?: string;
  establishmentCnpj?: string;
  // Client
  clientType?: string;
  clientAddress?: string;
  // Billing
  endOfDayBilling?: boolean;
  // Notifications
  emailNotificationsEnabled?: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { toast } = useToast();

  // Formatar CPF/CNPJ para exibição
  const formatDocument = (doc: string | undefined) => {
    if (!doc) return '-';
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') params.append('role', roleFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setUsers(data?.users ?? []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao atualizar status');
      }

      toast({
        title: 'Sucesso!',
        description: 'Status do usuário atualizado',
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleEndOfDayBilling = async (userId: string, currentValue: boolean) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/billing-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endOfDayBilling: !currentValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao atualizar configuração');
      }

      toast({
        title: 'Sucesso!',
        description: !currentValue
          ? 'Cobrança no final do dia ativada'
          : 'Cobrança no final do dia desativada',
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar configuração',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleNotifications = async (userId: string, currentValue: boolean) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/notification-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailNotificationsEnabled: !currentValue }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao atualizar notificações');
      }

      toast({
        title: 'Sucesso!',
        description: !currentValue
          ? 'Notificações por email ativadas'
          : 'Notificações por email desativadas',
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao atualizar notificações',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setDeletingUserId(userToDelete.id);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao excluir usuário');
      }

      toast({
        title: 'Sucesso!',
        description: 'Usuário excluído permanentemente',
      });

      setShowDeleteConfirm(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao excluir usuário',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'BLOCKED' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao rejeitar usuário');
      }

      toast({
        title: 'Usuário Rejeitado',
        description: 'A aprovação foi negada e o usuário foi bloqueado',
        variant: 'default',
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Erro ao rejeitar usuário',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">
          Aprove, edite ou bloqueie usuários da plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Usuários</CardTitle>
              <CardDescription>Total: {users?.length ?? 0} usuários</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Todos os Perfis</option>
                <option value="CLIENT">Clientes</option>
                <option value="DELIVERY_PERSON">Entregadores</option>
                <option value="ADMIN">Administradores</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Todos Status</option>
                <option value="ACTIVE">Ativos</option>
                <option value="PENDING_APPROVAL">Aguardando Aprovação</option>
                <option value="BLOCKED">Bloqueados</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users?.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum usuário encontrado"
              description="Nenhum usuário corresponde aos filtros selecionados"
            />
          ) : (
            <div className="space-y-4">
              {users?.map((user) => (
                <Card key={user.id} className="border-muted">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        {/* Cabeçalho do usuário */}
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-semibold text-lg">{user.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <StatusBadge status={user.role as any} type="user" />
                          <StatusBadge status={user.status as any} type="user" />
                          {user.role === 'DELIVERY_PERSON' && user.isOnline && (
                            <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/30">
                              🟢 Online
                            </span>
                          )}
                        </div>

                        {/* Informações básicas sempre visíveis */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {user?.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                          {user?.documentNumber && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="w-3 h-3" />
                              <span>{user.documentType}: {formatDocument(user.documentNumber)}</span>
                            </div>
                          )}
                        </div>

                        {/* Botão para expandir detalhes */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                          className="text-orange-500 hover:text-orange-400 p-0 h-auto"
                        >
                          {expandedUserId === user.id ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Ocultar detalhes
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              Ver todos os detalhes
                            </>
                          )}
                        </Button>

                        {/* Detalhes expandidos */}
                        {expandedUserId === user.id && (
                          <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-4 border border-muted">
                            {/* Informações do Entregador */}
                            {user.role === 'DELIVERY_PERSON' && (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-orange-500 flex items-center gap-2">
                                  <Truck className="w-4 h-4" />
                                  Dados do Entregador
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Veículo:</span>{' '}
                                    <span className="font-medium">{user.vehicleType || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">CNH:</span>{' '}
                                    <span className="font-medium">{user.licenseNumber || '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-medium">{user.rating?.toFixed(1) || '0.0'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Entregas:</span>{' '}
                                    <span className="font-medium">{user.totalDeliveries || 0}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Status:</span>{' '}
                                    <span className="font-medium">{user.deliveryStatus || 'OFFLINE'}</span>
                                  </div>
                                  {user.lastLocationUpdate && (
                                    <div>
                                      <span className="text-muted-foreground">Última localização:</span>{' '}
                                      <span className="font-medium">{new Date(user.lastLocationUpdate).toLocaleString('pt-BR')}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Dados PIX */}
                                {(user.pixKeyType || user.pixKey) && (
                                  <div className="pt-3 border-t border-muted">
                                    <h5 className="font-semibold text-sm text-blue-400 flex items-center gap-2 mb-2">
                                      <QrCode className="w-4 h-4" />
                                      Chave PIX
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Tipo:</span>{' '}
                                        <span className="font-medium">{user.pixKeyType || '-'}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Chave:</span>{' '}
                                        <span className="font-medium">{user.pixKey || '-'}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Dados Bancários TED */}
                                {(user.bankCode || user.bankName) && (
                                  <div className="pt-3 border-t border-muted">
                                    <h5 className="font-semibold text-sm text-purple-400 flex items-center gap-2 mb-2">
                                      <Building2 className="w-4 h-4" />
                                      Dados Bancários (TED)
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Banco:</span>{' '}
                                        <span className="font-medium">{user.bankCode} - {user.bankName || '-'}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Agência:</span>{' '}
                                        <span className="font-medium">{user.agencyNumber || '-'}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Conta:</span>{' '}
                                        <span className="font-medium">{user.accountNumber || '-'}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Tipo:</span>{' '}
                                        <span className="font-medium">{user.accountType || '-'}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Titular:</span>{' '}
                                        <span className="font-medium">{user.accountHolder || '-'}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">CPF/CNPJ:</span>{' '}
                                        <span className="font-medium">{formatDocument(user.cpfCnpj) || '-'}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Informações do Estabelecimento */}
                            {user.role === 'ESTABLISHMENT' && (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-orange-500 flex items-center gap-2">
                                  <Building2 className="w-4 h-4" />
                                  Dados do Estabelecimento
                                </h4>
                                <div className="grid grid-cols-1 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Nome:</span>{' '}
                                    <span className="font-medium">{user.establishmentName || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">CNPJ:</span>{' '}
                                    <span className="font-medium">{formatDocument(user.establishmentCnpj) || '-'}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-3 h-3 mt-1 text-muted-foreground" />
                                    <span>{user.establishmentAddress || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Telefone:</span>{' '}
                                    <span className="font-medium">{user.establishmentPhone || '-'}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Informações do Cliente */}
                            {user.role === 'CLIENT' && (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-sm text-orange-500">Dados do Cliente</h4>

                                {/* Phone number destacado se pendente */}
                                {user.phone && user.status === 'PENDING_APPROVAL' && (
                                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Phone className="w-4 h-4 text-yellow-500" />
                                      <span className="font-semibold text-sm text-yellow-500">Telefone para Contato</span>
                                    </div>
                                    <p className="font-mono text-lg text-white">{user.phone}</p>
                                    <p className="text-xs text-yellow-400 mt-1">
                                      ⚠️ Entre em contato para verificar identidade antes de aprovar
                                    </p>
                                  </div>
                                )}

                                {/* Phone number normal se JÁ aprovado */}
                                {user.phone && user.status !== 'PENDING_APPROVAL' && (
                                  <div>
                                    <span className="text-muted-foreground">Telefone:</span>{' '}
                                    <span className="font-medium">{user.phone}</span>
                                  </div>
                                )}

                                {/* Client Type */}
                                {user.clientType && (
                                  <div>
                                    <span className="text-muted-foreground">Tipo:</span>{' '}
                                    <span className="font-medium">
                                      {user.clientType === 'DELIVERY' ? '📦 Cliente Delivery' : '👤 Cliente Padrão'}
                                    </span>
                                  </div>
                                )}

                                {/* Client Address (for delivery clients) */}
                                {user.clientAddress && user.clientType === 'DELIVERY' && (
                                  <div>
                                    <span className="text-muted-foreground">Endereço de Coleta:</span>{' '}
                                    <div className="flex items-start gap-2 mt-1">
                                      <MapPin className="w-3 h-3 mt-1 text-orange-500" />
                                      <span className="font-medium text-sm">{user.clientAddress}</span>
                                    </div>
                                  </div>
                                )}

                                {/* End of Day Billing */}
                                <div className="flex items-center gap-2">
                                  <Clock className={`w-4 h-4 ${user.endOfDayBilling ? 'text-green-500' : 'text-gray-400'}`} />
                                  <span className={`text-sm ${user.endOfDayBilling ? 'text-green-500' : 'text-muted-foreground'}`}>
                                    {user.endOfDayBilling ? 'Cobrança no final do dia ATIVA' : 'Cobrança no final do dia desativada'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Data de cadastro */}
                            <div className="pt-3 border-t border-muted text-xs text-muted-foreground">
                              Cadastrado em {new Date(user.createdAt).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(user.createdAt).toLocaleTimeString('pt-BR')}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="ml-6 space-y-2">
                        {user.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateUserStatus(user.id, 'ACTIVE')}
                              disabled={updatingUserId !== null}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              {updatingUserId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Aprovar
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectUser(user.id)}
                              disabled={updatingUserId !== null}
                              className="w-full"
                            >
                              {updatingUserId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Rejeitar
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {user.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleUpdateUserStatus(user.id, 'BLOCKED')}
                            disabled={updatingUserId !== null}
                            className="w-full"
                          >
                            {updatingUserId === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Bloquear
                              </>
                            )}
                          </Button>
                        )}

                        {user.status === 'BLOCKED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserStatus(user.id, 'ACTIVE')}
                            disabled={updatingUserId !== null}
                            className="w-full"
                          >
                            {updatingUserId === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Reativar
                              </>
                            )}
                          </Button>
                        )}

                        {/* Botão Excluir - disponível para todos os status */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUserToDelete(user);
                            setShowDeleteConfirm(true);
                          }}
                          disabled={deletingUserId !== null}
                          className="w-full border-red-500/50 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                        >
                          {deletingUserId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </>
                          )}
                        </Button>

                        {user.role === 'CLIENT' && user.status === 'ACTIVE' && (
                          <>
                            <Button
                              size="sm"
                              variant={user.endOfDayBilling ? 'outline' : 'secondary'}
                              onClick={() => handleToggleEndOfDayBilling(user.id, user.endOfDayBilling ?? false)}
                              disabled={updatingUserId !== null}
                              className={`w-full mt-2 ${user.endOfDayBilling ? 'border-green-500/50 text-green-500 hover:bg-green-500/10' : ''}`}
                            >
                              {updatingUserId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 mr-2" />
                                  {user.endOfDayBilling ? 'Desativar EOD' : 'Ativar EOD'}
                                </>
                              )}
                            </Button>
                            <div className="flex items-center justify-between p-2 rounded bg-muted/30 mt-2">
                              <div className="flex items-center gap-2">
                                <Bell className={`w-4 h-4 ${user.emailNotificationsEnabled ? 'text-green-500' : 'text-gray-400'}`} />
                                <span className="text-sm">
                                  {user.emailNotificationsEnabled ? 'Emails ativos' : 'Emails desativados'}
                                </span>
                              </div>
                              <Switch
                                checked={user.emailNotificationsEnabled ?? true}
                                onCheckedChange={() => handleToggleNotifications(user.id, user.emailNotificationsEnabled ?? true)}
                                disabled={updatingUserId !== null}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full bg-card border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Confirmar Exclusão
              </CardTitle>
              <CardDescription>
                Esta ação não pode ser desfeita
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Tem certeza que deseja excluir permanentemente o usuário:
              </p>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">{userToDelete.name}</p>
                <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                <p className="text-sm text-muted-foreground">Perfil: {USER_ROLE_LABELS[userToDelete.role as keyof typeof USER_ROLE_LABELS]}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  disabled={deletingUserId !== null}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteUser}
                  disabled={deletingUserId !== null}
                  className="flex-1"
                >
                  {deletingUserId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Sim, Excluir
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
