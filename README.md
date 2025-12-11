# Legacy Translations Partner Portal

Portal para parceiros da Legacy Translations com sistema de cotações, tracking de pedidos e integracoes com Stripe, SendGrid e Protemos.

## Estrutura do Projeto

```
Legacy-Portal/
├── backend/
│   ├── server.py           # API FastAPI (Python)
│   ├── requirements.txt    # Dependencias Python
│   ├── .env.example        # Template de variaveis de ambiente
│   └── .env                # Variaveis de ambiente (criar a partir do .example)
├── frontend/
│   ├── src/
│   │   └── App.js          # React App principal
│   ├── package.json        # Dependencias Node.js
│   ├── .env.example        # Template de variaveis de ambiente
│   └── .env                # Variaveis de ambiente (criar a partir do .example)
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

## Deploy

### Frontend (Vercel)

1. Conecte seu repositorio ao Vercel
2. Configure o diretorio root como `frontend`
3. Adicione a variavel de ambiente `REACT_APP_BACKEND_URL`
4. Deploy automatico a cada push

### Frontend (Netlify)

1. Conecte seu repositorio ao Netlify
2. Build command: `npm run build`
3. Publish directory: `frontend/build`
4. Adicione a variavel de ambiente `REACT_APP_BACKEND_URL`

### Backend (Railway)

1. Conecte seu repositorio ao Railway
2. Configure o diretorio root como `backend`
3. Adicione todas as variaveis de ambiente
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

### Backend (Render)

1. Crie um novo Web Service
2. Conecte seu repositorio
3. Root Directory: `backend`
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
6. Adicione todas as variaveis de ambiente

## APIs Integradas

- **Stripe**: Processamento de pagamentos
- **SendGrid**: Envio de emails
- **Protemos**: Gestao de projetos de traducao

## Licenca

Propriedade de Legacy Translations.
