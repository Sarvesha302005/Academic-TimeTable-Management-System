# Automated Timetable Management System

A full-stack academic timetable generation platform that helps institutions configure schedules, manage faculty workload, and generate conflict-free timetables using a constraint-based scheduling engine.

The system provides role-based dashboards for administrators, faculty, and students, allowing centralized timetable control and real-time visibility through a web interface.

---

## System Overview

This project automates timetable creation by combining:

* Configurable academic data (courses, rooms, slots)
* A constraint-based Python scheduling engine
* Role-based backend APIs
* Web dashboards for each user type

Administrators configure the environment → generate timetable → verify → lock → users view schedules through their dashboards.

No notification service is currently implemented. Updates appear directly in the portal.

---

## Core Capabilities

### Authentication & Access Control

* JWT-based login system
* Role-based route protection
* Separate dashboards for admin, faculty, and students

### Academic Configuration

* Academic calendar setup
* Course creation and section mapping
* Time slot configuration
* Room allocation management
* Faculty workload rule definition

### Timetable Generation

* Constraint-based scheduling engine
* Considers workload, rooms, slots, and course hours
* Timetable verification and locking by admin
* Stored in MongoDB and displayed in dashboards

### Faculty Management

* Faculty timetable view
* Leave application system
* Course preference submission

### Student Access

* Timetable viewing interface

---

## User Roles

### Admin

Responsible for configuring and controlling the scheduling environment.

* Configure academic calendar
* Manage courses and sections
* Define time slots and rooms
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

## Timetable Engine

The system uses a Python-based scheduler that generates timetables based on defined constraints:

* Faculty workload limits
* Room availability
* Time slot structure
* Course hours
* Academic calendar

Flow:
Admin triggers generation → backend calls Python scheduler → timetable stored → dashboards update.

---

## Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT authentication

### Scheduler Engine

* Python
* Constraint-based scheduling logic

### Frontend

* React + Vite
* Axios API integration
* Role-based dashboards

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

Scheduler executes during timetable generation and returns structured timetable data to backend APIs.

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

Run server:

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
source venv/bin/activate
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
* API testing performed locally

---

## Current Status

Completed:

* Backend architecture
* Frontend dashboards
* Timetable generation
* Role-based access
* Leave system (basic)
* UML and schema design

Pending:

* Dynamic leave-based rescheduling
* Advanced workload optimization
* Admin analytics dashboard
* Full API testing
* Deployment
* Notification system

---

## Future Improvements

* Smarter scheduling optimization
* Faculty workload analytics dashboard
* Substitution handling for leave
* Production deployment
* Notification system

---

## License

Academic project for educational use.
