# LMS Docker Setup Guide

This project is fully containerized using **Docker** and **Docker Compose**. It sets up:
1. **MySQL 8.0** database container (auto-executes `schema.sql` on first run).
2. **Node.js Express Backend** container with persistent storage for file uploads.
3. **Next.js Frontend** container using optimized multi-stage standalone output.

---

## 🚀 Quick Start

### 1. (Optional) Configure Environment Variables
Copy `.env.example` to `.env` in the root folder if you want to customize ports or credentials:
```bash
cp .env.example .env
```

### 2. Start the Stack
Build and launch all services in detached mode:
```bash
docker compose up -d --build
```

### 3. Check Service Status
```bash
docker compose ps
```

### 4. View Logs
```bash
# View logs from all services
docker compose logs -f

# View logs from a specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

---

## 🌐 Access Points

| Service | URL / Port | Description |
|---|---|---|
| **Frontend** | [http://localhost:9002](http://localhost:9002) | Next.js Application UI |
| **Backend API** | [http://localhost:3001](http://localhost:3001) | Express REST API |
| **Backend Health** | [http://localhost:3001/api/health](http://localhost:3001/api/health) | API Healthcheck |
| **MySQL DB** | `localhost:3306` | MySQL Server |

---

## 🛠️ Database Seeding & Maintenance

### Seed Default Admin User
To create the initial admin user in the MySQL database:
```bash
docker compose exec backend node src/seed-admin.js
```

### Seed Lessons for an App
```bash
docker compose exec backend node src/seed-lessons.js <app_id>
```

### Access MySQL CLI Directly
```bash
docker compose exec -it db mysql -u root -p
# (Default password from .env or '1')
```

---

## 🛑 Stopping & Cleaning Up

- **Stop containers without losing database data:**
  ```bash
  docker compose down
  ```

- **Stop containers and remove volumes (wipes database & uploads):**
  ```bash
  docker compose down -v
  ```

- **Rebuild images after code updates:**
  ```bash
  docker compose up -d --build
  ```
