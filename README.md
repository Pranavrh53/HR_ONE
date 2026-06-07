# HR_One — TalentSphere AI HRMS

> An end-to-end, AI-powered Human Resource Management System that unifies talent acquisition, employee lifecycle management, payroll, and attendance — all in one platform.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [AI Service Setup](#ai-service-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [User Roles & Portals](#user-roles--portals)
- [AI Features](#ai-features)

---

## Overview

**TalentSphere AI HRMS** is a full-stack Human Resource Management System built for modern organizations. It covers the complete employee journey — from job posting and AI-driven resume screening, through AI voice interviews, offer letters, onboarding, all the way to payroll and leave management. The platform serves three distinct user groups: HR managers, employees, and job candidates — each with their own dedicated portal.

---

## Key Features

### 🤖 AI-Powered Recruitment
- **Resume Screening** — Upload single or bulk PDFs; the AI service extracts text via PyMuPDF, runs a deterministic ATS scoring pipeline, and optionally enriches results with Google Gemini explanations.
- **Candidate Ranking** — Automatic scoring and ranking of all applicants against a job description with skill-match percentages.
- **Candidate Comparison** — Side-by-side AI comparison of shortlisted candidates with a final hiring recommendation.

### 🎙️ AI Voice Interview
- AI-generated, role-specific interview questions (10 questions: intro → technical → system design → behavioural → closing).
- Real-time answer evaluation with technical, communication, clarity, and relevance scores.
- Dynamic follow-up question generation based on candidate responses.
- Full interview transcript and final hire/reject recommendation.

### 👔 Hiring Workflow
- End-to-end pipeline: Job Post → Application → Resume Screen → Shortlist → Interview → Offer → Onboarding.
- Offer letter generation and email delivery via Nodemailer.
- Candidate-to-employee conversion with automatic role and portal switch.

### 📋 HR Dashboard
- Employee directory with full profile management.
- Attendance tracking (check-in / check-out) with monthly summaries.
- Leave request management (apply, approve, reject) with balance tracking.
- Payroll management with salary slip generation.
- Onboarding task tracker for newly converted employees.

### 💬 HR AI Chat Assistant
- Context-aware Gemini-powered chat restricted to HR topics (leave, payroll, policies, recruitment).
- Separate tone/persona for candidates vs. employees vs. HR managers.

### 🔐 Authentication & Role-Based Access
- JWT-based authentication with HTTP-only cookie sessions.
- Three roles: `hr`, `employee`, `candidate` — each locked to their own portal.
- Password reset via email token.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Lucide React |
| **Backend** | Node.js, Express.js, MongoDB + Mongoose, JWT, Nodemailer, Multer, pdf-parse |
| **AI Service** | Python, FastAPI, Google Gemini (`gemini-2.0-flash`), PyMuPDF, Sentence-Transformers |
| **Auth** | bcryptjs, JSON Web Tokens, HTTP-only cookies |
| **Dev Tools** | Nodemon, ESLint, TypeScript |

---

## Project Structure

```
HR_One/
│
├── frontend/                  # Next.js App Router frontend
│   └── src/
│       ├── app/
│       │   ├── dashboard/     # HR portal (employees, hiring, payroll, attendance, onboarding, chat)
│       │   ├── portal/        # Candidate portal (jobs, applications, interviews, offers, profile)
│       │   ├── login/         # Auth pages
│       │   ├── register/
│       │   ├── forgot-password/
│       │   ├── reset-password/
│       │   └── careers/       # Public job listings
│       ├── components/        # Shared UI components
│       ├── context/           # Auth context
│       └── lib/               # Axios instance, utilities
│
├── backend/                   # Express.js REST API
│   ├── config/                # MongoDB connection
│   ├── controllers/           # Business logic
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── careerController.js
│   │   ├── resumeController.js
│   │   ├── interviewController.js
│   │   ├── hiringController.js
│   │   ├── chatController.js
│   │   ├── payrollController.js
│   │   ├── attendanceController.js
│   │   └── leaveController.js
│   ├── models/                # Mongoose schemas
│   │   ├── User.js            # Unified user model (hr / employee / candidate)
│   │   ├── Employee.js
│   │   ├── Job.js
│   │   ├── Resume.js
│   │   ├── InterviewSession.js
│   │   ├── HiringDecision.js
│   │   ├── CandidateRanking.js
│   │   ├── OfferLetter.js
│   │   ├── Onboarding.js
│   │   ├── Payroll.js
│   │   ├── Attendance.js
│   │   └── LeaveRequest.js
│   ├── routes/                # Express route definitions
│   ├── middleware/            # JWT auth middleware
│   ├── utils/                 # Email, hiring workflow, onboarding helpers
│   ├── uploads/               # Uploaded resumes (multer)
│   └── server.js              # App entry point
│
├── ai-service/                # Python FastAPI AI microservice
│   ├── main.py                # API endpoints (screen, compare, chat, interview)
│   ├── screening_pipeline.py  # Deterministic ATS scoring + Gemini integration
│   └── requirements.txt
│
└── _tools/                    # Utility scripts (PDF extraction helpers)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Browser                       │
│              Next.js 16 (Port 3000)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  HR Dashboard│  │Employee Portal│  │Candidate Portal│ │
│  └──────┬───────┘  └──────┬───────┘  └───────┬───────┘  │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │ REST (Axios)      │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│              Express.js Backend (Port 5000)              │
│   Auth · Employees · Jobs · Resumes · Hiring · Payroll   │
│          Attendance · Leave · Chat · Onboarding          │
└─────────────────────┬───────────────────────────────────┘
                      │  HTTP (internal)
          ┌───────────┴──────────┐
          │                      │
          ▼                      ▼
  ┌──────────────┐      ┌─────────────────────┐
  │   MongoDB    │      │  FastAPI AI Service  │
  │  (Mongoose)  │      │    (Port 8000)       │
  └──────────────┘      │  Gemini 2.0 Flash    │
                        │  PyMuPDF · ATS Score │
                        └─────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ and npm
- **Python** 3.10+
- **MongoDB** (local or MongoDB Atlas)
- **Google Gemini API Key** — [Get one here](https://aistudio.google.com/app/apikey)

---

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (see [Environment Variables](#environment-variables)).

```bash
# Development
npm run dev

# Production
npm start
```

The backend runs on **http://localhost:5000**

---

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on **http://localhost:3000**

---

### AI Service Setup

```bash
cd ai-service

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS

pip install -r requirements.txt

# Run the AI service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The AI service runs on **http://localhost:8000**

---

## Environment Variables

### `backend/.env`

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/talentsphere
JWT_SECRET=your_jwt_secret_here

# Nodemailer (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# AI Service URL
AI_SERVICE_URL=http://localhost:8000
```

### `ai-service/.env`

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
PORT=8000
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT cookie) |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password/:token` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Jobs & Careers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jobs` | List all job postings |
| POST | `/api/jobs` | Create job (HR only) |
| GET | `/api/careers` | Public job listings |
| POST | `/api/careers/:jobId/apply` | Apply to a job |
| GET | `/api/careers/my-applications` | Candidate's applications |

### Resume Screening
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/resumes/screen` | Screen a single resume |
| POST | `/api/resumes/screen-bulk` | Bulk-screen multiple resumes |
| GET | `/api/resumes/job/:jobId` | Get all resumes for a job |
| POST | `/api/resumes/compare` | AI candidate comparison |

### Interview
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/interview/generate` | Generate AI interview questions |
| POST | `/api/interview/save` | Save interview session |
| GET | `/api/interview/token/:token` | Get interview by token |

### Hiring
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hiring/decisions` | List all hiring decisions |
| POST | `/api/hiring/decide` | Make hire/reject decision |
| POST | `/api/hiring/send-offer/:id` | Send offer letter email |
| POST | `/api/hiring/convert/:id` | Convert candidate → employee |

### Employees, Attendance, Leave, Payroll
| Prefix | Description |
|---|---|
| `/api/employees` | Employee CRUD and profile management |
| `/api/attendance` | Check-in / check-out, monthly records |
| `/api/leaves` | Leave requests, approvals, balances |
| `/api/payroll` | Salary records and slip generation |

### HR Chat
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/hr-chat/message` | Send message to HR AI assistant |

---

## User Roles & Portals

| Role | Portal | Access |
|---|---|---|
| `hr` | `/dashboard` | Full HR controls — employees, hiring, payroll, attendance, leave, onboarding, chat |
| `employee` | `/dashboard` | Personal attendance, leave requests, payslips, profile |
| `candidate` | `/portal` | Job listings, applications, AI interview, offer status, profile |

Login redirects automatically based on the user's role.

---

## AI Features

### Resume Screening Pipeline

1. **PDF Text Extraction** — PyMuPDF parses submitted resumes into clean text.
2. **Deterministic Skill Match** — Exact and fuzzy matching of required skills against resume text.
3. **ATS Score** — Weighted scoring across: skill match, experience, education, and keyword density.
4. **Gemini Enrichment** — Optional Gemini call generates a human-readable summary, strengths, weaknesses, and tailored interview questions.
5. **Fallback** — If Gemini is rate-limited, the deterministic score is returned immediately with no degradation to core functionality.

### AI Voice Interview

- Questions are dynamically generated based on the job description, required skills, and the candidate's own resume analysis (matched/missing skills).
- Each answer is scored across 4 dimensions: Technical Depth, Communication, Clarity, Relevance.
- A follow-up question is generated from the candidate's last answer for a natural conversation flow.
- Final analysis produces a hire recommendation with detailed strengths and weaknesses.

### HR Chat Assistant (Gemini)

- Role-aware context injection (candidate / employee / HR manager).
- Restricted to HR-domain topics — rejects off-topic questions gracefully.
- Exponential backoff retry on Gemini quota limits.

---

## License

This project was built as a demonstration of a full-stack AI-powered HRMS. All rights reserved.
