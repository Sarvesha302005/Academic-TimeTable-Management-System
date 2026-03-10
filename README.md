# Automated Timetable Management System

A full-stack academic timetable generation platform that helps institutions create and manage schedules efficiently while handling faculty workload, leave requests, and timetable locking.

The system provides role-based dashboards for administrators, faculty, and students. Administrators configure academic data and generate timetables using a constraint-based scheduling engine. Faculty and students can view schedules directly through the portal.

---

## System Overview

The platform automates timetable creation using:

* Configurable academic data (courses, rooms, time slots)
* A Python-based scheduling engine
* Role-based backend APIs
* Web dashboards for each user type

**Flow:**
Admin configures data → generates timetable → verifies → locks → users view schedules in dashboards.

No notification system is currently implemented. Updates appear directly in user portals.

---

## Roles & Permissions

### Admin

Responsible for configuring and controlling the scheduling environment.

* Define academic calendar
* Manage courses and sections
* Configure time slots
* Manage rooms
* Set workload rules
* Generate timetable
* Verify and lock timetable
* Approve faculty leave

### Faculty

* View assigned timetable
* Apply for leave
* Submit course preferences

### Student

* View timetable

---

## Timetable Generation Engine

A Python constraint-based scheduler generates timetables based on:

* Faculty workload limits
* Room availability
* Time slot structure
* Course hours
* Academic calendar

**Process:**
Admin triggers generation → backend calls scheduler → timetable stored in MongoDB → dashboards update.

---

## Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication

### Scheduler

* Python
* Constraint-based scheduling logic

### Frontend

* React + Vite
* Axios

---

## System Architecture

```
React Frontend
      ↓
Express API (Node.js)
      ↓
Controllers → Services
      ↓
MongoDB Database
      ↓
Python Scheduler
```

The scheduler runs when the admin generates a timetable and returns structured data to the backend.

---

## Project Structure

```
TIMETABLE
│
├── timetable-backend
│   ├── src
│   │   ├── controllers
│   │   ├── models
│   │   ├── routes
│   │   ├── services
│   │   ├── utils
│   │   └── __tests__
│   ├── app.js
│   └── server.js
│
├── python-scheduler
│   ├── scheduler.py
│   └── requirements.txt
│
└── timetable-frontend
    ├── src/components
    ├── src/pages
    ├── src/context
    ├── src/hooks
    ├── src/services
    ├── App.jsx
    └── main.jsx
```

---

## Local Setup

### 1. Clone Repository

```bash
git clone https://github.com/Sarvesha302005/Academic-TimeTable-Management-System
cd TIMETABLE-FINAL
```

---

## Backend Setup

```bash
cd timetable-backend
npm install
```

Create `.env` file:

```
PORT=5050
MONGO_URI=your_mongodb_uri

JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
```

Run backend:

```bash
node server.js
```

Dev mode:

```bash
npm run dev
```

Backend runs at:

```
http://localhost:5050
```

---

## Python Scheduler Setup

```bash
cd python-scheduler
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\Activate.ps1 # Windows(PowerShell)
venv\Scripts\activate.bat #Windows(CMD)
pip install -r requirements.txt
```

Test scheduler:

```bash
python scheduler.py
```

The backend automatically calls this during timetable generation.

---

## Frontend Setup

```bash
cd timetable-frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```
---

Create `.env` file:

```
VITE_API_URL=http://localhost:5050/api
```

---

## Data Flow

```
Frontend → Backend API → MongoDB
Backend → Python Scheduler → Timetable
Scheduler → Backend → Frontend
```

---

## Testing

* JWT authentication tested
* Role-based route protection verified
* Controller unit tests using Jest
* Local API testing completed

---

## Current Status

**Completed**

* Backend architecture
* Frontend dashboards
* Timetable generation
* Role-based access
* Basic leave system
* Database schema
* UML diagrams

**Pending**

* Dynamic leave-based rescheduling
* Advanced workload optimization
* Faculty workload dashboard
* Full API testing
* Deployment
* Notification system

---

## Future Improvements

* Smarter scheduling optimization
* Substitution handling for leave
* Admin analytics dashboard
* Production deployment
* Notification system

---

## License

Academic project for educational use.

