# Daure Express - Manual de Funcionalidades

## Visão Geral do Sistema

O **Daure Express** é uma plataforma completa de gerenciamento de entregas que conecta clientes, entregadores e estabelecimentos. O sistema oferece rastreamento em tempo real, pagamentos integrados e comunicação direta entre as partes.

---

## 🔴 ADMINISTRADOR (ADMIN)

### Dashboard Principal
- **Visão geral** com estatísticas: receita total, total de pedidos, pedidos completos, total de usuários
- **Pedidos recentes** com acesso rápido aos detalhes
- **Cartões de ação rápida** para navegar entre seções

### Gerência de Emergências (`/dashboard/emergencies`)
- **Monitoramento de pânico** acionado por entregadores
- Visualização da localização do entregador em emergência
- Botão para resolver emergências
- Histórico de eventos de emergência

### Painel de Entregas (`/dashboard/deliveries`)
- **Lista completa** de todas as entregas do sistema
- **Filtros por status**: Aguardando, Aceito, Em Rota, Entregue, Cancelado
- **Filtros por período**: Hoje, Últimos 7 dias, Últimos 30 dias
- **Mapa em tempo real** com localização de entregadores
- **Estatísticas por bairro**: quantidade de entregas por região
- **Detalhes completos** de cada entrega

### Gestão de Motoboys (`/dashboard/delivery-persons`)
- **Lista de todos os entregadores** cadastrados
- **Status em tempo real**: Online, Offline, Em Rota Coleta, Em Rota Entrega
- **Mapa com localização** de todos os entregadores ativos
- **Informações do veículo**: tipo e CNH
- **Avaliação média** de cada entregador

### Finanças Admin (`/dashboard/finances/admin`)
- **Painel financeiro completo**:
  - Receita total da plataforma
  - Taxa da plataforma acumulada
  - Saldo dos entregadores
  - Saques pendentes
- **Gestão de saques**:
  - Lista de solicitações de saque
  - Aprovar ou rejeitar saques
  - Visualizar dados bancários (PIX/TED)
  - Histórico de saques processados
- **Filtros por status**: Pendente, Aprovado, Concluído, Rejeitado

### Gestão de Usuários (`/dashboard/users`)
- **Lista de todos os usuários**: Clientes, Entregadores, Estabelecimentos
- **Filtros por tipo** e **status**
- **Ações de gerenciamento**:
  - Aprovar entregadores pendentes
  - Bloquear usuários ativos
  - Reativar usuários bloqueados
- **Detalhes de cada usuário**: contato, veículo, avaliação, entregas realizadas

### Configurações (`/dashboard/settings`)
- **Preços de entrega**:
  - Taxa base (R$)
  - Preço por km (R$)
  - Porcentagem da plataforma (%)
  - Taxa por parada extra (R$)
- **Simulação de cálculo** em tempo real
- **Salvamento de configurações** no banco de dados

---

## 🔵 CLIENTE (CLIENT)

### Dashboard Principal
- **Estatísticas pessoais**:
  - Total gasto em entregas
  - Total de pedidos
  - Pedidos ativos
  - Pedidos concluídos
- **Pedidos recentes** com status atual
- **Botão rápido** para criar novo pedido

### Criar Novo Pedido (`/dashboard/new-order`)
- **📸 Extração Automática via Foto (OCR)**:
  - Tirar foto ou selecionar da galeria
  - IA extrai automaticamente:
    - Endereço de origem
    - Endereço de destino
    - Telefone do destinatário
    - Nome do destinatário
    - Observações de entrega
  - Preenchimento automático dos campos
- **Endereços múltiplos**:
  - Endereço de coleta (origem)
  - Endereço de entrega (destino)
  - Possibilidade de adicionar paradas intermediárias
- **Autocompletar de endereços** com Mapbox
- **Cálculo automático de preço**:
  - Distância em km
  - Tempo estimado
  - Taxa de entrega
  - Taxa da plataforma
  - Total
- **Descrição do pedido** (opcional)
- **Telefone para contato**
- **Métodos de pagamento**:
  - 🟠 **Cartão de Crédito** (Stripe - pagamento online)
  - 🟢 **PIX** (gera QR Code para pagamento)
  - 🟢 **Dinheiro** (pagamento ao entregador)

### Meus Pedidos (`/dashboard/orders`)
- **Lista de todos os pedidos** do cliente
- **Filtros por status**:
  - Aguardando Pagamento
  - Aguardando Entregador
  - Aceito
  - Coletado
  - Em Rota
  - Entregue
  - Cancelado
- **Acesso aos detalhes** de cada pedido

### Detalhes do Pedido (`/dashboard/orders/[id]`)
- **Informações completas**:
  - Status atual
  - Endereços de coleta/entrega
  - Descrição
  - Preço total
  - Método de pagamento
- **Mapa com rastreamento** em tempo real (quando em rota)
- **Dados do entregador** (quando aceito):
  - Nome
  - Telefone
  - Veículo
  - Avaliação
- **Chat em tempo real** com o entregador
- **Botão de cancelar** (se ainda não foi aceito)
- **Avaliação do serviço** (após entrega)
- **Pagamento via Stripe** (para cartão de crédito)

### Funcionalidades Gerais
- **Notificações push** sobre status do pedido
- **WhatsApp** para suporte direto
- **Termos de uso** obrigatórios no cadastro

---

## 🟢 ENTREGADOR (DELIVERY_PERSON)

### Dashboard Principal
- **Estatísticas pessoais**:
  - Ganhos totais
  - Total de entregas
  - Pedidos ativos
  - Pedidos concluídos
  - Avaliação média
- **Pedidos ativos** em andamento
- **Botão rápido** para ver pedidos disponíveis

### Pedidos Disponíveis (`/dashboard/available`)
- **Lista de pedidos** aguardando entregador
- **Detalhes de cada pedido**:
  - Endereços de coleta/entrega
  - Distância total
  - Valor do entregador (sem taxa da plataforma)
  - Nome do cliente
- **Botão para aceitar pedido**
- **Status Online/Offline**:
  - Toggle para ficar disponível
  - Atualização de localização automática quando online
- **Notificações push** para novos pedidos:
  - Som de alerta tipo "buzina"
  - Vibração no celular
  - Funciona mesmo com app em segundo plano
- **Botão de teste de som**
- **Atualização manual** da lista

### Minhas Entregas (`/dashboard/my-deliveries`)
- **Lista de entregas aceitas**
- **Filtros por status**: Aceito, Coletado, Em Rota, Entregue
- **Detalhes rápidos** de cada entrega
- **Acesso à página de entrega**

### Detalhe da Entrega (`/dashboard/my-deliveries/[id]`)
- **Informações completas do pedido**
- **Mapa com navegação GPS**:
  - Rota até o ponto de coleta
  - Rota até o ponto de entrega
  - Localização atual do entregador
- **Botões de atualização de status**:
  - Coletado (após pegar o pacote)
  - Em Rota (durante transporte)
  - Entregue (ao finalizar)
- **Chat em tempo real** com o cliente
- **Rastreamento GPS automático**
- **Botão de Emergência/Pânico**:
  - Aciona alerta para admin
  - Registra localização
  - Notifica equipe de suporte

### Finanças (`/dashboard/finances`)
- **Saldo disponível** para saque
- **Histórico de transações**:
  - Entregas realizadas
  - Saques efetuados
- **Solicitar saque**:
  - Via PIX (instantâneo)
  - Via TED (transferência bancária)
- **Cadastro de dados bancários**:
  - Chave PIX (CPF, Email, Telefone, Aleatória)
  - Dados TED (Banco, Agência, Conta)
- **Status dos saques**: Pendente, Aprovado, Concluído, Rejeitado

### Funcionalidades Gerais
- **Push notifications** com som personalizado
- **Rastreamento GPS** contínuo quando online
- **Chat** com clientes
- **Sistema de avaliação** recebida
- **Cadastro requer aprovação** do admin

---

## 🟡 ESTABELECIMENTO (ESTABLISHMENT)

### Dashboard/Painel (`/dashboard/establishment`)
- **Estatísticas do dia**:
  - Pedidos hoje
  - Pedidos pendentes
  - Pedidos entregues
  - Gasto do dia
- **Formulário rápido** para criar pedido:
  - Endereço de origem fixo (cadastrado)
  - Apenas endereço de destino
  - Descrição do pedido
  - Telefone do cliente
- **Pagamento**: Cobrança no final do dia (END_OF_DAY)
- **Lista de pedidos recentes**
- **Relatórios diários** automáticos

### Meus Pedidos (`/dashboard/orders`)
- **Lista de todos os pedidos** do estabelecimento
- **Filtros por status**
- **Acesso aos detalhes** de cada pedido
- **Botão de cancelar** (se ainda não foi aceito)

### Finanças (`/dashboard/finances`)
- **Saldo devedor** (cobrança diária)
- **Histórico de transações**
- **Relatórios diários**:
  - Total de pedidos
  - Receita total
  - Taxas da plataforma
  - Taxas de entrega
  - Valor líquido

### Funcionalidades Gerais
- **Endereço fixo** cadastrado para coletas
- **Cobrança consolidada** no final do dia
- **Relatórios automáticos** diários
- **Cadastro requer aprovação** do admin

---

## 🛠️ FUNCIONALIDADES TÉCNICAS

### Sistema de Pagamentos
- **Stripe** integrado para cartão de crédito
- **PIX** com QR Code
- **Dinheiro** com confirmação do entregador
- **Cobrança diária** para estabelecimentos

### Notificações Push (Firebase + Capacitor)
- **Modelo iFood/APK Nativo**:
  - Autorização única (não pede permissão toda vez)
  - Funciona mesmo com app fechado
  - Notificações nativas do Android
- **Novos pedidos** para entregadores **PRÓXIMOS ao local de coleta** (raio de 10km)
- **Status do pedido** para clientes
- **Emergências** para admins
- **Som personalizado** tipo buzina
- **Vibração** em padrões distintos
- **Funciona em segundo plano**
- **Filtro por proximidade**: Apenas entregadores dentro do raio de 10km do ponto de coleta são notificados

### Mapas e GPS (Mapbox)
- **Autocompletar** de endereços
- **Cálculo de rotas** e distâncias
- **Rastreamento em tempo real**
- **Mapa interativo** com marcadores

### Chat em Tempo Real
- **Mensagens de texto**
- **Envio de imagens** (S3)
- **Polling automático** a cada 5 segundos
- **Minimizar/maximizar** janela

### Segurança
- **Autenticação** NextAuth.js
- **Criptografia** de senhas (bcrypt)
- **Logs de auditoria** para ações críticas
- **Proteção de rotas** por role

### Armazenamento
- **AWS S3** para imagens
- **PostgreSQL** para dados
- **Prisma ORM** para consultas

---

## 📱 APP ANDROID (APK)

O aplicativo pode ser convertido para APK usando **Capacitor**:

- **Package**: `com.daureexpress.app`
- **Nome**: Daure Express
- **SDK Mínimo**: Android 5.1
- **SDK Alvo**: Android 14
- **Splash Screen** personalizada
- **Push Notifications** nativas

### Como Gerar
1. Baixar pasta `android` do projeto
2. Abrir no Android Studio
3. Gerar APK assinado
4. Publicar na Google Play Store

---

## 🌐 URLs DO SISTEMA

| Página | URL |
|--------|-----|
| Login | `/auth/login` |
| Cadastro | `/auth/signup` |
| Termos de Uso | `/terms` |
| Dashboard | `/dashboard` |
| Novo Pedido | `/dashboard/new-order` |
| Meus Pedidos | `/dashboard/orders` |
| Detalhe Pedido | `/dashboard/orders/[id]` |
| Disponíveis | `/dashboard/available` |
| Minhas Entregas | `/dashboard/my-deliveries` |
| Detalhe Entrega | `/dashboard/my-deliveries/[id]` |
| Finanças | `/dashboard/finances` |
| Finanças Admin | `/dashboard/finances/admin` |
| Usuários | `/dashboard/users` |
| Configurações | `/dashboard/settings` |
| Emergências | `/dashboard/emergencies` |
| Entregas Admin | `/dashboard/deliveries` |
| Motoboys | `/dashboard/delivery-persons` |
| Estabelecimento | `/dashboard/establishment` |

---

## ✅ STATUS: FUNCIONAL

Todas as funcionalidades listadas estão implementadas e funcionais no sistema.

**Deploy**: https://sistemadauredeentregas.abacusai.app

**Última atualização**: Fevereiro de 2026
