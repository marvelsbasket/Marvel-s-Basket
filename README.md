# Marvel's Basket

> **Hyperlocal Multi-Vendor Grocery & Daily Essentials Marketplace**  
> Developed by **Marvel's Techworks**

Marvel's Basket connects neighborhood grocery stores, supermarkets, and local merchants with customers through a fast, reliable, single-store checkout shopping experience.

---

## 1. Project Overview & Architecture

Marvel's Basket is architected as a **Modular Monolith** organized within an **npm Workspaces monorepo**:

- **Customer Storefront (`apps/web`):** Next.js 15 (App Router) with TypeScript and Tailwind CSS, adhering to the approved [Design System](docs/PROJECT_DESIGN_SYSTEM.md).
- **Backend API (`apps/api`):** NestJS modular monolith exposing REST endpoints under `/api/v1`, with Prisma ORM and validation pipes.
- **Shared Package (`packages/shared`):** Pure TypeScript package containing domain enums, business rule constants, and shared interfaces without runtime backend coupling.
- **Docker Infrastructure (`infrastructure/docker`):** Production-grade containerization for PostgreSQL 16 and Redis 7 with automated health probes and named persistent volumes.

For in-depth architectural and business specifications, consult the project documentation:

- [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)
- [Database Schema Specification](docs/DATABASE_SCHEMA.md)
- [Architecture Decision Records (ADRs)](docs/PROJECT_DECISIONS.md)
- [Design System & UI Guidelines](docs/PROJECT_DESIGN_SYSTEM.md)
- [Project Requirements & Business Rules](docs/PROJECT_REQUIREMENTS.md)
- [Implementation Roadmap & Phases](docs/IMPLEMENTATION_PHASES.md)

---

## 2. Technology Stack

| Component                     | Technology              | Version     | Purpose                                                |
| ----------------------------- | ----------------------- | ----------- | ------------------------------------------------------ |
| **Language & Runtime**        | TypeScript / Node.js    | v22 LTS     | Primary language across web, api, and shared packages  |
| **Package Manager**           | npm                     | v10+        | Monorepo workspace dependency management               |
| **Frontend Framework**        | Next.js (App Router)    | v15         | Customer web application and SEO storefront            |
| **Frontend Styling**          | Tailwind CSS            | v3.4        | Utility-first design tokens matching visual guidelines |
| **Backend Framework**         | NestJS                  | v10         | Modular monolith enterprise backend service            |
| **Relational Database**       | PostgreSQL              | 16 (Alpine) | ACID transactions, inventory ledgers, orders           |
| **Object-Relational Mapping** | Prisma ORM              | v5/v6       | Schema migrations and type-safe database queries       |
| **Cache & Queue**             | Redis                   | 7 (Alpine)  | Session store, cart hold reservations, rate limiting   |
| **Containerization**          | Docker & Docker Compose | v29 / v5    | Standardized local development infrastructure          |
| **Code Quality**              | ESLint & Prettier       | Flat Config | Automated linting, style enforcement, and formatting   |
| **CI/CD**                     | GitHub Actions          | v4          | Automated pull request validation and builds           |

---

## 3. Repository Structure

```text
marvels-basket/
│
├── apps/
│   ├── web/                     # Customer-facing Next.js 15 web application
│   │   ├── src/app/             # App Router pages, layout, and global styles
│   │   ├── tailwind.config.ts   # Design system tokens and brand color palette
│   │   └── package.json         # @marvels-basket/web
│   │
│   └── api/                     # NestJS backend API modular monolith
│       ├── src/
│       │   ├── modules/health/  # Foundational health check controller
│       │   ├── app.module.ts    # Root NestJS module with ConfigModule
│       │   └── main.ts          # Global prefix (/api/v1), CORS, validation
│       ├── prisma/              # Prisma schema baseline
│       └── package.json         # @marvels-basket/api
│
├── packages/
│   └── shared/                  # Shared TypeScript constants, enums, and types
│       ├── src/                 # Domain enums (OrderStatus, UserRole, etc.)
│       └── package.json         # @marvels-basket/shared
│
├── infrastructure/
│   └── docker/                  # Centralized container infrastructure
│       ├── compose.yaml         # Base multi-container service definition
│       ├── compose.override.yaml# Local development port bindings (5432, 6379)
│       ├── compose.production.yaml # Production reference configuration
│       ├── postgres/init/       # Automated DB init (UUID & pgcrypto extensions)
│       ├── redis/redis.conf     # Redis AOF persistence and memory policy
│       ├── .env.example         # Container environment variable template
│       └── README.md            # Detailed Docker operations documentation
│
├── scripts/
│   ├── docker/                  # Docker lifecycle orchestration (manage.js)
│   └── development/             # Monorepo maintenance scripts (clean.js)
│
├── docs/                        # Complete project architecture documentation
├── .github/workflows/           # GitHub Actions continuous integration pipeline
├── .env.example                 # Root environment variables template
├── .gitignore                   # Version control exclusion rules
├── .dockerignore                # Container build context exclusion rules
├── .editorconfig                # Universal indentation and charset rules
├── .prettierrc.json             # Code formatting rules
├── eslint.config.mjs            # Flat ESLint configuration
├── tsconfig.base.json           # Shared TypeScript base configuration
├── package.json                 # Monorepo workspaces and centralized scripts
└── README.md                    # Root project documentation
```

---

## 4. Prerequisites

Before setting up the project, ensure the following software is installed on your workstation:

- **Node.js:** `v20.0.0` or higher (recommended: `v22.x LTS`). Check with `node -v`.
- **npm:** `v10.0.0` or higher. Check with `npm -v`.
- **Docker & Docker Compose:** Docker Desktop (macOS/Windows) or Docker Engine + Compose plugin (Linux). Check with `docker -v` and `docker compose version`.
- **Git:** Standard git version control.

---

## 5. Installation & Quickstart

Clone the repository and set up your local environment in three simple commands:

```bash
# 1. Clone the repository
git clone <repository-url>
cd marvels-basket

# 2. Copy the environment template
cp .env.example .env

# 3. Install all dependencies across all workspaces
npm install
```

---

## 6. Docker Infrastructure Management

**All Docker infrastructure operations are centrally managed from the repository root.** You do not need to navigate into `infrastructure/docker` to manage services.

```bash
# Start PostgreSQL (5432) and Redis (6379) in detached mode
npm run docker:up

# Check running container statuses
npm run docker:ps

# Inspect live service healthchecks
npm run docker:health

# Stream logs for all containers
npm run docker:logs

# Stream logs for a specific service
npm run docker:logs:db
npm run docker:logs:redis

# Restart containers
npm run docker:restart

# Inspect resolved Compose configuration
npm run docker:config

# Safely stop containers (ALL DATA PERSISTS in named volumes)
npm run docker:down

# Clean stopped containers and networks (VOLUMES ARE PRESERVED)
npm run docker:clean

# DESTRUCTIVE: Purge containers and completely erase all database volumes
# (Interactive confirmation required; pass --confirm in CI/CD)
npm run docker:reset
```

### Data Persistence Guarantee

Running `npm run docker:down` strictly stops the containers while preserving `marvels_basket_postgres_data` and `marvels_basket_redis_data`. Local records, schemas, and sessions will remain intact when restarting with `npm run docker:up`.

---

## 7. Development Workflows

Run services locally using centralized root npm scripts:

```bash
# Run both frontend (web) and backend (api) concurrently
npm run dev

# Run only the Next.js web application (http://localhost:3000)
npm run dev:web

# Run only the NestJS backend API (http://localhost:4000/api/v1)
npm run dev:api
```

### Default Local Endpoints:

- **Web Storefront:** `http://localhost:3000`
- **Backend API:** `http://localhost:4000/api/v1`
- **API Health Endpoint:** `http://localhost:4000/api/v1/health`
- **PostgreSQL Database:** `localhost:5432` (`marvels_basket_dev`)
- **Redis Cache:** `localhost:6379`

---

## 8. Build, Linting & Verification Commands

Before submitting pull requests or committing code, run the repository verification pipeline:

```bash
# Run full verification suite (formatting, linting, typechecking, and build)
npm run check

# Check and fix code formatting (Prettier)
npm run format:check
npm run format

# Run static code analysis (ESLint flat config)
npm run lint
npm run lint:fix

# Run TypeScript compilation checks across all workspaces
npm run typecheck

# Build all packages and applications in topological order
npm run build

# Build individual workspaces
npm run build:shared
npm run build:api
npm run build:web

# Clean build artifacts (.next, dist, coverage)
npm run clean
```

---

## 9. Database Workflow

Database migrations and schema definitions are managed using **Prisma ORM**:

- Prisma schema file: `apps/api/prisma/schema.prisma`
- Database URL: Configured via `DATABASE_URL` in `.env`

```bash
# Generate Prisma Client after schema changes
npm run --workspace=@marvels-basket/api prisma:generate

# Future Phase 02 Workflow:
# Create a migration from schema changes
# npx --workspace=@marvels-basket/api prisma migrate dev --name <migration_name>
```

---

## 10. Troubleshooting

### Port Conflicts

If port `5432` or `6379` is already occupied by a native PostgreSQL or Redis service:

1. Edit `.env` in the repository root:
   ```env
   POSTGRES_PORT=5433
   REDIS_PORT=6380
   DATABASE_URL="postgresql://marvel:marvel_dev_secure_password_2026@localhost:5433/marvels_basket_dev?schema=public"
   ```
2. Restart Docker containers: `npm run docker:restart`

### Docker Daemon Connectivity

If you see `Docker daemon is not running`:

- Launch Docker Desktop on macOS/Windows or start the `dockerd` service on Linux.
- Verify status with `docker info`.

### Resetting Corrupted Workspace State

If dependencies or build outputs become corrupted:

```bash
# Clean build artifacts
npm run clean

# Re-install dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## 11. Contributing & Governance

All contributions must follow the architectural constraints defined in [PROJECT_DECISIONS.md](docs/PROJECT_DECISIONS.md) and adhere to the [Design System](docs/PROJECT_DESIGN_SYSTEM.md).
Pull requests automatically run the verification suite defined in `.github/workflows/ci.yaml`.
