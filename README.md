# Legacy Translations Partner Portal

Portal para parceiros da Legacy Translations com sistema de cotacoes, tracking de pedidos e integracoes com Stripe, SendGrid e Protemos.

## Estrutura do Projeto

```
Legacy-Portal/
├── backend/
│   ├── server.py           # API FastAPI (Python)
│   ├── requirements.txt    # Dependencias Python
│   ├── build.sh            # Script de build para Render
│   ├── .env.example        # Template de variaveis de ambiente
│   └── .env                # Variaveis de ambiente (criar a partir do .example)
├── frontend/
│   ├── src/
│   │   └── App.js          # React App principal
│   ├── package.json        # Dependencias Node.js
│   ├── .env.example        # Template de variaveis de ambiente
│   └── .env                # Variaveis de ambiente (criar a partir do .example)
├── render.yaml             # Configuracao de deploy Render
└── README.md
```

## Funcionalidades

- **Home**: Portal de cotacoes com calculo automatico de precos
- **Orders**: Tracking de pedidos com 6 estagios de traducao
- **Messages**: Sistema de mensagens (placeholder)
- **Payouts**: Sistema de pagamentos (placeholder)

### Estagios de Traducao (Orders)
1. Order Received - Pedido recebido
2. In Translation - Em traducao
3. Quality Review - Revisao de qualidade
4. Final Review - Revisao final
5. Ready for Delivery - Pronto para entrega
6. Delivered - Entregue

## Configuracao Local

### Pre-requisitos

- Python 3.9+
- Node.js 18+
- MongoDB (local ou Atlas)

### Backend

```bash
cd backend

# Criar ambiente virtual (opcional mas recomendado)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
.\venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variaveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Iniciar servidor
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variaveis de ambiente
cp .env.example .env
# Editar .env com a URL do backend

# Iniciar servidor de desenvolvimento
npm start
```

O frontend estara disponivel em `http://localhost:3000`

## Variaveis de Ambiente

### Backend (.env)

| Variavel | Descricao |
|----------|-----------|
| MONGO_URL | URL de conexao do MongoDB |
| DB_NAME | Nome do banco de dados |
| CORS_ORIGINS | Origens permitidas para CORS |
| SENDGRID_API_KEY | Chave da API do SendGrid |
| SENDER_EMAIL | Email remetente para notificacoes |
| STRIPE_API_KEY | Chave da API do Stripe (sk_test_... ou sk_live_...) |
| PROTEMOS_API_KEY | Chave da API do Protemos |

### Frontend (.env)

| Variavel | Descricao |
|----------|-----------|
| REACT_APP_BACKEND_URL | URL da API backend |

## Deploy no Render (Recomendado)

O projeto inclui um arquivo `render.yaml` que configura automaticamente o deploy do frontend e backend.

### Opcao 1: Deploy Automatico com Blueprint

1. Acesse **https://render.com** e faca login
2. Clique em **"New"** → **"Blueprint"**
3. Conecte seu repositorio GitHub **Legacy-Portal**
4. O Render vai detectar o `render.yaml` automaticamente
5. Configure as variaveis de ambiente secretas:
   - `MONGO_URL` - URL do MongoDB Atlas
   - `SENDGRID_API_KEY` - Sua chave SendGrid
   - `SENDER_EMAIL` - Email remetente
   - `STRIPE_API_KEY` - Sua chave Stripe
   - `PROTEMOS_API_KEY` - Sua chave Protemos
6. Clique em **"Apply"**

### Opcao 2: Deploy Manual

#### Backend (Web Service)

1. Clique em **"New"** → **"Web Service"**
2. Conecte seu repositorio
3. Configure:
   - **Name**: `legacy-portal-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Adicione as variaveis de ambiente
5. Clique em **"Create Web Service"**

#### Frontend (Static Site)

1. Clique em **"New"** → **"Static Site"**
2. Conecte seu repositorio
3. Configure:
   - **Name**: `legacy-portal-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `build`
4. Adicione a variavel de ambiente:
   - `REACT_APP_BACKEND_URL` = URL do backend (ex: `https://legacy-portal-backend.onrender.com`)
5. Clique em **"Create Static Site"**

### MongoDB Atlas (Banco de Dados)

1. Acesse **https://cloud.mongodb.com**
2. Crie um cluster gratuito (M0)
3. Crie um usuario de banco de dados
4. Adicione seu IP a whitelist (ou 0.0.0.0/0 para acesso de qualquer lugar)
5. Copie a connection string e use como `MONGO_URL`

## APIs Integradas

- **Stripe**: Processamento de pagamentos
- **SendGrid**: Envio de emails
- **Protemos**: Gestao de projetos de traducao

## Licenca

Propriedade de Legacy Translations.
