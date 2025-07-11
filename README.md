# ClinicWave – Modern SaaS Medical Clinic Management System

ClinicWave is a multilingual (English + Arabic) **offline-capable** Progressive Web App that streamlines every aspect of running a medical clinic: scheduling, electronic medical records, billing, notifications and much more – all delivered as a secure multi-tenant SaaS platform.

> “One platform to manage patients, appointments, records, payments and analytics – anywhere, on any device.”

---

## ✨ Key Features

* **Multi-Tenant SaaS** – isolated data per clinic, subscription-based licensing, role-based access (RBAC).
* **Progressive Web App** – installable, works offline, background-sync, push notifications.
* **Smart Scheduling** – conflict detection, resource optimisation, automated reminders.
* **Electronic Medical Records** – structured notes, vital-sign trends, attachments, ICD-10 codes.
* **Billing & Payments** – invoices, insurance claims, multi-gateway support (Stripe, PayPal, FawryPay, Polar).
* **Real-Time Notifications** – E-mail, SMS, WebSocket, push; granular user preferences with Do-Not-Disturb.
* **Admin Analytics Dashboard** – live KPIs, financial charts, clinic utilisation.
* **Internationalisation (i18n)** – full RTL/LTR support, dynamic language switcher.
* **Security & Compliance** – HIPAA-grade AES-256 PHI encryption, audit logging, OWASP best practices.

---

## 🏗️ Monorepo Architecture

| Package / Folder          | Description                                                                  |
|---------------------------|------------------------------------------------------------------------------|
| `packages/shared`         | Re-usable TypeScript types, Zod schemas, utilities, i18n resources.          |
| `packages/api`            | NestJS backend (REST + WebSocket) with Prisma ORM, authentication, modules. |
| `packages/web`            | Vite + React + Mantine PWA frontend.                                         |
| `docker-compose.yml`      | Local orchestration of API, Web, Postgres, Redis, MinIO, Nginx.             |
| `.github/workflows`       | CI/CD pipeline – lint, test, build, Docker, deploy to K8s.                  |

Tech stack highlights:

* **TypeScript everywhere**
* **pnpm workspaces** + **TurboRepo** for incremental builds
* **PostgreSQL** + Prisma (row-level multi-tenant security)
* **Redis** for cache, sessions, queues
* **MinIO (S3)** for secure object storage
* **Nginx** reverse proxy with security headers & SPA routing
* **Docker / Kubernetes** ready

Architecture diagram (high-level):

```
[Web PWA] ←→ [Nginx] ←→ [API (NestJS)] ←→ [PostgreSQL]
                                   ↕
                               [Redis]
                                   ↕
                               [MinIO]
```

---

## 🛠️ Development Setup

### Prerequisites

* Node >= 18  
* pnpm `corepack enable && corepack prepare pnpm@latest --activate`  
* Docker + Docker Compose

### 1. Clone & install

```bash
git clone https://github.com/your-org/clinicwave.git
cd clinicwave
pnpm install
```

### 2. Configure environment

Copy the template and adjust values:

```bash
cp .env.example .env
```

### 3. Run everything with Docker (recommended)

```bash
docker compose up --build
# API → http://localhost:4000
# Web → http://localhost:3000
# Mailhog (dev emails) → http://localhost:8025
```

### 4. Turbo powered dev mode (API & Web watched)

```bash
pnpm dev           # turbo run dev --parallel
```

> The first run will generate the Prisma client and apply migrations automatically.

---

## 🔐 Environment Variables Overview

| Variable                    | Purpose                                              |
|-----------------------------|------------------------------------------------------|
| `DATABASE_URL`             | Postgres connection string                           |
| `JWT_SECRET`               | Sign access tokens                                   |
| `ENCRYPTION_KEY / IV`      | AES-256 keys for PHI                                 |
| `S3_*`                     | MinIO / S3 credentials                               |
| `SMTP_*`                   | Mail server configuration                            |
| `STRIPE_API_KEY` etc.      | Payment gateway keys                                 |

See `.env.example` for the full list.

---

## 🏗️ Build & Production Deployment

### Docker images

```
# build images
docker build -f packages/api/Dockerfile   -t clinicwave/api:latest .
docker build -f packages/web/Dockerfile   -t clinicwave/web:latest .
```

Images are built and pushed automatically by GitHub Actions to GHCR.

### Kubernetes quick-start

Example manifests live in `k8s/` (staging & production).

```bash
kubectl apply -f k8s/production/
# update image on new release
kubectl set image deployment/clinicwave-api api=ghcr.io/<user>/clinicwave/api:<tag>
kubectl rollout status deploy/clinicwave-api
```

Database migrations:

```bash
kubectl exec deploy/clinicwave-api -- npx prisma migrate deploy
```

---

## 🤖 Continuous Integration / Delivery

* **Lint** (ESLint + Prettier)  
* **Unit tests** (Vitest / Jest) + coverage published to Codecov  
* **Security scan** (npm-audit + Snyk)  
* **Build** all packages → artefacts  
* **Docker build & push** (multi-arch)  
* **Deploy** to staging (develop) and production (main) via Kubernetes  
* **Slack notifications** on success/failure

Workflow file: `.github/workflows/ci-cd.yml`

---

## 📂 Helpful Scripts

| Command                      | What it does                                   |
|------------------------------|-----------------------------------------------|
| `pnpm dev`                   | Concurrent API & Web dev servers              |
| `pnpm build`                 | Full monorepo build (turbo)                   |
| `pnpm lint`                  | Run ESLint across packages                    |
| `pnpm test`                  | Run unit tests                                |
| `pnpm db:migrate`            | Prisma migration dev                          |
| `pnpm db:seed`               | Seed database with demo data                  |

---

## 🤝 Contributing

1. Fork the repo & create a feature branch  
2. Run `pnpm lint && pnpm test` before committing  
3. Follow the [Conventional Commits](https://www.conventionalcommits.org/) spec  
4. Open a pull request against `develop`

All contributions are welcome – code, docs, translations, ideas!

---

## 📜 License

Distributed under the **MIT License**.  
See [`LICENSE`](LICENSE) for more information.

---

### 👋 Need Help?

Open an issue or reach us at **support@clinicwave.com**.
