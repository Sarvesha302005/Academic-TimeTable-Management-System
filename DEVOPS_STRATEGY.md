# DevOps Strategy – Academic Timetable Management System

## Executive Summary

This document presents the DevOps strategy for the Academic Timetable Management System. The strategy focuses on structured version control, a simple branching workflow, and reliable manual deployment practices. Automation through CI/CD is planned as a future enhancement.

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
├── timetable-frontend/      # Frontend application
├── timetable-backend/       # Backend API
│   └── python-scheduler/    # Scheduling logic
└── .github/workflows/       # Reserved for future automation
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

## Deployment Approach (Current)

**Proposed Deployment Workflow:**

- **Frontend** will be deployed to a static hosting platform (e.g., Vercel, Netlify)
- **Backend** will be deployed to a backend hosting platform (e.g., Railway, Render, Heroku)
- **Database** will be hosted on MongoDB Atlas (managed service)
- **Environment variables** will be configured on the chosen hosting platforms
- **Deployments** will be performed manually after local testing and verification

### Deployment Locations

| Component | Proposed Platform | Configuration Method |
|-----------|------------------|---------------------|
| Frontend | Static hosting platform | Manual deployment via platform dashboard/CLI |
| Backend | Backend hosting platform | Manual deployment via platform CLI/dashboard |
| Database | MongoDB Atlas | Managed service configuration |

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
| **Frontend Framework** | React | User interface development |
| **Frontend Build Tool** | Vite | Development server and bundling |
| **Frontend Styling** | TailwindCSS | CSS framework |
| **Backend Runtime** | Node.js | Server-side JavaScript runtime |
| **Backend Framework** | Express | REST API framework |
| **Scheduler Language** | Python | Constraint-based scheduling logic |
| **Database** | MongoDB Atlas | Managed NoSQL database |
| **Frontend Hosting** | Static hosting platform (Vercel/Netlify) | Static site deployment |
| **Backend Hosting** | Backend hosting platform (Railway/Render/Heroku) | API server hosting |

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
- [ ] Manual testing completed
- [ ] Environment variables verified
- [ ] Build succeeds without errors

### Deployment
- [ ] Merge feature branch to `main`
- [ ] Deploy frontend to chosen static hosting platform
- [ ] Deploy backend to chosen backend hosting platform
- [ ] Verify environment variables on platforms

### Post-Deployment
- [ ] Health check endpoints responding
- [ ] Frontend loads correctly
- [ ] API endpoints accessible
- [ ] Database connections stable
- [ ] User flows working as expected

---

## Future Enhancements

The following improvements are planned for future iterations:

### 1. CI/CD Automation

**Planned Implementation:**
- Automated testing and build using GitHub Actions
- Automatic deployment on merge to `main`
- Automated code quality checks (ESLint, Prettier)
- Security vulnerability scanning (npm audit, Snyk)

**Benefits:**
- Faster deployment cycles
- Reduced manual errors
- Consistent build and test processes

---

### 2. Containerization

**Planned Implementation:**
- Docker for consistent development and deployment environments
- Docker Compose for local development setup
- Container registry (Docker Hub/GitHub Container Registry)

**Benefits:**
- Environment consistency across development and production
- Simplified onboarding for new developers
- Easier dependency management

---

### 3. Automated Testing

**Planned Implementation:**
- Unit tests for frontend components (Jest/Vitest)
- Backend API integration tests (Supertest)
- End-to-end testing (Playwright/Cypress)
- Test coverage reporting

**Benefits:**
- Early bug detection
- Regression prevention
- Improved code quality

---

### 4. Enhanced Monitoring

**Planned Implementation:**
- Error tracking (Sentry)
- Performance monitoring
- Application logs aggregation
- Uptime monitoring

**Benefits:**
- Proactive issue detection
- Better debugging capabilities
- Performance insights

---

## Conclusion

The current DevOps strategy emphasizes **simplicity, clarity, and reliability** using structured version control and manual deployment. This approach is well-suited for the current development phase and team size.

Planned enhancements such as CI/CD automation, containerization, and comprehensive testing will improve automation and scalability in future versions of the system, enabling faster development cycles and more robust deployments.

---
