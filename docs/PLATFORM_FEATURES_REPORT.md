# Legacy Translation Services - Platform Features Report

## Document Information
- **Document Type**: Platform Functionality Overview (Evaluation Document)
- **Date**: March 2026
- **Classification**: Internal / Evaluation Use Only
- **Note**: Sensitive configuration details, API keys, and authentication mechanisms have been intentionally omitted from this document for security purposes.

---

## 1. Platform Architecture Overview

Legacy Translation Services is a full-stack web application built for professional certified translation services. The platform serves multiple user roles through dedicated portals, each with role-based access control.

### Technology Stack
- **Frontend**: React.js with Tailwind CSS, Recharts for data visualization
- **Backend**: FastAPI (Python) with async support
- **Database**: MongoDB (via Motor async driver)
- **Payment Processing**: Stripe integration (credit card), Zelle (manual approval)
- **Document Processing**: PDF.js, PyMuPDF, Tesseract OCR, mammoth (DOCX)
- **AI Integration**: Claude API for AI-assisted translation and proofreading
- **Accounting**: QuickBooks Online integration
- **Deployment**: Render (backend), Vercel (frontend)

### Application Routes & Portals
| Portal | Route | Target Users |
|--------|-------|-------------|
| Customer Portal | `/#/` or `/#/customer` | End customers requesting quotes |
| Admin Panel | `/#/admin` | Administrators, PMs, Translators |
| Partner Portal (B2B) | `/#/partner` | Business partners (law firms, agencies) |
| Sales Portal | `/#/sales` | Salesperson team |
| Vendor Translator Portal | `/#/vendor` | External vendor translators |
| TRADUX Admin | `/#/tradux-admin` | TRADUX brand admin (multi-brand) |
| Document Verification | `/#/verify/:id` | Public verification page |
| Assignment Page | `/#/assignment/:token/:action` | Translator assignment accept/decline |

---

## 2. ADMIN PANEL - Complete Feature Map

The Admin Panel (`AdminApp.js` - 40,000+ lines) is the core management hub. Access is role-based with four user types: **Admin**, **Project Manager (PM)**, **Translator**, and **Sales**.

### 2.1 Top Navigation Bar (Role-Based Tabs)

| Tab | Icon | Label | Available Roles | Description |
|-----|------|-------|----------------|-------------|
| `projects` | 📋 | PROJECTS | Admin, Sales | Central project/order management dashboard |
| `new-quote` | 📝 | NEW QUOTE | Sales | Create new quotes for clients |
| `translation` | ✍️ | TRANSLATION | Admin, PM, Translator | Translation Workspace (full editing environment) |
| `production` | 📊 | REPORTS | Admin | Production statistics, translator metrics, charts |
| `expenses` | 💸 | EXPENSES | Admin | Company expense tracking and management |
| `finances` | 🤝 | PARTNERS | Admin | Partner management, invoicing, payments, coupons |
| `followups` | 🔔 | FOLLOW-UPS | Admin | Automated client follow-up system |
| `pm-dashboard` | 🎯 | PM DASHBOARD | PM | Dedicated project manager workspace |
| `messages` | 💬 | MESSAGES | PM | PM-specific messaging center |
| `sales-control` | 📈 | SALES | Admin | Sales team management and commissions |
| `users` | 👥 | TRANSLATORS | Admin | Translator/user management |
| `settings` | ⚙️ | SETTINGS | Admin | System settings, backups, integrations |
| `mia-bot` | 🤖 | MIA BOT | Admin | AI chatbot management (external link) |

### 2.2 PROJECTS Tab (Admin, Sales)

The Projects page is the primary order management interface.

**Core Features:**
- **Order List View**: Displays all translation orders with status indicators
- **Status Color Coding**: Visual status indicators (received, in translation, review, ready, delivered, cancelled)
- **Payment Status Tracking**: Payment color codes for financial overview
- **Search & Filtering**: Search by order number, client name, language pair
- **Order Detail Modal**: Expandable view with tabs for Details, Files, and Workflow
- **Quick Actions**: Assign translator, change status, add notes, set deadlines
- **Translator Assignment**: Assign orders to translators with deadline setting
- **File Management**: Upload/download source documents and translations
- **Client Communication**: Send status updates and completed translations to clients
- **Order Source Tracking**: Track whether order came from partner, direct client, or salesperson
- **Deadline Management**: Set and track client deadlines and translator (TR) deadlines
- **Flag System**: Country flags for visual language pair identification
- **Bulk Operations**: Multi-select for batch status changes
- **Project Notes**: Internal notes per project
- **QuickBooks Sync**: Generate receipts/invoices in QuickBooks directly from orders

**Order Statuses:**
- Received → In Translation → Review → Ready → Delivered
- Additional: Cancelled, Final

**Payment Statuses:**
- Pending, Paid, Overdue, Refunded, Free (coupon)

### 2.3 TRANSLATION Tab / Translation Workspace (Admin, PM, Translator)

The Translation Workspace is a full-featured translation environment with multiple sub-tabs:

#### Sub-tabs (Role-Based Access):
| Sub-tab | Label | Roles | Description |
|---------|-------|-------|-------------|
| `start` | START | Admin, PM, Translator | Project setup, API key config, cover letter selection |
| `translate` | TRANSLATION | Admin, PM, Translator | AI-assisted translation with side-by-side view |
| `upload-translation` | UPLOAD TRANSLATION | Admin, PM | Upload externally completed translations |
| `review` | REVIEW | Admin, PM, Contractors, In-house | Review and QA of completed translations |
| `proofreading` | PROOFREADING | Admin, PM, In-house | AI-powered proofreading with error detection |
| `deliver` | DELIVER | Admin, PM, In-house | Generate final certified PDF package |
| `glossaries` | GLOSSARIES | Admin, PM, In-house | Manage translation glossaries |
| `tm` | TM | Admin, PM, In-house | Translation Memory management |
| `instructions` | INSTRUCTIONS | Admin, PM, In-house | Translation instructions and style guides |
| `templates` | TEMPLATES | Admin, PM, In-house | Document templates for various document types |

**START Sub-tab Features:**
- Claude API Key configuration (admin only)
- Cover letter template selection (default + custom)
- Certificate template customization
- OCR processing configuration
- Document type selection
- Language pair setup
- Processing status indicators

**TRANSLATION Sub-tab Features:**
- **AI-Powered Translation**: Uses Claude API for intelligent translation
- **Side-by-Side View**: Original document alongside translation (independent page navigation)
- **OCR Integration**: Automatic text extraction from scanned documents
- **Multi-Page Support**: Handle documents with multiple pages individually
- **Page Grouping**: Group pages that belong together (e.g., front/back of same document)
- **Batch Translation**: Select multiple files for batch AI translation
- **HTML Editor**: Rich text editing with formatting preservation
- **Edit Mode**: Toggle between view and edit modes
- **Layout Preservation**: Maintains original document formatting and structure
- **Special Commands**: Custom OCR instructions for complex documents
- **File Management**: View assigned files, project files, individual file selection

**UPLOAD TRANSLATION Sub-tab:**
- Upload externally completed translations (Word, PDF, HTML)
- PM can upload translations done outside the system
- Accept/reject uploaded translations

**REVIEW Sub-tab:**
- Side-by-side comparison: original vs translation
- Full-screen review mode
- Edit translated content directly
- Approve, reject, or request revisions
- Revision notes system
- PM filter for admin view
- Security section: suspicious user detection, login attempt monitoring, IP history

**PROOFREADING Sub-tab:**
- AI-powered proofreading using Claude API
- Error detection and highlighting
- Click-to-navigate error locations
- Correction suggestions
- Grammar, spelling, and consistency checks

**DELIVER Sub-tab:**
- **Certified PDF Generation**: Generate complete certified translation packages
- **Package Components**: Cover letter, letterhead, translation, original document, verification QR code
- **SHA-256 Hash**: PDF integrity verification with cryptographic hash
- **QR Code Verification**: Public verification page for document authenticity
- **PDF Customization**: Include/exclude components (cover letter, letterhead, original, verification page)
- **Multiple Document Types**: Support for 20+ document types (birth certificates, diplomas, contracts, etc.)
- **Batch Delivery**: Process multiple files in one operation

**GLOSSARIES Sub-tab:**
- Create and manage translation glossaries
- Language-pair specific glossaries
- Import/export glossary terms
- Shared across translation team

**TM (Translation Memory) Sub-tab:**
- Store previously translated segments
- Automatic matching for repeated content
- Leverage existing translations for consistency

**TEMPLATES Sub-tab:**
- Document templates for common document types
- Pre-formatted layouts for birth certificates, marriage certificates, diplomas, etc.
- Custom template creation
- Template management (create, edit, delete)

### 2.4 REPORTS Tab (Admin Only)

**Production Statistics:**
- Translator production metrics (pages, orders, completion rates)
- Time-period filtering (week, month, custom date range)
- Interactive charts (Bar, Pie, Area charts via Recharts)
- Per-translator detailed order history
- Performance comparisons across translators

**Payment Management:**
- Record translator payments
- Payment history tracking
- Payment methods: Bank transfer, Zelle, etc.
- Rate per page and rate per word tracking
- Payment reports by period

### 2.5 EXPENSES Tab (Admin Only)

**Expense Categories:**
- Fixed Expenses
- Translators
- AI & Technology
- Marketing
- Office
- Utilities
- Other

**Features:**
- Add/edit/delete expenses
- Receipt upload (images, PDFs up to 10MB)
- Recurring expense tracking
- Vendor/supplier association
- Date-based filtering
- Expense category breakdowns
- Financial reporting

### 2.6 PARTNERS Tab (Admin Only)

This is a comprehensive partner relationship management system.

**Partner Management Views:**
- Overview (financial summary)
- QuickBooks integration
- Partner list/management
- Pages tracking

**Partner CRM Features:**
- **Partner Pipeline**: Filter by status (All, Registered, Prospect, New, First Email, Follow-up 1, Follow-up 2, Archived)
- **Partner Search**: Search partners by name, email, company
- **Add Prospects**: Manual prospect entry
- **Bulk Email**: Send templated or custom emails to multiple partners
- **Email Templates**: Auto-select based on pipeline stage (first contact, follow-up 1, follow-up 2)
- **Email Search**: Find partners by email address

**Partner Invoicing:**
- Create invoices for partner orders
- Select orders to include in invoice
- Due date configuration (days-based or fixed date)
- Manual discount application with reason tracking
- Invoice editing (discount, due date, company name, notes)
- Invoice status management
- Zelle payment approval workflow
- Payment history tracking

**Coupon Management:**
- Assign coupon templates to partners
- Set maximum uses per coupon
- Track coupon usage

**Translator Payments:**
- Record payments to translators
- Payment types: Translation, Commission
- Multiple payment methods
- Receipt file upload with preview
- Quick add vendor
- Payment reporting

**Pages Tracking:**
- Log translated pages per translator
- Date-based tracking
- Notes per entry
- Edit/delete page logs

### 2.7 FOLLOW-UPS Tab (Admin Only)

**Automated Follow-up System:**
- Visual pipeline showing quote stages
- Automatic reminder emails based on configured timeline
- Toggle automatic follow-ups on/off
- Manual trigger for follow-up processing
- Exclude specific clients from follow-ups
- Track conversion rates (quotes → orders)
- Stage-based client lists

### 2.8 PM DASHBOARD (Project Manager Only)

Dedicated workspace for Project Managers with 8 sections:

| Section | Icon | Description |
|---------|------|-------------|
| Overview | 📊 | Stats cards (total projects, in progress, awaiting review, completed) |
| Review Translations | ✅ | Review queue with badge count, side-by-side review, approve/reject/revision |
| TR Deadlines | ⏰ | Translator deadline tracking and management |
| My Team | 👥 | Team member overview and assignment management |
| Calendar | 📅 | Project timeline and deadline calendar |
| Reports | 📈 | PM-specific performance reports |
| Messages | 💬 | Bidirectional messaging with translators |
| Quick Package | 📦 | Quick certified translation package generation |

**PM-Specific Features:**
- Review translations with proofreading (Claude AI)
- PM approval workflow (approve before sending to admin)
- Upload translations on behalf of translators
- Send complete projects to translators with deadlines
- View and manage project files
- File assignments per project
- Convert documents to HTML
- AI-assisted corrections with custom commands
- Error highlighting in translations
- Package generation (with original documents, cover letters, verification)

### 2.9 MESSAGES Tab (PM Only)

- Full conversation history with translators
- Bidirectional messaging
- Reply to translator messages
- Mark messages as read
- Real-time refresh (30-second polling)

### 2.10 SALES Tab (Admin Only)

**Sales Control Dashboard with 6 sub-tabs:**

| Sub-tab | Icon | Description |
|---------|------|-------------|
| Dashboard | 📊 | KPIs: total salespeople, monthly acquisitions, commissions, tier distribution |
| Salespeople | 👥 | Manage sales team members, edit profiles, generate referral links |
| Acquisitions | 🤝 | Track partner acquisitions by salesperson, outreach emails |
| Goals | 🎯 | Set and track monthly targets per salesperson |
| Ranking | 🏆 | Salesperson performance ranking |
| Payments | 💰 | Manage and process salesperson commissions |

**Features:**
- Add/edit salespeople with commission structure
- Multiple commission types (tier-based, flat rate)
- Referral link generation
- Partner acquisition tracking
- Outreach email management
- Monthly goal setting (partners + revenue targets)
- Performance ranking
- Pending commission tracking
- Payment processing with method and reference
- Monthly trend charts

### 2.11 TRANSLATORS Tab (Admin Only)

**User/Translator Management:**
- List all system users (translators, PMs, admins)
- Search by name/email
- Create new users with role assignment
- Translator types: Contractor, In-house, Vendor
- Rate configuration (per page, per word)
- Language pair assignment
- Edit user profiles inline
- Document management per translator:
  - ID Document
  - CPF
  - Proof of Residence
  - Service Agreement
  - Bank Details
  - Certification/Diploma
  - Portfolio/Samples
- Upload/download/delete documents
- Invite translators via email (password setup link)

### 2.12 SETTINGS Tab (Admin Only)

**System Configuration:**
- **QuickBooks Integration**: Connect/disconnect QuickBooks Online, OAuth flow
- **Data Export**: Export to CSV (projects, clients, translators, financial data)
- **Archived Messages**: View and unarchive partner/translator messages
- **Restore Points**: Create/restore system backups, download source code
- **Multi-Brand Theme**: Switch between Legacy and TRADUX themes

### 2.13 Global Features (Across All Tabs)

- **Toast Notification System**: Smart auto-detection of message type (success/error/info)
- **Notification Bell**: Real-time notifications for Zelle payments, invoice updates
- **Message Notification Bar**: Yellow highlight bar for unread partner/translator messages
- **Floating Chat Widget**: Quick messaging for PMs to contact translators/partners
- **New York Timezone**: All dates displayed in EST/EDT
- **Multi-Language Support**: EN/PT/ES interface strings
- **Theme System**: Legacy (dark blue) and TRADUX (modern teal) themes
- **Responsive Design**: Works on desktop, tablet, and mobile

---

## 3. PARTNER PORTAL (B2B) - Complete Feature Map

The Partner Portal (`App.js` - 5,900+ lines) is the B2B client-facing interface for translation agency partners.

### 3.1 B2B Landing Page (`B2BLandingPage.js`)

**Public-Facing Marketing Page:**
- Company information and service highlights
- Partnership benefits showcase (monthly invoicing, volume discounts, priority processing, dedicated support)
- How it works guide (3-step process)
- Free translation offer (1 page, welcome coupon)
- Discount structure display (tiered pricing)
- Multi-language support (EN, ES, PT)
- Call-to-action for registration
- Partner login access

### 3.2 Partner Login & Registration

- **Email/Password Authentication**
- **Multi-Language Login** (English, Spanish, Portuguese)
- **Registration Form**: Company name, contact name, email, phone, password
- **Partner Agreement**: Terms acceptance required
- **Partner Benefits Display**: Discount tiers, margin calculations
- **Forgot Password**: Email-based password reset
- **Auto-Login**: Session persistence via localStorage

### 3.3 Partner Dashboard Sidebar Navigation

| Tab | Icon | Description |
|-----|------|-------------|
| New Order | ➕ | Submit new translation orders |
| My Orders | 📦 | Track all submitted orders |
| Invoices | 🧾 | View and manage invoices |
| Messages | ✉️ | Communication with Legacy team |
| Payment Plan | 💳 | Payment plan management |
| Profile | 👤 | Company profile settings |

### 3.4 New Order Page

**Order Submission Features:**
- Client name and email fields
- Service type selection (certified translation)
- Language pair selection (from/to) with flag icons
- Document type selection (20+ types)
- File upload with drag-and-drop
- Urgency levels (Standard 24h, Priority 12h, Urgent 6h)
- Automatic price calculation based on partner tier
- Coupon code application
- Additional notes field
- Real-time pricing preview
- Partner discount automatically applied

### 3.5 My Orders Page

- Order list with status tracking
- Visual progress pipeline (Received → In Translation → Review → Ready → Delivered)
- Payment status indicators
- Download completed translations
- Order details view
- Search and filter by status

### 3.6 Invoices Page

- View all partner invoices
- Invoice details (amount, discount, due date)
- Payment status tracking
- Payment options:
  - **Stripe**: Credit card payment with inline payment form
  - **Zelle**: Manual payment with admin approval workflow
- Invoice history
- Multi-currency support

### 3.7 Messages Page

- **Conversations Tab**: Bidirectional messaging with Legacy team
- **Notifications Tab**: System notifications and updates
- Send/receive messages
- Read/unread status tracking
- Floating chat widget for quick communication

### 3.8 Payment Plan Page

- View current payment plan/tier
- Payment plan qualification (biweekly invoice after 10 paid translations)
- Plan upgrade requests
- Payment history
- Balance and credit tracking

### 3.9 Profile Page

- Edit company information
- Update contact details
- Password change
- Account settings

### 3.10 Partner Floating Chat Widget

- Persistent chat button on all pages
- Quick message to Legacy team
- Chat history view
- Real-time messaging

---

## 4. TRANSLATION WORKSPACE - Detailed Feature Map

The Translation Workspace is the most feature-rich component, providing a complete Computer-Assisted Translation (CAT) environment.

### 4.1 Document Processing Pipeline

```
Upload → OCR Extraction → AI Translation → Proofreading → Review → Certification → Delivery
```

### 4.2 OCR (Optical Character Recognition)

- Automatic text extraction from scanned documents
- Support for images (JPG, PNG) and PDFs
- Custom OCR commands for special documents
- Layout preservation instructions
- Multi-page document handling
- Page-by-page processing

### 4.3 AI-Powered Translation

- Claude AI integration for intelligent translation
- Context-aware translation preserving document layout
- Special handling for legal/certified documents
- Maintains formatting, tables, headers, footers
- HTML-based translation preserving structure
- Custom instructions per document type
- Batch processing for multi-file projects

### 4.4 Side-by-Side Editor

- Original document view (left panel)
- Translation editor (right panel)
- Independent page navigation per panel
- Toggle between view and edit modes
- Rich text editing capabilities
- HTML source editing
- Real-time preview

### 4.5 Certified Document Generation

**Supported Document Types (20+):**
- Birth Certificate
- Marriage Certificate
- Death Certificate
- Divorce Decree
- Diploma / Degree
- Academic Transcript
- Driver's License
- Passport
- Power of Attorney
- Court Document
- Contract / Agreement
- Medical Record
- Bank Statement
- Tax Document
- Immigration Document
- ID Card
- Vaccine Record
- Criminal Record
- Affidavit
- Business Document
- Other

**PDF Package Components:**
1. **Cover Letter**: Certification statement with translator credentials
2. **Letterhead**: Company branding (customizable logos)
3. **Translation**: Formatted translated document
4. **Original Document**: Scanned original attached
5. **Verification Page**: QR code for online authenticity verification

**Security Features:**
- SHA-256 hash verification for PDF integrity
- QR code linking to public verification page
- Certification ID tracking
- Tamper detection

### 4.6 Translation Memory (TM)

- Store translated segments for reuse
- Automatic matching of previously translated content
- Consistency across multiple documents
- Segment-level storage and retrieval

### 4.7 Glossaries

- Term-specific translation databases
- Language-pair management
- Consistent terminology across projects
- Import/export capabilities

### 4.8 Templates System

- Pre-built templates for common document types
- Customizable template content
- Template management (CRUD operations)
- Order-specific template assignment

---

## 5. CUSTOMER PORTAL - Feature Map

The Customer Portal (`CustomerApp.js` - 3,700+ lines) is the public-facing interface for end customers.

### 5.1 Features

- **Quote Request Form**: Upload documents, select languages, receive instant quote
- **Multi-Language Interface**: English, Spanish, Portuguese
- **Payment Integration**: Stripe (credit card) with inline payment form
- **Order Tracking**: Visual pipeline showing translation progress stages
- **Document Download**: Download completed translations
- **Real-time Status Updates**: Receive email notifications at each stage
- **Language Selection**: Extensive language list with country flags
- **Document Type Selection**: Categorized document types
- **Urgency Options**: Standard, Priority, Urgent delivery times
- **Coupon Support**: Apply discount codes at checkout

---

## 6. VENDOR TRANSLATOR PORTAL - Feature Map

The Vendor Translator Portal (`VendorTranslatorApp.js` - 990 lines) is a simplified interface for external vendor translators.

### 6.1 Features

- **Login**: Email/password authentication (vendor translators only)
- **Assigned Projects**: View projects assigned by PM
- **Project Files**: Download source documents for translation
- **Upload Translations**: Upload completed translation files
- **Send to PM**: Submit translations for review
- **Messaging**: Per-project chat with PM
- **Company Branding**: Display Legacy Translations logo
- **Status Tracking**: View project status (excludes delivered/cancelled)

---

## 7. SALESPERSON PORTAL - Feature Map

The Salesperson Portal (`SalespersonApp.js` - 1,580 lines) enables sales team members to manage partner acquisitions.

### 7.1 Navigation Tabs

| Tab | Description |
|-----|-------------|
| Dashboard | KPIs: monthly partners, pending commissions, total earned, goal progress |
| Register Partner | Form to register new B2B partners |
| My Commissions | View earned and pending commissions |
| Payment History | Track commission payments received |
| Messages | Internal messaging with admin |
| How It Works | Commission structure explanation |

### 7.2 Features

- **Dashboard**: Monthly registrations, commission tracking, goal progress
- **Partner Registration**: Register new partners with company details and tier
- **Commission Tracking**: View pending and paid commissions
- **Payment History**: Detailed payment records with amounts and methods
- **Referral System**: Unique referral links per salesperson
- **Notifications**: System notifications with mark-as-read
- **Multi-Language**: English, Spanish, Portuguese interface
- **Set Password**: Initial password setup via invitation link
- **Internal Messaging**: Inbox, sent messages, compose new messages

---

## 8. ADDITIONAL FEATURES & INTEGRATIONS

### 8.1 QuickBooks Online Integration
- OAuth 2.0 authentication flow
- Create sales receipts/invoices for orders
- Sync order data to accounting
- Connect/disconnect from Settings

### 8.2 Stripe Payment Processing
- Inline payment form (Payment Element)
- Credit card processing
- Payment intent confirmation
- Webhook integration for order creation
- Multi-currency support

### 8.3 Document Verification System
- Public verification page (`/#/verify/:certificationId`)
- QR code scanning verification
- SHA-256 hash integrity check
- Certification authenticity confirmation
- No authentication required (public access)

### 8.4 Email System
- Automated follow-up emails
- Partner outreach campaigns
- Order status notifications
- Invoice reminders
- Bulk email capabilities
- Template-based emails

### 8.5 Security Features
- Role-based access control (RBAC)
- Session management with token authentication
- Suspicious user detection
- Login attempt monitoring
- IP history tracking
- Invitation-based user registration
- Password reset flow
- Admin key authentication

### 8.6 Multi-Brand Support
- Legacy Translation Services (primary brand)
- TRADUX (secondary brand)
- Theme switching capability
- Separate admin portals per brand

---

## 9. SUMMARY - Platform Metrics

| Metric | Value |
|--------|-------|
| Total Frontend Lines of Code | ~52,000+ |
| Total Backend Lines of Code | ~34,000+ |
| Number of Portals | 7 (Admin, Customer, Partner, Sales, Vendor, TRADUX, Verification) |
| Admin Panel Tabs | 13 (role-based) |
| Translation Workspace Sub-tabs | 10 |
| PM Dashboard Sections | 8 |
| Sales Control Sub-tabs | 6 |
| Partner Portal Pages | 6 |
| API Endpoints | 500+ functions |
| Supported Document Types | 20+ |
| Supported Languages | 30+ translation languages |
| Interface Languages | 3 (English, Spanish, Portuguese) |
| User Roles | 6 (Admin, PM, Translator In-house, Translator Contractor, Vendor, Sales) |
| Payment Methods | 3 (Stripe Credit Card, Zelle, Invoice) |
| Integrations | 4 (Stripe, QuickBooks, Claude AI, Email) |

---

*This document provides a high-level overview of platform capabilities for evaluation purposes. Implementation details, API endpoints, database schemas, and authentication mechanisms have been intentionally excluded to protect proprietary systems and security.*
