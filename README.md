# URIS — User Resource Intelligence System

Internal platform for managing intern cohorts at STEMONEF. Tracks capacity, task workload, performance scores, and team intelligence across all active leads and interns.

---

## Stack

- **Backend** — Node.js, Express, Prisma, PostgreSQL, Socket.IO
- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Real-time** — Socket.IO (messaging, presence, typing indicators)
- **Auth** — JWT, bcrypt, role-based access control (11 roles)

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- A `.env` file in `backend/` (copy from `.env.example`)

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Apply migrations and generate Prisma client

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 3. Seed demo data (optional)

```bash
node prisma/seed.js
```

### 4. Start servers

```bash
# Terminal 1 — backend (port 5000)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

Open `http://localhost:5173`.

---

## Environment Variables

See `backend/.env.example` for the full list. The minimum required:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Min 32-char random hex string |
| `FRONTEND_URL` | Frontend origin (required in production) |

---

## Project Structure

```
backend/          Express API, Prisma schema, services, controllers
frontend/         React app, pages, components, stores
tests/e2e/        Playwright end-to-end tests
.kiro/specs/      Feature specs (requirements → design → tasks)
```

---

## Running Tests

```bash
cd tests/e2e
npm install
npm test           # headless
npm run test:ui    # interactive
```

See `tests/e2e/README.md` for full instructions.

---

## Key Documentation

| File | Purpose |
|---|---|
| `RUNBOOK.md` | Operations guide — env vars, scheduler, health checks, migrations, troubleshooting |
| `FEATURES.md` | Full feature catalogue — all roles, scoring engines, pages, and API routes |
| `TODO.md` | Active development backlog |
| `tests/e2e/README.md` | E2E test setup and test journey index |

---

## Roles

| Role | Access Level |
|---|---|
| `CORE_ADMIN` | Full system access |
| `TECHNICAL_LEAD` / `OPERATIONS_LEAD` / `RESEARCH_LEAD` | Team management, task assignment, reviews |
| `OPERATIONS_PROGRAM_MANAGER` | Monitoring, digests, archive management |
| `OBSERVER_TEAM_LEAD` / `COLLABORATOR_LEAD` | Limited view and archive access |
| `TECHNICAL_INTERN` / `OPERATIONS_INTERN` / `RESEARCH_INTERN` | Individual contributor access |
| `PAST_EMPLOYEE` | Read-only alumni access |

---

## Health Checks

```bash
curl http://localhost:5000/health/ready   # DB connectivity
curl http://localhost:5000/health/live    # Process liveness
curl http://localhost:5000/health         # Full diagnostic
```
