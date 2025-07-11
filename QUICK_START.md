# ClinicWave ‑ Quick Start Guide 🚀

*Get the whole platform running in **minutes** with one command.*

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|------|-----------------|-------|
| **Git** | latest | clone repository |
| **Python 3** | 3.8+ | required by setup script |
| **Node 18+ & pnpm** | *(auto-installed if missing\*)* | development mode |
| **Docker Desktop** | current | *optional* – choose Docker mode |

\* The script attempts to install/enable `pnpm`.  
If you skip Docker mode you must also have **PostgreSQL 13+** and **Redis 6+** running locally.

---

## 2. Clone the Repository

```bash
git clone https://github.com/mosabry99/ClinicWave.git
cd ClinicWave
```

---

## 3. Run the Automated Setup

Choose **one** of the following:

### macOS / Linux

```bash
chmod +x setup.sh
./setup.sh
```

### Windows (PowerShell / CMD)

```powershell
setup.bat
```

### Cross-platform (pure Python)

```bash
python3 setup.py            # add --no-docker to skip Docker
```

The script will:

1. Check / install prerequisites  
2. Ask whether to use **Docker** *(recommended)* or **local** services  
3. Copy `.env.example` → `.env` and let you edit it if desired  
4. Install dependencies (`pnpm install`)  
5. Apply Prisma migrations & seed demo data  
6. Start services (containers **or** dev servers)  
7. Open `http://localhost:3000` in your browser  

All logs are saved to `logs/`.

---

## 4. First Login

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | `admin@clinicwave.com` | `admin123` |

---

## 5. Useful Script Flags

| Flag | Description |
|------|-------------|
| `--no-docker` | Install & run with local PostgreSQL/Redis instead of Docker |
| `--skip-clone` | Assume you already cloned the repo |
| `--skip-prereqs` | Don’t attempt to install missing tools |
| `--env-only` | Only create/update the `.env` file |

Example:

```bash
python3 setup.py --no-docker --skip-prereqs
```

---

## 6. Stopping Services

### Docker mode
```bash
docker compose down
```

### Local dev mode
Press **Ctrl +C** in the terminal that is running `pnpm dev`.

---

Happy healing with **ClinicWave** 🏥🌊
