# DripNow Dev — E-Commerce Platform

Day 1–8 implementation, provider configuration, administrator bootstrap, tests and remaining deployment gates are documented in [backend/READINESS.md](backend/READINESS.md).

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

## Postman API Documentation & Maintenance

All backend API endpoints are fully documented and maintained via Postman artifacts located in `backend/`:

- **Collection**: [backend/DripNow_Postman_Collection.json](file:///e:/dripnow%20dev/backend/DripNow_Postman_Collection.json)
- **Environment**: [backend/DripNow_Postman_Environment.json](file:///e:/dripnow%20dev/backend/DripNow_Postman_Environment.json)

### Importing to Postman:
1. Open Postman app.
2. Click **Import** and select `DripNow_Postman_Collection.json` and `DripNow_Postman_Environment.json`.
3. Select the `DripNow Local Environment` from the environment dropdown.

### Regenerating / Updating Postman Collection:
Whenever new API endpoints or schemas are added to the backend, regenerate the collection with:
```bash
cd backend
npm run generate:postman
```

