# DripNow Dev — E-Commerce Platform

## Project Structure

```
dripnow dev/
├── backend/    # Node.js + Express + TypeScript API
└── frontend/   # React + Vite + TypeScript SPA
```

## Getting Started

### Backend
```bash
cd backend
cp .env.example .env
# Fill in your DB credentials and secrets
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

### Database
```bash
cd backend
npm run migrate
npm run seed
```

## Environment Variables

See `backend/.env.example` for all required variables.
