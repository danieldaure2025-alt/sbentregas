# 🚀 Daure Express - Delivery App

Sistema completo de delivery com rastreamento em tempo real, notificações push e gestão de entregas.

## 📋 Stack Tecnológico

- **Framework**: Next.js 14.2 (React 18.2)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma 6.7
- **Autenticação**: NextAuth.js
- **Pagamentos**: Pagar.me (integração futura)
- **Mapas**: Mapbox GL
- **Notificações**: Firebase Cloud Messaging
- **Storage**: AWS S3
- **Mobile**: Capacitor (Android)
- **UI**: Tailwind CSS + Radix UI + shadcn/ui

## 🎯 Funcionalidades Principais

### Para Clientes
- 📍 Solicitar entregas com localização em tempo real
- 💬 Chat com entregador
- 📸 Confirmação fotográfica da entrega
- 💳 Múltiplas formas de pagamento
- ⭐ Avaliação de entregadores

### Para Entregadores
- 🚗 Rastreamento GPS em tempo real
- 📲 Notificações de novas corridas
- 💰 Gerenciamento de ganhos e saques
- 🆘 Botão de pânico/emergência
- 📊 Histórico e estatísticas

### Para Estabelecimentos
- 📦 Solicitar entregas para seus clientes
- 💼 Faturamento de fim do dia
- 📊 Relatórios diários automáticos
- 👥 Múltiplos pedidos simultâneos

### Para Administradores
- 👥 Gerenciamento de usuários
- 📈 Dashboard com métricas
- 🔍 Auditoria completa do sistema
- ⚙️ Configurações globais

## 🚀 Como Rodar Localmente

### Pré-requisitos

- Node.js 18+ ou 20+
- npm ou yarn
- Conta Supabase (para o banco de dados)
- Conta Firebase (para notificações)
- Conta Mapbox (para mapas)
- Conta AWS (para storage)

### 1. Clone o repositório

```bash
git clone <seu-repositorio>
cd danielempresa
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha todas as variáveis necessárias (veja seção abaixo).

### 4. Configure o banco de dados

```bash
# Aplicar o schema ao banco de dados
npx prisma db push

# Gerar o Prisma Client
npx prisma generate

# (Opcional) Popular com dados de exemplo
npm run seed
```

### 5. Execute o servidor de desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

## 🔐 Variáveis de Ambiente

### Obrigatórias

#### Database (Supabase)
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
```

#### NextAuth
```bash
NEXTAUTH_SECRET="[gerar com: openssl rand -base64 32]"
NEXTAUTH_URL="http://localhost:3000" # ou URL de produção
```

#### Firebase (Notificações Push)
```bash
# Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# Service Account (Server-side)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

#### Mapbox (Mapas)
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=
```

#### AWS S3 (Storage)
```bash
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-west-2
AWS_BUCKET_NAME=
```

### Opcionais

#### Google OAuth (Login com Google)
```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

#### Pagar.me (Pagamentos - Integração Futura)
```bash
PAGARME_API_KEY=
PAGARME_ENCRYPTION_KEY=
```

## 📦 Build para Produção

```bash
# Build da aplicação
npm run build

# Executar em produção
npm run start
```

## 📱 Build Android (Capacitor)

```bash
# Sincronizar com Capacitor
npx cap sync android

# Abrir no Android Studio
npx cap open android
```

Para mais detalhes, veja [ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md).

## 🚀 Deploy no Vercel

### 1. Conecte seu repositório GitHub ao Vercel

- Acesse [vercel.com](https://vercel.com)
- Importe o repositório
- Configure as variáveis de ambiente

### 2. Configurações de Build

Vercel detecta automaticamente Next.js, mas confirme:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (já inclui `prisma generate`)
- **Output Directory**: `.next`
- **Install Command**: `npm ci`
- **Node Version**: 18.x ou 20.x

### 3. Configure TODAS as variáveis de ambiente

No Vercel Dashboard > Settings > Environment Variables, adicione:
- Todas as variáveis do `.env`
- Atualize `NEXTAUTH_URL` para a URL do Vercel

### 4. Deploy

O deploy é automático após push no branch configurado.

## 📚 Documentação Adicional

- [FUNCIONALIDADES_APP.md](./FUNCIONALIDADES_APP.md) - Detalhes de todas as funcionalidades
- [ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md) - Como fazer build do app Android

## 🗂️ Estrutura do Projeto

```
.
├── app/              # Next.js App Router (páginas e rotas)
├── components/       # Componentes React reutilizáveis
├── lib/              # Utilitários e helpers
├── prisma/           # Schema do Prisma
├── public/           # Arquivos estáticos
├── android/          # Projeto Android (Capacitor)
└── scripts/          # Scripts utilitários
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run start` - Executar build em produção
- `npm run lint` - Verificar código com ESLint
- `npx prisma studio` - Interface visual do banco de dados
- `npx prisma db push` - Aplicar schema ao banco
- `npx prisma generate` - Gerar Prisma Client

## 📄 Licença

Proprietário - Todos os direitos reservados.

## 👥 Suporte

Para questões e suporte, entre em contato.
