# CLAUDE.md - AI Assistant Guidelines for Legacy Portal

## Project Overview

**Legacy Portal** is a full-stack B2B SaaS translation services platform with multiple user roles (Partners, Customers, Admin, Salespeople, Translators). It provides quote calculation, order management, document processing, payment handling, and translation workflow management.

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: MongoDB (async via Motor driver)
- **Payment**: Stripe
- **Email**: Resend API
- **OCR**: AWS Textract (primary), Tesseract (fallback)
- **AI**: Anthropic Claude API for translation/proofreading
- **Integrations**: QuickBooks (invoicing), Protemos (project management)

### Frontend
- **Framework**: React 19 with React Router v7
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI (Shadcn/ui pattern)
- **Forms**: React Hook Form + Zod validation
- **Build Tool**: Create React App with Craco

### Deployment
- **Platform**: Render.com
- **Backend**: Docker container
- **Frontend**: Static site build
- **Config**: `render.yaml` blueprint

## Project Structure

```
Legacy-Portal/
├── backend/
│   ├── server.py           # Main FastAPI app (~28k lines, monolithic)
│   ├── quickbooks.py       # QuickBooks OAuth integration
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Docker configuration
│   ├── build.sh            # Render build script
│   ├── Aptfile             # System dependencies (Tesseract)
│   └── .env.example        # Environment template
├── frontend/
│   ├── src/
│   │   ├── index.js        # Entry point with routing
│   │   ├── App.js          # Partner portal
│   │   ├── AdminApp.js     # Admin dashboard
│   │   ├── CustomerApp.js  # Customer quote page
│   │   ├── SalespersonApp.js # Sales dashboard
│   │   ├── TraduxAdminApp.js # Tradux brand admin
│   │   ├── B2BLandingPage.js # Partner landing
│   │   ├── AssignmentPage.js # Translator assignments
│   │   ├── VerificationPage.js # QR verification
│   │   ├── themes.js       # Theme configuration
│   │   ├── components/ui/  # Radix UI components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
│   ├── package.json
│   ├── tailwind.config.js
│   └── craco.config.js
├── tests/                  # Test files
├── docs/                   # Business documentation
├── contracts/              # Legal agreements
└── render.yaml             # Deployment config
```

## Development Commands

### Backend
```bash
cd backend

# Setup virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: .\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run development server
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env

# Run development server
npm start  # Runs on localhost:3000
```

### Code Quality (Backend)
```bash
black server.py          # Format code
flake8 server.py         # Lint
mypy server.py           # Type check
isort server.py          # Sort imports
pytest backend_test.py   # Run tests
```

## Application Routes

The frontend uses hash-based routing (`/#/`):

| Route | App | Purpose |
|-------|-----|---------|
| `/#/customer/*` | CustomerApp | Public quote calculator & order form |
| `/#/partner` | B2BLandingPage | Partner signup landing page |
| `/#/partner/*` | App | Partner dashboard & portal |
| `/#/admin/*` | AdminApp | Internal admin dashboard |
| `/#/tradux-admin/*` | TraduxAdminApp | Tradux brand admin |
| `/#/sales/*` | SalespersonApp | Sales team dashboard |
| `/#/assignment/:token` | AssignmentPage | Translator assignment acceptance |
| `/#/verify/:certId` | VerificationPage | Public certificate verification |

## API Structure

All API endpoints are prefixed with `/api`. Key endpoint groups:

- **Partner Auth**: `/api/partner/auth/*` (register, login, logout, me)
- **Admin Auth**: `/api/admin/auth/*`
- **Customer Auth**: `/api/customer/auth/*`
- **Orders**: `/api/partner/orders/*`, `/api/admin/orders/*`
- **Invoices**: `/api/partner/invoices/*`, `/api/admin/partner-invoices/*`
- **Documents**: `/api/upload-document`, `/api/documents/*`
- **Quotes**: `/api/calculate-quote`
- **Payments**: `/api/create-payment-checkout`, `/api/stripe-webhook`
- **QuickBooks**: `/api/quickbooks/*`
- **Health**: `/api/health`

## Key Collections (MongoDB)

Core collections:
- `partners` - B2B partner accounts
- `translation_orders` - Main order records
- `partner_invoices` - Invoice records
- `admin_users` - Admin/PM/Translator accounts
- `documents` - Uploaded files (base64)
- `certifications` - Digital certifications with QR codes
- `salespeople` - Sales representatives
- `customers` - Guest/customer accounts

## Environment Variables

### Backend (Required)
```
MONGO_URL=mongodb://...
DB_NAME=legacy_translations
RESEND_API_KEY=...
SENDER_EMAIL=noreply@domain.com
STRIPE_API_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Backend (Optional)
```
PROTEMOS_API_KEY=...
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### Frontend
```
REACT_APP_API_URL=http://localhost:8000/api
```

## Coding Conventions

### Python (Backend)
- All endpoints use `async def`
- Use `await` for all database operations
- Pydantic models for request/response validation
- Error handling with `HTTPException`
- Logging via Python's `logging` module
- Snake_case for functions and variables

### JavaScript (Frontend)
- Functional components with hooks
- camelCase for variables and functions
- PascalCase for components
- Tailwind CSS for styling
- Axios for API calls
- Local state with useState/useReducer

### Database Patterns
```python
# Find one
result = await db.collection.find_one({"id": id})

# Find many with pagination
results = await db.collection.find(query).sort("created_at", -1).limit(20).to_list(20)

# Insert
await db.collection.insert_one(document)

# Update
await db.collection.update_one({"id": id}, {"$set": updates})
```

### Authentication Pattern
- Token-based authentication (JWT-like custom tokens)
- Tokens stored in `Authorization` header or `token` query param
- In-memory token storage with database persistence
- 24-hour token expiration

## Business Logic

### Order Status Flow
```
Received → In Translation → Review → Ready → Delivered
```

### Payment Status
```
Pending → Paid / Overdue
```

### Partner Payment Plans
1. **Pay-Per-Order** - Immediate payment per order
2. **Biweekly Invoice** - Requires 10+ paid orders, admin approval
3. **Monthly Invoice** - Higher volume, admin approval

### Pricing Model
- Base price per word (certified vs standard)
- Urgency multipliers: Normal (1x), Priority (1.5x), Urgent (2x)
- Professional add-on fees

## Important Notes for AI Assistants

### Do
- Read existing code before making changes
- Follow existing patterns in the codebase
- Use async/await for all database operations
- Validate inputs with Pydantic models
- Handle errors appropriately with HTTPException
- Test changes locally before committing
- Keep the monolithic backend structure (don't split into modules)

### Don't
- Create new route files (keep everything in server.py)
- Change authentication patterns without careful review
- Modify payment processing without thorough testing
- Add new dependencies without necessity
- Hardcode sensitive values (use environment variables)
- Skip error handling for database operations

### Common Tasks

**Adding a new endpoint:**
1. Define Pydantic models for request/response
2. Add the endpoint function in `server.py`
3. Use the `api_router` for registration
4. Follow existing patterns for auth, error handling

**Adding a frontend feature:**
1. Identify the correct App file (AdminApp, App, CustomerApp, etc.)
2. Use existing Radix UI components from `components/ui/`
3. Follow Tailwind CSS patterns for styling
4. Use axios for API calls with proper error handling

**Modifying database schema:**
1. Update relevant Pydantic models
2. Ensure backward compatibility with existing data
3. Add migration logic if needed for existing records

## Testing

```bash
# Backend tests
cd backend
pytest backend_test.py -v
pytest final_comprehensive_test.py -v

# Frontend tests
cd frontend
npm test
```

## Deployment

Push to GitHub triggers automatic deployment via Render:
- Backend: Docker build from `backend/Dockerfile`
- Frontend: Static build via `npm run build`

Manual deployment commands in `render.yaml`.
