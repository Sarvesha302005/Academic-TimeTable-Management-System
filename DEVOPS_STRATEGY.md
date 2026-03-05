# DevOps Strategy – Academic Timetable Management System

## Executive Summary

This document presents the DevOps strategy for the Academic Timetable Management System. The strategy covers structured version control, a simple branching workflow, Docker containerization for consistent environments, and CI/CD automation using GitHub Actions for testing, building, and publishing.

---

## System Overview

The system consists of a frontend application, a backend API, a Python-based scheduling engine, and a managed database. These components communicate through REST APIs to generate and manage academic timetables.

### Architecture Overview

**Layered Architecture:**

| Layer | Component | Technology |
|-------|-----------|------------|
| **Client Layer** | React Frontend | Vite + TailwindCSS |
| **API Layer** | Express Backend | Node.js + JWT Auth |
| **Processing Layer** | Python Scheduler | Constraint-based Engine |
| **Data Layer** | MongoDB Database | Mongoose ODM |

**Component Flow:**
- Frontend → Backend (REST API)
- Backend → Database (Queries/Updates)
- Backend → Scheduler (Invokes scheduling)
- Scheduler → Backend (Returns generated schedule)

**Component Descriptions:**

- **Frontend:** React-based user interface for timetable creation and viewing
- **Backend:** Node.js (Express) API handling application logic
- **Scheduler:** Python constraint-based timetable generation module
- **Database:** MongoDB Atlas for persistent data storage

---

## Repository Structure

**GitHub Repository:**  
`https://github.com/Sarvesha302005/Academic-TimeTable-Management-System`

```
Academic-TimeTable-Management-System/
├── timetable-frontend/          # Frontend application
│   ├── Dockerfile               # Multi-stage build (Vite → Nginx)
│   └── nginx.conf               # SPA routing & caching config
├── timetable-backend/           # Backend API
│   ├── Dockerfile               # Node.js + Python runtime
│   └── python-scheduler/        # Scheduling logic
├── docker-compose.yml           # Full-stack orchestration
├── .env.example                 # Environment variable template
└── .github/workflows/           # CI/CD pipelines
    ├── ci.yml                   # Test, build & Docker validation
    └── cd.yml                   # Build & push images to GHCR
```

### Component Mapping

| Component | Source Code Location | Proposed Deployment | Technology Stack |
|-----------|---------------------|---------------------|------------------|
| **Frontend** | `/timetable-frontend` | Static hosting (e.g., Vercel, Netlify) | React 18, Vite, TailwindCSS, Axios |
| **Backend** | `/timetable-backend` | Backend hosting (e.g., Railway, Render) | Node.js, Express, Mongoose, JWT |
| **Scheduler** | `/timetable-backend/python-scheduler` | Embedded with Backend | Python 3.x |
| **Database** | N/A | MongoDB Atlas | MongoDB (Managed) |

---

## Branching Strategy

### Branch Rules

| Branch | Purpose | Lifecycle |
|--------|---------|-----------|
| `main` | Stable and deployable code | Permanent |
| `feature/*` | New features or changes | Temporary (deleted after merge) |

**Workflow:**

1. The `main` branch contains stable and deployable code
2. Temporary `feature/*` branches are created for new features or changes
3. After development and testing, feature branches are merged into `main`
4. Feature branches are deleted after successful merge

This approach keeps the repository clean and supports controlled development for a small team.

---

## Deployment Approach

### Containerized Deployment (Docker)

All application components are containerized using Docker for consistent deployment:

- **Frontend** — Multi-stage Docker image (Vite build → Nginx serving)
- **Backend** — Docker image with Node.js 20 and Python 3 (for embedded scheduler)
- **Database** — MongoDB Atlas (managed service) or local MongoDB via Docker Compose
- **Orchestration** — Docker Compose for local development and testing
- **Registry** — Docker images published to GitHub Container Registry (GHCR)

### Local Development

```bash
# Start full stack with Atlas DB (default)
docker compose up -d --build

# Start full stack with local MongoDB
docker compose --profile local-db up -d --build
```

| Service | URL | Container |
|---------|-----|-----------|
| Frontend | http://localhost:3000 | `timetable-frontend` (Nginx) |
| Backend API | http://localhost:5050 | `timetable-backend` (Node.js + Python) |
| MongoDB (local) | localhost:27017 | `timetable-mongodb` (optional, via `--profile local-db`) |

### Deployment Locations

| Component | Platform | Configuration Method |
|-----------|----------|---------------------|
| Frontend | Any Docker host / Static hosting | Docker image from GHCR or `npm run build` |
| Backend | Any Docker host / Cloud platform | Docker image from GHCR |
| Database | MongoDB Atlas | Managed service, connection via `MONGODB_URI` |

---

## Testing & Validation (Current)

### Pre-Deployment Checks

**Frontend (`/timetable-frontend`):**
- ✅ Manual UI testing of the frontend
- ✅ Build verification (`npm run build`)
- ✅ Visual inspection of key user flows

**Backend (`/timetable-backend`):**
- ✅ Backend API testing using sample requests
- ✅ Manual endpoint testing
- ✅ Server startup validation

**Python Scheduler (`/timetable-backend/python-scheduler`):**
- ✅ Validation of scheduling logic using predefined constraints
- ✅ Test case execution with sample data

**Post-Deployment:**
- ✅ Post-deployment verification of application functionality
- ✅ Health check of deployed services
- ✅ Database connectivity verification

---

## Tools & Platforms

### Current Technology Stack

| Category | Tool/Platform | Purpose |
|----------|---------------|---------|
| **Version Control** | GitHub | Source code repository |
| **CI/CD** | GitHub Actions | Automated testing, building, and deployment |
| **Containerization** | Docker + Docker Compose | Consistent environments and orchestration |
| **Container Registry** | GitHub Container Registry (GHCR) | Docker image hosting |
| **Frontend Framework** | React | User interface development |
| **Frontend Build Tool** | Vite | Development server and bundling |
| **Frontend Styling** | TailwindCSS | CSS framework |
| **Frontend Serving** | Nginx | Static file serving in production |
| **Backend Runtime** | Node.js | Server-side JavaScript runtime |
| **Backend Framework** | Express | REST API framework |
| **Scheduler Language** | Python + OR-Tools | Constraint-based scheduling logic |
| **Database** | MongoDB Atlas | Managed NoSQL database |
| **Testing** | Jest + mongodb-memory-server | Backend unit and integration tests |

---

## Security & Configuration

### Security Measures

1. **Secrets Management:**
   - Sensitive information managed using environment variables
   - Secrets are not committed to the repository
   - Environment variables configured on hosting platforms

2. **Database Security:**
   - Database access controlled through managed service configurations
   - MongoDB Atlas IP whitelist
   - Encrypted connections (TLS)

3. **Authentication:**
   - JWT tokens for user authentication
   - bcrypt password hashing

4. **API Security:**
   - CORS configuration
   - Input validation using express-validator
   - Rate limiting (planned)

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code changes tested locally
- [ ] `docker compose up -d --build` runs successfully
- [ ] Environment variables verified in `.env`
- [ ] CI pipeline passes (tests + build + Docker validation)

### Deployment
- [ ] Merge feature branch to `main`
- [ ] CD pipeline builds and pushes images to GHCR
- [ ] Pull updated images on production server
- [ ] Verify environment variables on production

### Post-Deployment
- [ ] Health check endpoint responding (`/health`)
- [ ] Frontend loads correctly at production URL
- [ ] API endpoints accessible
- [ ] Database connections stable
- [ ] User flows working as expected

---

## CI/CD Pipeline (Implemented)

### CI – Continuous Integration (`.github/workflows/ci.yml`)

**Triggers:** Push/PR to `main` and `feature/*` branches.

| Job | What It Does |
|-----|-------------|
| **Backend Tests** | Installs dependencies → runs Jest test suite (uses mongodb-memory-server, no external DB needed) |
| **Frontend Build** | Installs dependencies → runs `npm run build` to validate Vite build |
| **Docker Build** | Builds both Docker images to validate Dockerfiles (runs after tests pass) |

### CD – Continuous Deployment (`.github/workflows/cd.yml`)

**Triggers:** Push to `main` only (after PR merge).

| Step | What It Does |
|------|-------------|
| **Login to GHCR** | Authenticates using built-in `GITHUB_TOKEN` |
| **Build & Push Backend** | Builds and pushes `ghcr.io/<owner>/timetable-backend:latest` |
| **Build & Push Frontend** | Builds and pushes `ghcr.io/<owner>/timetable-frontend:latest` |

Each image is tagged with both `latest` and the short commit SHA for version pinning.

---

## Containerization (Implemented)

### Docker Images

| Component | Base Image | Key Details |
|-----------|-----------|-------------|
| **Backend** | `node:20-slim` | Includes Python 3 + OR-Tools for embedded scheduler |
| **Frontend** | `node:20-alpine` → `nginx:alpine` | Multi-stage: Vite builds static assets, Nginx serves them |

### Docker Compose Services

| Service | Port | Notes |
|---------|------|-------|
| `backend` | 5050 | Health check on `/health` endpoint |
| `frontend` | 3000 | Nginx with SPA routing and gzip |
| `mongodb` | 27017 | Optional local DB (activate with `--profile local-db`) |

---

## Future Enhancements

The following improvements are planned for future iterations:

### 1. Enhanced Automated Testing

**Planned Implementation:**
- Unit tests for frontend components (Vitest)
- End-to-end testing (Playwright/Cypress)
- Test coverage reporting in CI

### 2. Enhanced Monitoring

**Planned Implementation:**
- Error tracking (Sentry)
- Performance monitoring
- Application logs aggregation
- Uptime monitoring

### 3. Security Scanning

**Planned Implementation:**
- Automated `npm audit` in CI pipeline
- Docker image vulnerability scanning
- Dependency update automation (Dependabot)

---

## Conclusion

The DevOps strategy combines **structured version control, Docker containerization, and automated CI/CD pipelines** using GitHub Actions. The CI pipeline validates code quality on every push through testing and build verification, while the CD pipeline automatically publishes Docker images to GitHub Container Registry on merge to `main`. Docker Compose enables consistent local development across all team members. Future enhancements will focus on expanded test coverage, monitoring, and security scanning.

---
