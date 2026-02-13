export const DEFAULT_SYSTEM_SETTINGS = {
  BASE_FEE: 5.0, // R$ 5,00 taxa base
  PRICE_PER_KM: 2.5, // R$ 2,50 por km
  PLATFORM_FEE_PERCENTAGE: 0.15, // 15% de taxa da plataforma
  EXTRA_STOP_FEE: 3.0, // R$ 3,00 por parada adicional
};

export const ORDER_STATUS_LABELS = {
  AWAITING_PAYMENT: 'Aguardando Pagamento',
  PENDING: 'Aguardando Entregador',
  ACCEPTED: 'Aceito',
  PICKED_UP: 'Coletado',
  IN_TRANSIT: 'Em Rota',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  NO_COURIER_AVAILABLE: 'Sem Entregador Disponível',
};

export const PAYMENT_STATUS_LABELS = {
  PENDING: 'Pendente',
  COMPLETED: 'Completo',
  REFUNDED: 'Reembolsado',
};

export const USER_ROLE_LABELS = {
  ADMIN: 'Administrador',
  CLIENT: 'Cliente',
  DELIVERY_PERSON: 'Entregador',
  ESTABLISHMENT: 'Estabelecimento',
};

export const USER_STATUS_LABELS = {
  ACTIVE: 'Ativo',
  PENDING_APPROVAL: 'Aguardando Aprovação',
  BLOCKED: 'Bloqueado',
};

export const PAYMENT_METHOD_LABELS = {
  CREDIT_CARD: 'Cartão de Crédito',
  PIX: 'PIX',
  DEBIT_CARD: 'Cartão de Débito',
  CASH: 'Dinheiro',
  END_OF_DAY: 'Cobrança no Final do Dia',
};
