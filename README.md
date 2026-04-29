# Customer 360 — BI Technology

A full-stack customer success platform for managing Qlik Cloud & Talend accounts, built with React, TypeScript, Express, and MongoDB.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui components |
| Routing | React Router v6 |
| Backend | Express + TypeScript (Node.js) |
| Database | MongoDB Atlas |
| Monorepo | npm workspaces |

## Project Structure

```
customer360/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── components/   # UI components + detail tabs
│       ├── pages/        # AccountsPage, AccountDetailPage, SubscriptionsPage, ContactsPage
│       ├── lib/          # api.ts, utils.ts
│       └── types/        # Shared TypeScript interfaces
├── server/          # Express backend
│   └── src/
│       ├── db/           # mongo.ts (connection), mongoRepository.ts
│       ├── routes/       # accounts, subscriptions, contacts, products, tickets, activities
│       └── types/        # Shared TypeScript interfaces
└── package.json     # Root workspace config
```

## Features

- **Accounts** — full portfolio view with KPI cards, filters (All / Active / Prospect / Renewal), search, and sort
- **Account Detail** — 6 tabs: Overview, Subscriptions, Tickets, Contacts, Activities, Notes
- **Subscriptions** — cross-account subscription list with product catalog integration
- **Contacts** — cross-account contact directory
- **Add / Delete** — create accounts, subscriptions, and contacts; delete accounts
- **Notes** — per-account notes with inline editing, persisted to MongoDB

## MongoDB Collections

| Collection | Key Fields |
|---|---|
| `Accounts` | Account Name, Sector / Industry, Tier, Edition, License Model, CSM Assigned, Contract Start, Renewal Date, ARR (€), NPS, SLA Compliance %, Avg Resolution |
| `Subscriptions` | Account Name, Product Name, Category, Product Group, Quantity, Unit, Unit Price (€), Total (€) |
| `Contacts` | Account Name, Contact Name, Role / Title, Contact Type, Email, Phone |
| `Product Catalog` | Product Name, Category, Product Group, License Model, List Price (€), Unit Type |

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Create `server/.env`:
```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGO_DB=<your-database-name>
```

### 3. Run (development)
```bash
npm run dev
```

Opens at `http://localhost:5173` (frontend) proxied to `http://localhost:8000` (API).

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/accounts` | List accounts (filter, search, sort, order) |
| GET | `/api/accounts/summary` | Portfolio KPIs |
| POST | `/api/accounts` | Create account |
| DELETE | `/api/accounts/:id` | Delete account |
| PATCH | `/api/accounts/:id/notes` | Update account notes |
| GET | `/api/accounts/:id` | Full account detail |
| GET | `/api/subscriptions` | All subscriptions |
| POST | `/api/subscriptions` | Create subscription |
| GET | `/api/contacts` | All contacts (optional `?account_id=`) |
| POST | `/api/contacts` | Create contact |
| GET | `/api/products` | Product catalog |
| GET | `/api/products/:id` | Product + subscribers |
