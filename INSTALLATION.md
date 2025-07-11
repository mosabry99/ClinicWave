# ClinicWave — Installation Guide

Welcome to ClinicWave, the modern SaaS medical-clinic management system.  
This document shows two ways to get ClinicWave running:

1. **Docker Quick-Start** – everything in containers (recommended).  
2. **Manual (no-Docker) Setup** – install each dependency yourself.

---

## 1. Prerequisites

| Component | Recommended Version | Purpose |
|-----------|--------------------|---------|
| Git       | latest             | clone the repo |
| Node.js   | ≥ 18               | build & run JS/TS code |
| pnpm      | ≥ 8 (via corepack) | workspace package manager |
| Docker + Docker Compose | latest | run containers (Docker path) |
| PostgreSQL| ≥ 13               | relational database |
| Redis     | ≥ 6                | cache, queues, sessions |
| MinIO *(optional)* | latest    | S3-compatible object storage |

**Memory:** 4 GB min, 8 GB recommended   **Disk:** 10 GB free  
**OS:** Windows 10+, macOS, or any modern Linux.

---

## 2. Clone Repository

```bash
git clone https://github.com/mosabry99/ClinicWave.git
cd ClinicWave
```

---

## 3. Environment Variables

Copy the template and edit the values you need:

```bash
cp .env.example .env
```

Key variables to review:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/clinicwave?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_me
ENCRYPTION_KEY=32_characters_secret_key________
ENCRYPTION_IV=16_char_iv____
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
S3_ENDPOINT=http://localhost:9000          # MinIO, optional
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
```

---

## 4. Docker Quick-Start (5 minutes)

### 4.1 Run Everything

```bash
docker compose up --build
# run detached:
# docker compose up -d --build
```

What starts:

| Service   | Purpose                          | URL |
|-----------|----------------------------------|-----|
| **web**   | React PWA frontend               | http://localhost:3000 |
| **api**   | NestJS backend (REST + WS)       | http://localhost:4000 |
| **postgres** | PostgreSQL database           | 5432 |
| **redis** | Redis cache/queues               | 6379 |
| **minio** | Object storage console           | http://localhost:9001 |
| **mailhog** | Dev SMTP viewer *(dev profile)*| http://localhost:8025 |

First run automatically:

* Generates Prisma client  
* Applies DB migrations  
* Seeds demo data  

### 4.2 Stop / Clean Up

```bash
docker compose down           # stop containers
docker compose down -v        # stop + remove volumes
```

---

## 5. Manual Setup (no Docker)

> Skip any service you already have.

### 5.1 Install PostgreSQL

macOS (Homebrew):

```bash
brew install postgresql@15
brew services start postgresql@15
createdb clinicwave
```

Ubuntu:

```bash
sudo apt update && sudo apt install postgresql
sudo -u postgres createuser -P clinicwave_user
sudo -u postgres createdb -O clinicwave_user clinicwave
```

Update `DATABASE_URL` accordingly.

### 5.2 Install Redis

macOS:

```bash
brew install redis
brew services start redis
```

Ubuntu:

```bash
sudo apt install redis-server
sudo systemctl enable --now redis-server
```

### 5.3 (Option) Install MinIO

```bash
mkdir ~/minio-data
minio server ~/minio-data --console-address ":9001"
# default creds: minioadmin / minioadmin
```

### 5.4 Install Node Dependencies

```bash
# enable pnpm once
corepack enable && corepack prepare pnpm@latest --activate

pnpm install
```

### 5.5 Generate Prisma Client & Migrate

```bash
cd packages/api
npx prisma generate
npx prisma migrate dev        # or migrate deploy in prod
npx prisma db seed            # demo data
cd ../..
```

### 5.6 Run Development Servers

```bash
# root – run both API & Web with hot-reload
pnpm dev
# API → http://localhost:4000
# Web → http://localhost:3000
```

Start individually:

```bash
pnpm dev:api   # backend only
pnpm dev:web   # frontend only
```

### 5.7 Production Build (manual)

```bash
pnpm build               # build all packages
cd packages/api && pnpm start        # API (port 4000)
cd ../../packages/web && npx serve dist -p 3000   # static frontend
```

---

## 6. Default Demo Accounts

| Role          | Email                    | Password  |
|---------------|--------------------------|-----------|
| Super Admin   | admin@clinicwave.com     | admin123  |
| Doctor        | doctor@demo.com          | doctor123 |
| Nurse         | nurse@demo.com           | nurse123  |

---

## 7. Useful Commands

| Command                 | Description                               |
|-------------------------|-------------------------------------------|
| `pnpm dev`              | watch-mode API + Web                      |
| `pnpm build`            | build everything (turbo)                  |
| `pnpm lint`             | run ESLint                                |
| `pnpm test`             | run all tests                             |
| `npx prisma studio`     | GUI for database                          |
| `docker compose logs -f`| live logs from containers                 |

---

## 8. Troubleshooting

| Problem                          | Fix |
|----------------------------------|-----|
| **Port already in use**          | `lsof -i :3000` / `kill -9 PID` or change ports in `.env` |
| **Cannot connect to DB**         | Ensure PostgreSQL is running; verify `DATABASE_URL` |
| **Redis connection refused**     | Start Redis service; verify `REDIS_URL` |
| **Docker build fails on M1/ARM** | Update Docker Desktop, enable experimental emulation |
| **Out-of-memory errors**         | Allocate ≥ 4 GB RAM to Docker, close heavy apps |

---

## 9. Uninstall / Reset

```bash
# Docker path
docker compose down -v --remove-orphans

# Manual path
dropdb clinicwave
redis-cli FLUSHALL
rm -rf packages/api/prisma/migrations
```

---

## 10. Need Help?

* **Docs & Issues:** https://github.com/mosabry99/ClinicWave  
* **E-mail:** support@clinicwave.com

Happy healing with ClinicWave 🏥🌊
