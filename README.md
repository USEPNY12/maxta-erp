# Max TA Group ERP System

A comprehensive Enterprise Resource Planning (ERP) system designed for glass fabrication and manufacturing operations at Max TA Group LLC.

## Features

### Sales & CRM
- Customer management with contacts and types
- Sales orders and order lines
- Quotes and quote conversion
- AR invoices and customer payments
- Salesperson commissions

### Purchasing
- Vendor management with types
- Purchase orders and PO lines
- PO receipts and receiving
- AP invoices and vendor payments

### Manufacturing
- Work orders with BOM explosion
- Work center management
- Production scheduling
- Shop floor tracking (real-time)
- Labor entry and tracking
- WO receipts and completions
- Recut tracking

### Inventory
- Item master with types and pricing
- Lot tracking and serial numbers
- Multiple locations/warehouses
- Physical counts and adjustments
- Label printing configuration

### Accounting
- Chart of accounts (GL)
- Journal vouchers with lines
- AR/AP aging
- Customer and vendor payments
- Bank accounts and reconciliation
- GL transactions and posting
- Accounting periods

### Reports & Dashboard
- Executive dashboard with KPIs
- Sales reports (by customer, salesperson, item)
- Manufacturing reports (WIP, efficiency, recuts)
- Inventory valuation
- Financial reports (P&L, Balance Sheet, Trial Balance)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Database | MySQL 8.0 |
| Auth | JWT (JSON Web Tokens) |
| Deployment | PM2 + Nginx (or Docker Compose) |

## Quick Start

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or pnpm

### Development Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_ORG/maxta-erp.git
cd maxta-erp

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run init-db   # Creates database and seeds admin user
npm run dev       # Starts with nodemon on port 5000

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev       # Starts Vite dev server on port 3000 (proxies /api to :5000)
```

### Production Deployment

```bash
# Using the deployment script (PM2 + Nginx)
chmod +x deploy.sh
./deploy.sh

# Or using Docker Compose
docker-compose up -d
```

## Default Login

- **Username:** admin
- **Password:** admin123

## API Documentation

All API endpoints are prefixed with `/api/` and require JWT authentication (except `/api/auth/login`).

### Authentication
- `POST /api/auth/login` - Login and receive JWT token

### Modules
- `/api/sales/*` - Sales orders, customers, quotes, shipments
- `/api/purchasing/*` - Purchase orders, vendors, PO receipts
- `/api/manufacturing/*` - Work orders, work centers, labor, shop floor
- `/api/inventory/*` - Items, lots, locations, adjustments
- `/api/accounting/*` - GL accounts, journal vouchers, AR/AP, payments
- `/api/reports/*` - Dashboard, financial reports, operational reports

## Project Structure

```
maxta-erp/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, schema, initialization
│   │   ├── middleware/      # Auth, validation
│   │   ├── routes/          # API route handlers
│   │   ├── utils/           # Sequence generator, helpers
│   │   └── server.js        # Express app entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React context (Auth)
│   │   ├── pages/           # Page components by module
│   │   ├── services/        # API client (axios)
│   │   └── App.jsx          # Router and layout
│   ├── .env.production
│   └── package.json
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── nginx-standalone.conf
├── docker-compose.yml
├── deploy.sh
└── README.md
```

## License

Proprietary - Max TA Group LLC. All rights reserved.
