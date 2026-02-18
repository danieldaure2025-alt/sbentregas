# 🚀 Guia Rápido: Configurar Variáveis Firebase no Vercel

## ⚠️ Passo Crítico para Ativar Notificações

O sistema de notificações **não funcionará no Vercel** sem configurar as variáveis de ambiente do Firebase.

---

## 📋 Passo a Passo

### 1. Acessar Painel do Vercel

1. Acesse: https://vercel.com
2. Faça login na sua conta
3. Selecione o projeto: **sbentregas** (ou nome do seu projeto)

### 2. Ir para Environment Variables

1. Clique na aba **"Settings"** (Configurações)
2. No menu lateral, clique em **"Environment Variables"**

### 3. Adicionar as 3 Variáveis do Firebase

Clique em **"Add New"** e adicione uma por uma:

#### Variável 1: FIREBASE_PROJECT_ID
- **Key (Nome)**: `FIREBASE_PROJECT_ID`
- **Value (Valor)**: `daure-express-production`
- **Environments**: Marque todos (Production, Preview, Development)
- Clique em **Save**

#### Variável 2: FIREBASE_CLIENT_EMAIL
- **Key**: `FIREBASE_CLIENT_EMAIL`
- **Value**: `firebase-adminsdk-fbsvc@daure-express-production.iam.gserviceaccount.com`
- **Environments**: Marque todos
- Clique em **Save**

#### Variável 3: FIREBASE_PRIVATE_KEY
- **Key**: `FIREBASE_PRIVATE_KEY`
- **Value**: Copie **EXATAMENTE** do arquivo `.env.local` (incluindo aspas e `-----BEGIN PRIVATE KEY-----`)
- **Environments**: Marque todos
- Clique em **Save**

> 🔍 **Como copiar o FIREBASE_PRIVATE_KEY**:
> 1. Abra o arquivo `.env.local` no VS Code
> 2. Procure pela linha `FIREBASE_PRIVATE_KEY=`
> 3. Copie TODO o valor (incluindo as aspas duplas `"` no início e fim)
> 4. Cole no Vercel exatamente como está

### 4. Fazer Redeploy

Depois de adicionar as 3 variáveis:

1. Volte para a aba **"Deployments"**
2. Clique no deployment mais recente
3. Clique no botão **"⋯"** (três pontinhos)
4. Selecione **"Redeploy"**
5. Confirme o redeploy

### 5. Aguardar Deploy Concluir

- O Vercel vai reconstruir e fazer o deploy (leva 1-3 minutos)
- Aguarde até aparecer "Deployment Successful"

### 6. Testar

1. Acesse: `https://seu-dominio.vercel.app/dashboard/admin/notifications`
2. Tente enviar uma notificação de teste
3. Deve funcionar! ✅

---

## ✅ Verificação

Se configurado corretamente, você verá:
- ✅ Página de notificações carrega sem erros
- ✅ Consegue enviar notificações
- ✅ Logs do Vercel mostram: "Firebase Admin SDK initialized"

Se ainda não funcionar:
- ❌ Verifique se copiou o `FIREBASE_PRIVATE_KEY` completo (com aspas)
- ❌ Certifique-se de marcar todos os environments
- ❌ Tente fazer redeploy novamente

---

## 📌 Resumo

**3 variáveis para adicionar no Vercel:**
1. `FIREBASE_PROJECT_ID` = `daure-express-production`
2. `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-fbsvc@daure-express-production.iam.gserviceaccount.com`
3. `FIREBASE_PRIVATE_KEY` = *copiar do .env.local*

**Depois**: Redeploy no Vercel
