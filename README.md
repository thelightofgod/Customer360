# Customer 360 — BI Technology

Full-stack Customer 360 platform for Qlik Cloud & Talend customer management.

## Quick Start
```bash
pip install -r requirements.txt
python run.py
```
Open http://localhost:8000

## Architecture
- **db/schema.py** — 8 tables (accounts, products, subscriptions, contracts, health_scores, contacts, tickets, activities) + summary view
- **db/seed.py** — 12 demo accounts, 21 Qlik/Talend product SKUs, 55 subscriptions
- **api/main.py** — FastAPI REST API (10 endpoints)
- **frontend/index.html** — SPA with list/detail views, 5 tabs per account

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/accounts | List accounts (filter, search, sort) |
| GET | /api/accounts/summary | Portfolio KPIs |
| GET | /api/accounts/{id} | Full detail + subscriptions + tickets + contacts |
| GET | /api/products | Product catalog (21 SKUs) |
| GET | /api/products/{id} | Product + subscriber accounts |
| GET | /api/tickets | Filter by status/priority/account |
| GET | /api/contacts | All contacts |
| GET | /api/activities | Activity timeline |
| GET | /api/health/{id} | Health score breakdown |

## Product SKUs
Qlik Sense Enterprise Professional, Analyzer, Cloud Analytics Premium (50/100 GB),
Cloud Analytics Standard (5/10/25 GB), AutoML, NPrinting, Application Automation,
Data Integration, Talend Data Fabric, Talend Data Quality, Managed Services L1/L2/L3,
Qlik/Talend Development & Consulting

## PostgreSQL Migration
Replace sqlite3 → psycopg2, TEXT PKs → UUID, update connection string.
