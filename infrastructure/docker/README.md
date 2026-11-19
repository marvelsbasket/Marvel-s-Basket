# Marvel's Basket — Docker Infrastructure

This directory contains the containerization and orchestration infrastructure for **Marvel's Basket** local development and service dependencies.

---

## 1. Architecture Overview

Marvel's Basket utilizes containerized local services to guarantee consistency across developer machines:

| Service        | Container Name            | Image                | Host Port | Internal Port | Persistent Volume              |
| -------------- | ------------------------- | -------------------- | --------- | ------------- | ------------------------------ |
| **PostgreSQL** | `marvels_basket_postgres` | `postgres:16-alpine` | `5432`    | `5432`        | `marvels_basket_postgres_data` |
| **Redis**      | `marvels_basket_redis`    | `redis:7-alpine`     | `6379`    | `6379`        | `marvels_basket_redis_data`    |

Both containers communicate over an isolated Docker bridge network: `marvels_basket_network`.

---

## 2. Directory Layout

```text
infrastructure/docker/
├── compose.yaml              # Base multi-service definition (PostgreSQL + Redis)
├── compose.override.yaml     # Local development overrides (host port mappings)
├── compose.production.yaml   # Production reference profile (hardened, internal only)
├── postgres/
│   └── init/
│       └── 01-init.sql       # Automated DB init script (UUID & pgcrypto extensions)
├── redis/
│   └── redis.conf            # Redis configuration (AOF persistence, memory limits)
├── .env.example              # Template environment variables for containers
└── README.md                 # This documentation
```

---

## 3. Centralized Management Interface

**All Docker commands must be run from the repository root.** Developers should never have to `cd` into this directory to manage containers.

The root `package.json` provides standard commands:

```bash
# Start all services in the background (detached mode)
npm run docker:up

# Check container status
npm run docker:ps

# Check container health status (healthcheck probes)
npm run docker:health

# Stream logs for all services
npm run docker:logs

# Stream logs for a specific service
npm run docker:logs:db
npm run docker:logs:redis

# Restart all services
npm run docker:restart

# Validate and inspect active Compose configuration
npm run docker:config

# Stop all containers (NAMED VOLUMES ARE PRESERVED)
npm run docker:down

# Clean up stopped containers and unused networks (VOLUMES PRESERVED)
npm run docker:clean

# DESTRUCTIVE: Stop containers and PERMANENTLY ERASE all database volumes
npm run docker:reset
```

---

## 4. Persistent Data Storage & Volume Protection

Local data persistence is strictly managed through named Docker volumes:

- `marvels_basket_postgres_data`: Stores PostgreSQL database files under `/var/lib/postgresql/data`.
- `marvels_basket_redis_data`: Stores Redis Append-Only File (AOF) and RDB snapshots under `/data`.

### Safe Shutdown Rule

Running `npm run docker:down` or `docker compose down` **stops the containers but preserves all data**. When you run `npm run docker:up` again, all database records, migrations, and keys remain intact.

### Destructive Reset Safeguard

The `docker:reset` command permanently wipes all database volumes (`docker compose down -v`). To prevent accidental data loss:

- In interactive terminals, it requires typing `DELETE` to confirm.
- In CI/CD or scripted environments, it requires explicitly passing `--confirm`.

---

## 5. Health Check Probes

Both services feature automated healthchecks:

- **PostgreSQL**: Probes `pg_isready -U marvel -d marvels_basket_dev` every 10 seconds.
- **Redis**: Probes `redis-cli ping` every 10 seconds.

Run `npm run docker:health` to inspect the live health status of running services.

---

## 6. Troubleshooting

### Port Conflicts

If port `5432` or `6379` is already in use by a locally installed Postgres or Redis service:

1. Update `.env` in the repository root:
   ```env
   POSTGRES_PORT=5433
   REDIS_PORT=6380
   ```
2. Restart containers: `npm run docker:restart`

### Docker Daemon Not Running

If you receive `Docker daemon is not running`:

1. Start Docker Desktop on macOS.
2. Verify with `docker info`.
