# 📱 Daure Express - Documentação Completa do Sistema

## ⏱️ Tempo de Deploy no Vercel

### Deploy Automático
Quando você faz push de alterações para o repositório GitHub conectado ao Vercel, o processo de deploy acontece automaticamente:

- **Tempo médio de build**: 2-5 minutos (dependendo do tamanho do projeto)
- **Tempo total até ficar online**: 3-7 minutos
- **Preview deployments**: Criados automaticamente para cada Pull Request
- **Tempo de propagação global**: Instantâneo após build completar (Vercel usa Edge Network)

### Fases do Deploy
1. **Instalação de dependências** (~1-2 min): `npm ci`
2. **Build do Next.js** (~1-2 min): `npm run build` (inclui `prisma generate`)
3. **Upload e otimização** (~30s-1min): Upload dos arquivos estáticos e otimização
4. **Deployment e propagação** (~10-30s): Ativação em todos os edge nodes globalmente

### Como Verificar o Status
- Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
- Veja o status em tempo real: Building → Ready
- Logs completos disponíveis durante o processo
- URL de preview disponível imediatamente após conclusão

### Deploy Manual (via CLI)
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Tempo: ~5-10 minutos
```

---

## 🌐 Sistema Daure Express - Visão Geral

O **Daure Express** é uma plataforma completa de gerenciamento de entregas que conecta:
- 👥 **Clientes** (pessoas físicas ou jurídicas)
- 🛵 **Entregadores** (motoboys/motoristas)
- 🏪 **Estabelecimentos** (restaurantes, lojas, farmácias)
- 👨‍💼 **Administradores** (gestores do sistema)

### Tecnologias Utilizadas
- **Frontend**: Next.js 14.2 + React 18.2 + TypeScript
- **Banco de Dados**: PostgreSQL (Supabase)
- **Autenticação**: NextAuth.js (Email/Senha + Google OAuth)
- **Pagamentos**: Stripe (Cartão de Crédito) + PIX
- **Mapas**: Mapbox GL (geocoding, rotas, rastreamento)
- **Notificações**: Firebase Cloud Messaging (FCM)
- **Storage**: AWS S3 (fotos, documentos)
- **Mobile**: Capacitor (conversão para Android APK)
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **ORM**: Prisma 6.7

---

## 🎯 Funcionalidades por Tipo de Usuário

### 🔴 ADMINISTRADOR (ADMIN)

#### 1. Dashboard Principal (`/dashboard`)
- **Métricas gerais**:
  - Receita total da plataforma
  - Total de pedidos (geral e por status)
  - Total de usuários cadastrados
  - Pedidos completos vs. cancelados
- **Pedidos recentes** com acesso rápido
- **Cartões de navegação** para todas as seções

#### 2. Gerenciamento de Entregas (`/dashboard/deliveries`)
- **Lista completa** de todas as entregas
- **Filtros avançados**:
  - Por status (Aguardando, Aceito, Em Rota, Entregue, Cancelado)
  - Por período (Hoje, 7 dias, 30 dias, personalizado)
  - Por bairro/região
- **Mapa interativo** com localização em tempo real de todos os entregadores
- **Estatísticas por bairro**: quantidade de entregas por região
- **Detalhes completos** de cada pedido

#### 3. Gestão de Entregadores (`/dashboard/delivery-persons`)
- **Lista de todos os motoboys** cadastrados
- **Status em tempo real**:
  - 🟢 Online (disponível)
  - 🔴 Offline
  - 🟠 Em Rota Coleta
  - 🔵 Em Rota Entrega
  - 🆘 Em Emergência
- **Mapa com localização** de todos entregadores ativos
- **Informações do veículo**: tipo (moto, carro, bicicleta) e CNH
- **Avaliação média** e **total de entregas** realizadas
- **Ações**:
  - Aprovar entregadores pendentes
  - Bloquear/desbloquear usuários

#### 4. Painel Financeiro Admin (`/dashboard/finances/admin`)
- **Visão geral financeira**:
  - Receita total da plataforma
  - Taxa da plataforma acumulada
  - Saldo disponível dos entregadores
  - Saques pendentes de aprovação
- **Gestão de saques**:
  - Lista de solicitações (Pendente, Aprovado, Concluído, Rejeitado)
  - Dados bancários completos (PIX/TED)
  - Aprovar ou rejeitar solicitações
  - Adicionar notas administrativas
  - Histórico completo de saques processados
- **Filtros**: Por status, por entregador, por período

#### 5. Gerenciamento de Usuários (`/dashboard/users`)
- **Lista de todos os usuários** do sistema
- **Filtros**:
  - Por tipo (Cliente, Entregador, Estabelecimento, Admin)
  - Por status (Ativo, Pendente, Bloqueado)
- **Informações detalhadas**:
  - Dados de contato
  - Tipo de veículo (entregadores)
  - Total de pedidos
  - Avaliação média
- **Ações de gerenciamento**:
  - Aprovar cadastros pendentes
  - Bloquear usuários
  - Reativar usuários bloqueados

#### 6. Gerenciamento de Emergências (`/dashboard/emergencies`)
- **Monitoramento de alertas de pânico** acionados por entregadores
- **Visualização no mapa** da localização do entregador
- **Detalhes do alerta**:
  - Horário do acionamento
  - Localização GPS precisa
  - Entregador que acionou
  - Pedido em andamento (se houver)
- **Ações**:
  - Marcar como resolvido
  - Adicionar notas de resolução
  - Ver histórico de emergências

#### 7. Configurações do Sistema (`/dashboard/settings`)
- **Preços de entrega**:
  - Taxa base (R$)
  - Preço por quilômetro (R$/km)
  - Porcentagem da plataforma (%)
  - Taxa por parada extra (R$)
- **Simulação de cálculo** em tempo real
- **Salvamento automático** no banco de dados

---

### 🔵 CLIENTE (CLIENT)

#### 1. Dashboard do Cliente (`/dashboard`)
- **Estatísticas pessoais**:
  - Total gasto em entregas
  - Total de pedidos realizados
  - Pedidos ativos no momento
  - Pedidos concluídos
- **Pedidos recentes** com status atual
- **Botão rápido** para criar novo pedido

#### 2. Criar Novo Pedido (`/dashboard/new-order`)

##### 📸 Extração Automática via Foto (OCR)
> ⚠️ **IMPORTANTE**: Esta funcionalidade foi desabilitada no código atual. Para reativar, remover comentários no arquivo correspondente.

A plataforma suportava extração automática de informações via foto/OCR:
- Tirar foto ou selecionar da galeria
- IA extrai automaticamente:
  - Endereço de origem
  - Endereço de destino
  - Telefone do destinatário
  - Nome do destinatário
  - Observações de entrega
- Preenchimento automático dos campos

##### Formulário de Pedido
- **Endereços**:
  - Endereço de coleta (origem)
  - Endereço de entrega (destino)
  - **Autocompletar** integrado com Mapbox
  - **Auto-preenchimento do bairro** com notificação se falhar (importante para cálculo correto da taxa)
  - Possibilidade de adicionar paradas intermediárias
- **Cálculo automático de preço**:
  - Distância em km
  - Tempo estimado
  - Taxa de entrega
  - Taxa da plataforma
  - **Total final**
- **Informações adicionais**:
  - Descrição do pedido (opcional)
  - Telefone para contato
  - Nome do destinatário

##### Métodos de Pagamento
- 💳 **Cartão de Crédito** (via Stripe - pagamento online instantâneo)
- 🟢 **PIX** (gera QR Code para pagamento)
- 💵 **Dinheiro** (pagamento direto ao entregador)

##### Cliente Tipo "Delivery"
Se o cliente for cadastrado como **DELIVERY CLIENT**:
- Endereço de coleta é **preenchido automaticamente** com o endereço cadastrado
- Apenas precisa informar o endereço de entrega

#### 3. Meus Pedidos (`/dashboard/orders`)
- **Lista completa** de todos os pedidos do cliente
- **Filtros por status**:
  - ⏳ Aguardando Pagamento
  - 🔍 Aguardando Entregador
  - ✅ Aceito
  - 📦 Coletado
  - 🚗 Em Rota
  - 🎉 Entregue
  - ❌ Cancelado
- **Busca** por número do pedido
- **Acesso rápido** aos detalhes

#### 4. Detalhes do Pedido (`/dashboard/orders/[id]`)
- **Informações completas**:
  - Número único do pedido (ex: #ABC12345)
  - Status atual detalhado
  - Endereços de coleta e entrega
  - Descrição do pedido
  - Preço total discriminado
  - Método de pagamento
- **Mapa com rastreamento** em tempo real (quando em rota)
- **Informações do entregador** (quando aceito):
  - Nome completo
  - Telefone para contato
  - Tipo de veículo
  - Avaliação média
  - Foto de perfil
- **Chat em tempo real** com o entregador:
  - Mensagens de texto
  - Envio de imagens
  - Indicador de mensagens não lidas
- **Ações disponíveis**:
  - Cancelar pedido (se ainda não aceito)
  - Avaliar o serviço (após entrega)
  - Realizar pagamento (para cartão de crédito via Stripe)
- **Foto de confirmação** da entrega

#### 5. Painel Financeiro do Cliente (`/dashboard/finances`)
> 🆕 Funcionalidade recentemente implementada

- **Filtros de período**:
  - Seleção de data inicial e final
  - Filtros rápidos (Hoje, Últimos 7 dias, Últimos 30 dias)
- **Filtros de status**:
  - Todos os pedidos
  - Apenas entregues
  - Apenas cancelados
  - Pedidos em andamento
- **Resumo financeiro**:
  - Total gasto no período
  - Total de pedidos
  - Valor médio por pedido
  - Taxa média da plataforma
- **Lista detalhada de pedidos**:
  - Número do pedido
  - Data e hora
  - Status
  - Valores (entrega, plataforma, total)
  - Método de pagamento
- **Exportação**:
  - Download em Excel (.xlsx)
  - Download em CSV
  - Relatório completo com todos os dados

#### 6. Funcionalidades Gerais
- **Notificações push** sobre status do pedido
- **Suporte via WhatsApp** (botão direto)
- **Termos de uso** obrigatórios no cadastro

---

### 🟢 ENTREGADOR (DELIVERY_PERSON)

#### 1. Dashboard do Entregador (`/dashboard`)
- **Estatísticas pessoais**:
  - 💰 Ganhos totais
  - 📦 Total de entregas realizadas
  - 🚗 Pedidos ativos no momento
  - ✅ Pedidos concluídos
  - ⭐ Avaliação média
- **Pedidos ativos** em andamento
- **Botão rápido** para ver pedidos disponíveis

#### 2. Pedidos Disponíveis (`/dashboard/available`)
- **Lista de pedidos** aguardando entregador
- **Informações de cada pedido**:
  - Endereços de coleta e entrega
  - Distância total (km)
  - **Valor do entregador** (sem taxa da plataforma)
  - Nome do cliente (quando disponível)
  - Tempo estimado
- **Toggle Online/Offline**:
  - Ficar disponível para receber pedidos
  - Atualização automática de localização quando online
  - Indicador visual de status
- **Sistema de notificações push** para novos pedidos:
  - 🔊 Som de alerta tipo "buzina"
  - 📳 Vibração no celular
  - 🔔 Funciona mesmo com app em segundo plano ou fechado
  - **Filtro inteligente por proximidade**: Apenas entregadores dentro de **10km** do ponto de coleta recebem a notificação
- **Botão de aceitar pedido**
- **Atualização manual** da lista
- **Botão de teste de som** de notificação

#### 3. Minhas Entregas (`/dashboard/my-deliveries`)
- **Lista de entregas aceitas**
- **Filtros por status**:
  - Aceito
  - Coletado
  - Em Rota
  - Entregue
- **Detalhes rápidos** de cada entrega
- **Acesso rápido** à página de detalhes

#### 4. Detalhe da Entrega (`/dashboard/my-deliveries/[id]`)
- **Informações completas do pedido**
- **Mapa com navegação GPS integrada**:
  - Rota até o ponto de coleta
  - Rota até o ponto de entrega
  - Localização atual do entregador (atualização em tempo real)
  - Marcadores interativos
- **Botões de atualização de status**:
  - ✅ **Coletado** (após pegar o pacote)
  - 🚗 **Em Rota** (durante o transporte)
  - 🎉 **Entregue** (ao finalizar - solicita foto de confirmação)
- **Upload de foto** de confirmação da entrega
- **Chat em tempo real** com o cliente
- **Rastreamento GPS automático** contínuo
- **🆘 Botão de Emergência/Pânico**:
  - Aciona alerta imediato para administradores
  - Registra localização GPS precisa
  - Notifica equipe de suporte
  - Funciona mesmo offline (envia quando reconectar)

#### 5. Finanças do Entregador (`/dashboard/finances`)

##### Visão Geral
- **Saldo disponível** para saque
- **Ganhos totais** acumulados
- **Histórico de transações**:
  - Entregas realizadas com valores
  - Saques efetuados
  - Datas e status

##### Filtros de Período
- Seleção de data inicial e final
- Filtros rápidos (Hoje, Últimos 7 dias, Últimos 30 dias)

##### Filtros de Status
- Todos os pedidos
- Apenas entregues (receitas confirmadas)
- Apenas cancelados
- Pedidos válidos (exclui cancelados)

##### Resumo Financeiro
- Total de receitas no período
- Total de pedidos válidos
- Valor médio por entrega
- Taxa média da plataforma
- Saldo disponível para saque

##### Lista Detalhada
- Número do pedido
- Data e hora da entrega
- Status do pedido
- Valor recebido
- Taxa da plataforma
- Valor líquido

##### Solicitar Saque
Cadastro de dados bancários para saque:

**Via PIX**:
- Tipo de chave (CPF, Email, Telefone, Aleatória)
- Chave PIX
- CPF/CNPJ do titular

**Via TED**:
- Código do banco
- Nome do banco
- Número da agência
- Número da conta
- Tipo de conta (Corrente, Poupança)
- Nome do titular
- CPF/CNPJ do titular

**Solicitação de Saque**:
- Valor desejado (validado contra saldo disponível)
- Método (PIX ou TED)
- Confirmação de dados bancários
- Status: Pendente → Aprovado → Concluído / Rejeitado

##### Exportação de Relatórios
- Download em Excel (.xlsx)
- Download em CSV
- Relatório completo com todos os dados filtrados

#### 6. Funcionalidades Gerais
- **Push notifications** com som personalizado (buzina)
- **Rastreamento GPS** contínuo quando online
- **Chat** integrado com clientes
- **Sistema de avaliação** recebida dos clientes
- **Cadastro requer aprovação** do administrador

---

### 🟡 ESTABELECIMENTO (ESTABLISHMENT)

#### 1. Dashboard/Painel (`/dashboard/establishment`)
- **Estatísticas do dia**:
  - Pedidos criados hoje
  - Pedidos pendentes
  - Pedidos entregues
  - Gasto total do dia
- **Formulário rápido** para criar pedido:
  - Endereço de origem **fixo** (cadastrado no perfil)
  - Apenas endereço de destino precisa ser preenchido
  - Descrição do pedido
  - Telefone do cliente final
  - Cálculo automático de preço
- **Pagamento**: Cobrança consolidada no final do dia (END_OF_DAY)
- **Lista de pedidos recentes**
- **Acesso rápido** a relatórios

#### 2. Meus Pedidos (`/dashboard/orders`)
- **Lista completa** de pedidos do estabelecimento
- **Filtros por status**
- **Busca** por número do pedido
- **Detalhes completos** de cada pedido
- **Botão de cancelar** (se ainda não foi aceito)

#### 3. Finanças do Estabelecimento (`/dashboard/finances`)
- **Saldo devedor** (cobrança diária acumulada)
- **Histórico de transações**
- **Relatórios diários automáticos**:
  - Data do relatório
  - Total de pedidos no dia
  - Receita total (valor das entregas)
  - Taxa da plataforma
  - Taxa de entrega
  - Valor líquido a pagar
  - Status de pagamento (Pago/Pendente)
- **Filtros por período**
- **Exportação** de relatórios (Excel, CSV)

#### 4. Funcionalidades Gerais
- **Endereço fixo** de coleta cadastrado
- **Cobrança consolidada** diária/semanal/mensal
- **Relatórios automáticos** gerados todo dia
- **Cadastro requer aprovação** do admin
- **Múltiplos usuários** podem usar a mesma conta (útil para restaurantes com vários atendentes)

---

## 🛠️ Funcionalidades Técnicas Avançadas

### 1. Sistema de Pagamentos

#### Stripe (Cartão de Crédito)
- Integração completa com Stripe Payments
- **Payment Intents** para segurança
- **Checkout** embarcado na plataforma
- Captura automática após entrega confirmada
- Reembolsos automáticos em caso de cancelamento

#### PIX
- Geração de QR Code dinâmico
- Validação de pagamento em tempo real
- Confirmação automática via webhook
- Suporte a chaves PIX (CPF, Email, Telefone, Aleatória)

#### Dinheiro
- Confirmação pelo entregador
- Registro da transação no sistema
- Repasse automático do valor ao entregador

#### Cobrança para Estabelecimentos
- **END_OF_DAY**: Cobrança consolidada diária
- Relatórios automáticos enviados por email
- Histórico completo de cobranças
- Opções de período: Diário, Semanal, Mensal

### 2. Notificações Push (Firebase + Capacitor)

#### Implementação Nativa (Modelo iFood/Uber)
- **Autorização única**: Não pede permissão toda vez que abre o app
- **Funciona em background**: Mesmo com app fechado
- **Notificações nativas** do Android/iOS
- **Som personalizado**: Tipo "buzina" para chamar atenção
- **Vibração** em padrões distintos por tipo

#### Tipos de Notificação
- **NEW_ORDER**: Novo pedido disponível (para entregadores próximos)
- **ORDER_ACCEPTED**: Pedido aceito (para clientes)
- **ORDER_PICKED_UP**: Pedido coletado
- **ORDER_DELIVERED**: Pedido entregue
- **ORDER_CANCELLED**: Pedido cancelado
- **EMERGENCY**: Alerta de emergência (para admins)
- **CHAT_MESSAGE**: Nova mensagem no chat
- **DAILY_REPORT**: Relatório diário (para estabelecimentos)

#### Filtro por Proximidade
- Apenas entregadores dentro de **raio de 10km** do ponto de coleta recebem notificação
- Cálculo baseado em coordenadas GPS
- Atualização em tempo real da localização dos entregadores
- Otimização de bateria com intervalos inteligentes

### 3. Mapas e GPS (Mapbox)

#### Geocoding
- **Autocompletar** de endereços em tempo real
- Conversão de endereços em coordenadas (latitude/longitude)
- **Auto-preenchimento de bairro** com notificação de falha
- Validação de endereços

#### Cálculo de Rotas
- Distância precisa entre pontos
- Tempo estimado de viagem
- Rota otimizada (evita trânsito quando possível)
- Suporte a múltiplas paradas

#### Rastreamento em Tempo Real
- Atualização contínua da posição do entregador
- Marcadores animados no mapa
- Linha de rota em tempo real
- Detecção de GPS falso (anti-fraude)

#### Mapas Interativos
- Zoom e navegação
- Marcadores personalizados
- Clusters de múltiplos entregadores
- Heatmap de entregas por região

### 4. Chat em Tempo Real

#### Funcionalidades
- **Mensagens de texto** instantâneas
- **Envio de imagens** (upload para S3)
- **Indicador de mensagens não lidas**
- **Indicador "digitando..."**
- **Timestamp** de cada mensagem

#### Implementação
- Polling automático a cada 5 segundos
- **ChatParticipant**: Controla quem está no chat
- **Minimizar/maximizar** janela de chat
- Notificações push para novas mensagens
- Histórico completo salvo no banco

### 5. Segurança e Autenticação

#### NextAuth.js
- Autenticação por **email e senha**
- Login com **Google OAuth**
- Sessões seguras com JWT
- Proteção contra CSRF

#### Criptografia
- Senhas com **bcrypt** (hash + salt)
- Tokens seguros para reset de senha
- Comunicação HTTPS obrigatória em produção

#### Proteção de Rotas
- Middleware de autenticação
- Verificação de roles (ADMIN, CLIENT, DELIVERY_PERSON, ESTABLISHMENT)
- Redirecionamento automático se não autenticado

#### Logs de Auditoria
- Registro de todas as ações críticas
- IP e User-Agent salvos
- Timestamp de eventos
- Rastreabilidade completa

#### Anti-Fraude
- Detecção de **GPS falso** (mock location)
- Validação de localização em eventos críticos
- Sistema de score de prioridade para entregadores
- Limite de rejeições diárias

### 6. Armazenamento

#### AWS S3
- Upload de fotos de entrega
- Upload de imagens do chat
- Documentos (CNH, comprovantes)
- **Presigned URLs** para segurança
- Controle de acesso por usuário

#### PostgreSQL (Supabase)
- **Prisma ORM** para type-safety
- Índices otimizados para performance
- Prepared statements para evitar SQL injection
- Connection pooling (pgBouncer)

#### Cache
- Cache de configurações do sistema
- Cache de cálculos de distância
- Otimização de consultas frequentes

### 7. Sistema de Ofertas Inteligentes

#### Distribuição de Pedidos
- **OrderOffer**: Modelo de oferta de pedido a entregador
- **Tentativas múltiplas**: Se entregador rejeita, oferece para o próximo
- **Expiração automática**: Ofertas expiram após tempo limite
- **Priorização**: Entregadores com melhor score recebem primeiro

#### Algoritmo de Proximidade
```
1. Novo pedido criado
2. Busca entregadores ONLINE dentro de 10km do ponto de coleta
3. Ordena por:
   - Distância (mais próximo primeiro)
   - Priority Score (melhor avaliação)
   - Rejeições hoje (menos rejeições primeiro)
4. Envia notificação para o primeiro da fila
5. Aguarda resposta por X minutos
6. Se rejeitar/expirar, passa para o próximo
7. Se nenhum aceitar, marca como "NO_COURIER_AVAILABLE"
```

---

## 📱 APP ANDROID (APK via Capacitor)

### Características
- **Package**: `com.daureexpress.app`
- **Nome**: Daure Express
- **SDK Mínimo**: Android 5.1 (API 22)
- **SDK Alvo**: Android 14 (API 34)
- **Splash Screen** personalizada
- **Ícone** customizado
- **Push Notifications** nativas via FCM

### Como Gerar o APK

#### 1. Sincronizar com Capacitor
```bash
npx cap sync android
```

#### 2. Abrir no Android Studio
```bash
npx cap open android
```

#### 3. Gerar APK Assinado
1. Build → Generate Signed Bundle / APK
2. Escolher APK
3. Criar keystore (ou usar existente)
4. Configurar assinatura
5. Build → release

#### 4. Publicar na Google Play Store
- Seguir o guia oficial do Google Play Console
- Upload do APK assinado
- Preencher listing da store
- Submeter para revisão

### Funcionalidades Nativas
- **GPS de alta precisão**
- **Notificações push** mesmo com app fechado
- **Câmera** para fotos de entrega
- **Vibração** para alertas
- **Background location** para rastreamento contínuo

---

## 🌐 URLs do Sistema

### Autenticação
- `/auth/login` - Login
- `/auth/signup` - Cadastro
- `/auth/forgot-password` - Recuperar senha

### Páginas Gerais
- `/` - Landing page / Redirecionamento
- `/terms` - Termos de uso
- `/dashboard` - Dashboard (varia por role)

### Cliente
- `/dashboard/new-order` - Criar novo pedido
- `/dashboard/orders` - Meus pedidos
- `/dashboard/orders/[id]` - Detalhe do pedido
- `/dashboard/finances` - Painel financeiro do cliente

### Entregador
- `/dashboard/available` - Pedidos disponíveis
- `/dashboard/my-deliveries` - Minhas entregas
- `/dashboard/my-deliveries/[id]` - Detalhe da entrega
- `/dashboard/finances` - Finanças do entregador

### Estabelecimento
- `/dashboard/establishment` - Painel do estabelecimento
- `/dashboard/orders` - Pedidos do estabelecimento
- `/dashboard/finances` - Finanças do estabelecimento

### Administrador
- `/dashboard/deliveries` - Gerenciar entregas
- `/dashboard/delivery-persons` - Gerenciar entregadores
- `/dashboard/users` - Gerenciar usuários
- `/dashboard/finances/admin` - Painel financeiro admin
- `/dashboard/settings` - Configurações do sistema
- `/dashboard/emergencies` - Alertas de emergência

---

## 🚀 Deploy e Produção

### Vercel (Recomendado)

#### Configuração Inicial
1. Conectar repositório GitHub ao Vercel
2. Framework: Next.js (detectado automaticamente)
3. Build Command: `npm run build`
4. Output Directory: `.next`
5. Install Command: `npm ci`
6. Node Version: 18.x ou 20.x

#### Variáveis de Ambiente Obrigatórias

**Database (Supabase)**
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres
```

**NextAuth**
```
NEXTAUTH_SECRET=[openssl rand -base64 32]
NEXTAUTH_URL=https://seu-dominio.vercel.app
```

**Firebase (Notificações)**
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

**Mapbox**
```
NEXT_PUBLIC_MAPBOX_TOKEN=...
```

**AWS S3**
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-west-2
AWS_BUCKET_NAME=...
```

**Google OAuth (Opcional)**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Stripe (Pagamentos)**
```
STRIPE_SECRET_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
```

#### Deploy Automático
- Push para branch `main` → Deploy automático
- Pull Requests → Preview deployments
- Rollback com 1 clique

#### Monitoramento
- Logs em tempo real
- Analytics integrado
- Error tracking
- Performance monitoring

### Ambiente de Desenvolvimento Local

#### 1. Clonar Repositório
```bash
git clone <repositorio>
cd danielempresa
```

#### 2. Instalar Dependências
```bash
npm install
```

#### 3. Configurar .env
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

#### 4. Configurar Banco de Dados
```bash
# Aplicar schema
npx prisma db push

# Gerar Prisma Client
npx prisma generate

# (Opcional) Popular com dados de teste
npm run seed
```

#### 5. Executar
```bash
npm run dev
# Acesse http://localhost:3000
```

---

## 📊 Modelos de Dados (Principais)

### User (Usuário)
- **Campos principais**: id, name, email, role, status, phone
- **Entregador**: vehicleType, licenseNumber, rating, currentLatitude, currentLongitude, isOnline
- **Estabelecimento**: establishmentName, establishmentAddress, endOfDayBilling
- **Cliente Delivery**: clientType, clientAddress, clientLatitude, clientLongitude
- **Financeiro**: pixKey, bankCode, accountNumber
- **FCM**: fcmToken, fcmTokenUpdatedAt

### Order (Pedido)
- **Identificação**: id, orderNumber (#ABC12345)
- **Partes**: clientId, deliveryPersonId, establishmentId
- **Endereços**: originAddress, originLatitude, originLongitude, destinationAddress, destinationLatitude, destinationLongitude
- **Pagamento**: price, distance, paymentMethod, paymentIntentId
- **Status**: status (AWAITING_PAYMENT → PENDING → ACCEPTED → PICKED_UP → IN_TRANSIT → DELIVERED)
- **Timestamps**: createdAt, acceptedAt, pickedUpAt, completedAt, cancelledAt
- **Extras**: notes, deliveryPhotoUrl, clientPhone

### Transaction (Transação)
- **Relacionamento**: orderId
- **Valores**: totalAmount, platformFee, deliveryFee
- **Pagamento**: paymentStatus, paymentMethod, stripePaymentId

### Withdrawal (Saque)
- **Usuário**: userId (entregador)
- **Valor**: amount
- **Método**: method (PIX/TED)
- **Status**: status (PENDING → APPROVED → COMPLETED / REJECTED)
- **Dados bancários**: pixKey, bankCode, accountNumber, etc.

### Chat & Message (Chat e Mensagens)
- **Chat**: orderId, participants
- **Message**: chatId, senderId, type (TEXT/IMAGE), content, imageUrl

### EmergencyAlert (Emergência)
- **Entregador**: userId
- **Localização**: latitude, longitude
- **Status**: isResolved, resolvedAt, resolvedBy

### Notification (Notificação)
- **Destinatário**: userId
- **Tipo**: type (NEW_ORDER, ORDER_ACCEPTED, etc.)
- **Conteúdo**: title, body, data
- **Status**: isRead, fcmSent

### DailyReport (Relatório Diário)
- **Estabelecimento**: userId
- **Data**: reportDate
- **Resumo**: totalOrders, totalRevenue, platformFees, deliveryFees, netAmount
- **Pagamento**: isPaid, paidAt

---

## 🔧 Scripts Úteis

### Desenvolvimento
```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build para produção
npm run start            # Executar build em produção
npm run lint             # Verificar código com ESLint
```

### Banco de Dados
```bash
npx prisma studio        # Interface visual do banco
npx prisma db push       # Aplicar schema ao banco
npx prisma generate      # Gerar Prisma Client
npx prisma migrate dev   # Criar nova migration
npx prisma db seed       # Popular banco com dados de teste
```

### Utilitários
```bash
node create-admin.js            # Criar usuário admin
node create-test-users.js       # Criar usuários de teste
node test-db-connection.js      # Testar conexão com banco
```

### Capacitor (Android)
```bash
npx cap sync android     # Sincronizar com projeto Android
npx cap open android     # Abrir no Android Studio
npx cap copy android     # Copiar arquivos web para Android
```

---

## ✅ Funcionalidades Implementadas Recentemente

### Janeiro-Fevereiro 2026

1. **Painel Financeiro do Cliente** (`/dashboard/finances`)
   - Filtros de período e status
   - Resumo financeiro detalhado
   - Exportação Excel/CSV
   - Separação de pedidos cancelados

2. **Melhorias no Relatório Financeiro**
   - Exclusão de pedidos cancelados dos totais
   - Seção separada para pedidos cancelados
   - Valores mais precisos e confiáveis

3. **Auto-preenchimento de Bairro**
   - Notificação quando autocompletar falha
   - Prevenção de cálculos incorretos de taxa
   - Validação antes de submeter pedido

4. **Cliente Tipo "Delivery"**
   - Opção no cadastro para tipo DELIVERY
   - Auto-preenchimento do endereço de coleta
   - Simplificação do processo de criação de pedido

5. **Desativação do Extrator de Foto**
   - Feature OCR temporariamente desabilitada na UI
   - Código mantido para futura reativação

6. **Correções no Prisma/Supabase**
   - Resolução do erro 42P05 (prepared statement)
   - Configuração correta do pgBouncer
   - Otimização de connection pooling

7. **Google OAuth**
   - Integração completa com login Google
   - Sincronização de dados de perfil

---

## 📞 Suporte e Contato

### Deploy Atual
**URL de Produção**: https://sistemadauredeentregas.abacusai.app

### Tecnologias de Terceiros
- **Supabase**: https://supabase.com
- **Firebase**: https://firebase.google.com
- **Mapbox**: https://mapbox.com
- **Vercel**: https://vercel.com
- **Stripe**: https://stripe.com
- **AWS**: https://aws.amazon.com

### Documentação Adicional
- Next.js: https://nextjs.org/docs
- Prisma: https://prisma.io/docs
- NextAuth.js: https://next-auth.js.org
- Capacitor: https://capacitorjs.com

---

## 📄 Licença e Direitos

**Proprietário**: Todos os direitos reservados

**Última atualização**: Fevereiro de 2026

---

## 🎯 Resumo: O que o App Faz?

O **Daure Express** é uma plataforma completa que permite:

✅ **Clientes** solicitarem entregas de forma rápida e prática
✅ **Entregadores** receberem pedidos, navegarem com GPS e ganharem dinheiro
✅ **Estabelecimentos** terceirizarem suas entregas de forma eficiente
✅ **Administradores** gerenciarem todo o sistema com controle total

Com recursos avançados como:
- 🔔 Notificações push em tempo real
- 📍 Rastreamento GPS contínuo
- 💬 Chat entre cliente e entregador
- 💳 Pagamentos online e offline
- 🆘 Botão de emergência para segurança
- 📊 Relatórios financeiros completos
- 📱 Aplicativo Android nativo

**Status**: ✅ 100% Funcional em Produção

**Deploy**: Vercel (deploy automático em 3-7 minutos após push)

**Banco de Dados**: Supabase (PostgreSQL)

**Notificações**: Firebase Cloud Messaging

**Mapas**: Mapbox

**Pagamentos**: Stripe + PIX

**Storage**: AWS S3
