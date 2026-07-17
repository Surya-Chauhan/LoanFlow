# LoanFlow — Loan Management System

A full-stack Loan Management System (LMS) that digitizes the end-to-end loan journey — from borrower eligibility (Business Rule Engine) and application, through role-based sanctioning, disbursement, and collections, to automated closure and audit tracking.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Installation Guide](#3-installation-guide)
4. [Folder Structure](#4-folder-structure)
5. [API Documentation](#5-api-documentation)
6. [Database Design](#6-database-design)
7. [Business Rule Engine & Loan Calculation](#7-business-rule-engine--loan-calculation)
8. [Deployment Guide](#8-deployment-guide)
9. [Future Enhancements](#9-future-enhancements)

---

## 1. Project Overview

LoanFlow streamlines small-ticket personal lending (₹50,000 – ₹5,00,000, 30–365 day tenure) across six distinct user roles. The system enforces a strict, role-gated loan lifecycle:

```
APPLIED → SANCTIONED → DISBURSED → CLOSED
          ↘ REJECTED
```

### Roles

| Role           | Responsibility                                                        |
|----------------|-----------------------------------------------------------------------|
| **Borrower**   | Registers, completes eligibility, uploads salary slip, applies for loan |
| **Sales**      | Tracks registered borrowers (leads) and their application status       |
| **Sanction**   | Reviews applied loans → approves or rejects (with reason)              |
| **Disbursement** | Disburses sanctioned loans to borrowers                             |
| **Collection** | Records repayments via UTR; auto-closes loan when fully paid          |
| **Admin**      | Full oversight: customers, loans, documents, EMI, audit logs, products |

Key features:
- **Business Rule Engine (BRE)** — server-authoritative eligibility check (age, salary, PAN, employment).
- **Automated loan math** — simple-interest calculation at a fixed 12% p.a.
- **Audit trail** — every status change is logged with user, action, and remarks.
- **Notifications** — loan events generate database-backed notifications.
- **Admin dashboards** — overview KPIs, EMI schedules, document repository, loan products.

### Demo Login Credentials

| Role         | Email                    | Password     |
|--------------|--------------------------|--------------|
| Borrower     | borrower@lms.com         | Password@123 |
| Sales        | sales@lms.com            | Password@123 |
| Sanction     | sanction@lms.com         | Password@123 |
| Disbursement | disbursement@lms.com     | Password@123 |
| Collection   | collection@lms.com       | Password@123 |
| Admin        | admin@lms.com            | Password@123 |

> Live demo: https://loan-management-system-seven-ochre.vercel.app/
>
> Click any role button on the login page to auto-fill credentials.

---

## 2. Tech Stack

### Backend (`/server`)
| Technology      | Purpose                                  |
|-----------------|------------------------------------------|
| **Node.js**     | Runtime (≥ 18)                           |
| **Express** 4   | HTTP API framework                       |
| **TypeScript**  | Type-safe server code                    |
| **MongoDB**     | Document database (via **Mongoose** 8)   |
| **JSON Web Token (jsonwebtoken)** | Stateless auth (`JWT_SECRET`)      |
| **bcryptjs**    | Password hashing (cost factor 12)        |
| **express-validator** | Request payload validation          |
| **multer**      | Salary-slip file uploads                 |
| **cors**        | Cross-origin resource sharing            |
| **dotenv**      | Environment configuration                |

Key scripts (`server/package.json`):
```json
"dev":    "ts-node-dev --respawn --transpile-only src/index.ts",
"build":  "tsc",
"start":  "node dist/index.js",
"seed":   "ts-node src/scripts/seed.ts"
```

### Frontend (`/client`)
| Technology      | Purpose                                  |
|-----------------|------------------------------------------|
| **Next.js 14** (App Router) | React framework, SSR/routing     |
| **React 18**    | UI library                               |
| **TypeScript**  | Type-safe client code                    |
| **Tailwind CSS**| Utility-first styling                    |
| **Axios**       | HTTP client                              |
| **js-cookie**   | Token persistence                        |
| **react-hot-toast** | Toast notifications                  |
| **lucide-react** | Icon set                               |
| **clsx**        | Conditional classnames                   |

Key scripts (`client/package.json`):
```json
"dev":  "next dev",
"build": "next build",
"start": "next start",
"lint":  "next lint"
```

---

## 3. Installation Guide

### Prerequisites
- **Node.js** 18 or newer
- **MongoDB** — local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- **npm** (bundled with Node)

### Step 1 — Clone the repository
```bash
git clone https://github.com/Surya-Chauhan/LoanFlow.git
cd LoanFlow
```

### Step 2 — Install dependencies
```bash
# Backend
cd server
npm install

# Frontend (new terminal)
cd ../client
npm install
```

### Step 3 — Environment configuration

**Backend** — create `server/.env` from the example:
```bash
cd server
cp .env.example .env
```
Edit `server/.env`:
```env
# MongoDB connection string (Atlas recommended for production)
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/loanflow

# JWT secret — use a long random string in production
JWT_SECRET=change-me-to-a-long-random-secret

# Port the Express server listens on
PORT=5000

# Frontend URL(s) allowed by CORS (comma-separate multiple origins)
FRONTEND_URL=http://localhost:3000

# Optional: additional comma-separated allowed CORS origins
# ALLOWED_ORIGINS=https://loanflow.vercel.app

# Set to "production" to tighten CORS to allowed origins only
NODE_ENV=development
```

**Frontend** — create `client/.env.local` from the example:
```bash
cd ../client
cp .env.example .env.local
```
Edit `client/.env.local`:
```env
# Full backend API base URL including the /api suffix
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Step 4 — Seed the database (optional)
Creates demo users, loan products, and sample data:
```bash
cd server
npm run seed
```

### Step 5 — Run the application
```bash
# Terminal 1 — Backend (http://localhost:5000)
cd server
npm run dev

# Terminal 2 — Frontend (http://localhost:3000)
cd client
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 4. Folder Structure

```
LoanFlow/
├── server/                      # Express + TypeScript backend (API)
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts       # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT auth + RBAC (authenticate, authorize)
│   │   │   └── errorHandler.ts   # Centralized error & 404 handling
│   │   ├── models/               # Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Loan.ts
│   │   │   ├── LoanProduct.ts
│   │   │   ├── Payment.ts
│   │   │   ├── Document.ts
│   │   │   ├── Notification.ts
│   │   │   └── AuditLog.ts
│   │   ├── routes/               # API route modules
│   │   │   ├── auth.ts
│   │   │   ├── borrower.ts
│   │   │   ├── sales.ts
│   │   │   ├── sanction.ts
│   │   │   ├── disbursement.ts
│   │   │   ├── collection.ts
│   │   │   └── admin.ts
│   │   ├── utils/
│   │   │   ├── bre.ts            # Business Rule Engine
│   │   │   ├── loanCalculator.ts # Simple-interest calc
│   │   │   └── multerConfig.ts   # File upload config
│   │   ├── scripts/
│   │   │   └── seed.ts           # Database seeding
│   │   ├── app.ts                # Express app, CORS, route mounting
│   │   └── index.ts              # Entry point, DB connect, server listen
│   ├── uploads/                  # Uploaded salary slips (served statically)
│   ├── .env.example
│   └── package.json
│
├── client/                      # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx, page.tsx, globals.css
│   │   │   ├── auth/
│   │   │   │   ├── login/         # Login with role auto-fill
│   │   │   │   └── register/      # Borrower self-registration
│   │   │   ├── borrower/          # Borrower portal (multi-step application)
│   │   │   └── dashboard/         # Operations dashboard (RBAC-gated)
│   │   │       ├── page.tsx        # Overview / KPIs
│   │   │       ├── sales/          # Lead tracking
│   │   │       ├── sanction/       # Approve / reject loans
│   │   │       ├── disbursement/   # Disburse funds
│   │   │       ├── collection/     # Record payments
│   │   │       ├── customers/      # Customer directory
│   │   │       ├── loans/          # Unified loan management
│   │   │       ├── documents/      # Salary-slip repository
│   │   │       ├── emi/            # EMI schedules
│   │   │       ├── products/       # Loan product config
│   │   │       ├── reports/        # Reports view
│   │   │       └── audit/          # Audit logs
│   │   ├── components/
│   │   │   ├── ui/                 # RoleGuard and shared UI
│   │   │   └── dashboard/          # DataTable and dashboard widgets
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Auth state, token storage
│   │   ├── lib/
│   │   │   ├── api.ts             # Axios API client
│   │   │   └── bre.ts             # Client-side BRE (UX feedback)
│   │   └── types/
│   │       └── index.ts           # Shared TypeScript types
│   ├── .env.example
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## 5. API Documentation

**Base URL:** `http://localhost:5000/api` (configurable via `NEXT_PUBLIC_API_URL`)

All authenticated routes require an `Authorization: Bearer <token>` header. The token is returned by `/auth/login` and `/auth/register`.

### 5.1 Auth

| Method | Path                | Role        | Description                          |
|--------|---------------------|-------------|--------------------------------------|
| POST   | `/api/auth/register`| Public      | Register borrower (name, email, password) |
| POST   | `/api/auth/login`   | Public      | Authenticate; returns JWT + user     |
| GET    | `/api/auth/me`      | Authenticated | Get current user profile           |

### 5.2 Borrower

| Method | Path                          | Role      | Description                                |
|--------|-------------------------------|-----------|--------------------------------------------|
| POST   | `/api/borrower/personal-details` | Borrower | Submit PAN, DOB, salary, employment; runs BRE |
| POST   | `/api/borrower/upload-salary-slip` | Borrower | Upload salary slip (multipart `salarySlip`) |
| POST   | `/api/borrower/apply-loan` (alias `/apply`) | Borrower | Submit loan application (amount, tenure) |
| GET    | `/api/borrower/my-loan`       | Borrower  | Borrower's latest loan + payments          |
| GET    | `/api/borrower/calculate`     | Borrower  | Preview loan math (query: `amount`, `tenure`) |
| GET    | `/api/borrower/profile`       | Borrower  | Get borrower profile                       |

### 5.3 Sales

| Method | Path             | Role          | Description                |
|--------|------------------|---------------|----------------------------|
| GET    | `/api/sales/leads` | Sales, Admin | Paginated borrower leads + stats |

### 5.4 Sanction

| Method | Path                                | Role            | Description              |
|--------|-------------------------------------|-----------------|--------------------------|
| GET    | `/api/sanction/loans`               | Sanction, Admin | List applied loans       |
| PATCH  | `/api/sanction/loans/:id/approve`   | Sanction, Admin | Approve (sanction) loan  |
| PATCH  | `/api/sanction/loans/:id/reject`    | Sanction, Admin | Reject loan (body: `reason`) |

### 5.5 Disbursement

| Method | Path                                  | Role                 | Description            |
|--------|---------------------------------------|----------------------|------------------------|
| GET    | `/api/disbursement/loans`             | Disbursement, Admin  | List sanctioned loans  |
| PATCH  | `/api/disbursement/loans/:id/disburse`| Disbursement, Admin  | Disburse loan to borrower |

### 5.6 Collection

| Method | Path                                 | Role            | Description                                  |
|--------|--------------------------------------|-----------------|----------------------------------------------|
| GET    | `/api/collection/loans`              | Collection, Admin | List disbursed/closed loans                |
| POST   | `/api/collection/loans/:id/payment`  | Collection, Admin | Record payment (body: `utrNumber`, `amount`, `date`) — auto-closes at full repayment |

### 5.7 Admin

| Method | Path                          | Role  | Description                                      |
|--------|-------------------------------|-------|--------------------------------------------------|
| GET    | `/api/admin/overview`         | Admin | KPI dashboard (counts, total collected, recent)  |
| GET    | `/api/admin/customers`        | Admin | Paginated/searchable customer directory          |
| GET    | `/api/admin/loans`            | Admin | All loans (filter by `status`, `search`)         |
| GET    | `/api/admin/documents`        | Admin | Salary-slip document repository                 |
| GET    | `/api/admin/emi`              | Admin | EMI schedules for active loans                  |
| GET    | `/api/admin/notifications`    | Admin | Recent notifications + unread count             |
| GET    | `/api/admin/audit-logs`       | Admin | Paginated audit trail                           |
| GET    | `/api/admin/loan-products`    | Admin | List loan products                              |
| POST   | `/api/admin/loan-products`    | Admin | Create loan product                             |
| PUT    | `/api/admin/loan-products/:id`| Admin | Update loan product                             |

### 5.8 Standard Response Shape
```json
{ "success": true, "message": "...", "data": { ... } }
```
Errors return `success: false` with an appropriate HTTP status (400, 401, 403, 404, 409, 500).

---

## 6. Database Design

MongoDB collections (Mongoose models). Relationships use `ObjectId` references.

### 6.1 Collections Overview

```
User ───< Loan >───< Payment
 │           │
 │           └──< Document
 │
Notification (loanId, borrowerId)
AuditLog (userId)
LoanProduct
```

### 6.2 `User`
| Field              | Type     | Notes                                          |
|--------------------|----------|------------------------------------------------|
| `name`             | String   | Required                                       |
| `email`            | String   | Unique, lowercase                              |
| `passwordHash`     | String   | bcrypt (cost 12)                               |
| `role`             | Enum     | `admin`, `sales`, `sanction`, `disbursement`, `collection`, `borrower` |
| `pan`              | String   | Uppercase                                      |
| `dob`              | Date     | Date of birth                                  |
| `monthlySalary`    | Number   |                                                |
| `employmentMode`   | Enum     | `salaried`, `self-employed`, `unemployed`      |
| `breStatus`        | Enum     | `pending`, `passed`, `failed`                  |
| `breFailReason`    | String   |                                                |
| `isProfileComplete`| Boolean  |                                                |

### 6.3 `Loan`
| Field            | Type     | Notes                                         |
|------------------|----------|-----------------------------------------------|
| `borrowerId`     | ObjectId | ref `User` (required)                         |
| `amount`         | Number   | ₹50,000 – ₹5,00,000                           |
| `tenure`         | Number   | 30 – 365 days                                 |
| `interestRate`   | Number   | default 12 (% p.a.)                           |
| `simpleInterest` | Number   | computed                                      |
| `totalRepayment` | Number   | `amount + simpleInterest`                     |
| `status`         | Enum     | `applied`, `sanctioned`, `rejected`, `disbursed`, `closed` |
| `rejectionReason`| String   |                                               |
| `sanctionedBy`   | ObjectId | ref `User`                                    |
| `disbursedBy`    | ObjectId | ref `User`                                    |
| `appliedAt` / `sanctionedAt` / `disbursedAt` / `closedAt` | Date | lifecycle timestamps |

### 6.4 `LoanProduct`
| Field           | Type    | Notes                         |
|-----------------|---------|-------------------------------|
| `name`          | String  | Unique                        |
| `minAmount`     | Number  |                               |
| `maxAmount`     | Number  |                               |
| `interestRate`  | Number  |                               |
| `maxTenure`     | Number  |                               |
| `processingFee` | Number  | default 0                     |
| `active`        | Boolean | default true                  |

### 6.5 `Payment`
| Field         | Type     | Notes                                  |
|---------------|----------|----------------------------------------|
| `loanId`      | ObjectId | ref `Loan` (required)                  |
| `borrowerId`  | ObjectId | ref `User` (required)                  |
| `utrNumber`   | String   | Unique, uppercase (payment reference)  |
| `amount`      | Number   | ≥ 1                                    |
| `paymentDate` | Date     |                                        |
| `recordedBy`  | ObjectId | ref `User` (required)                  |

### 6.6 `Document` (Salary Slips)
| Field           | Type    | Notes                                  |
|-----------------|---------|----------------------------------------|
| `borrowerId`    | ObjectId| ref `User` (required)                  |
| `loanId`        | ObjectId| ref `Loan` (optional)                  |
| `fileName`      | String  | Stored filename                        |
| `originalName`  | String  | Uploaded filename                      |
| `filePath`      | String  | Server path                            |
| `fileType`      | String  | MIME type                              |
| `fileSize`      | Number  | Bytes                                  |
| `documentType`  | Enum    | `salary_slip`                          |

### 6.7 `Notification`
| Field        | Type     | Notes                                                  |
|--------------|----------|--------------------------------------------------------|
| `type`       | Enum     | `loan_approved`, `loan_rejected`, `loan_disbursed`, `payment_received` |
| `message`    | String   |                                                        |
| `loanId`     | ObjectId | ref `Loan` (optional)                                  |
| `borrowerId` | ObjectId | ref `User` (optional)                                  |
| `read`       | Boolean  | default false                                          |

### 6.8 `AuditLog`
| Field      | Type     | Notes                                  |
|------------|----------|----------------------------------------|
| `userId`   | ObjectId | ref `User` (required)                  |
| `action`   | String   | e.g. `APPROVE_LOAN`, `RECORD_PAYMENT`  |
| `entity`   | String   | e.g. `Loan`, `Payment`                 |
| `entityId` | ObjectId | optional                               |
| `remarks`  | String   | optional                               |
| `timestamp`| Date     | createdAt alias                        |

---

## 7. Business Rule Engine & Loan Calculation

### Business Rule Engine (`utils/bre.ts`)
Runs **server-side (authoritative)** and **client-side (UX feedback)**. A borrower must pass all rules before applying.

| Rule         | Condition                                         |
|--------------|---------------------------------------------------|
| Age          | Must be **23–50** years                           |
| Salary       | Monthly salary ≥ **₹25,000**                      |
| PAN          | Format `ABCDE1234F` (5 letters, 4 digits, 1 letter) |
| Employment   | Must **not** be `unemployed`                      |

On failure the user's `breStatus` is set to `failed` with a `breFailReason`.

### Loan Calculation (`utils/loanCalculator.ts`)
```
Interest Rate      = 12% p.a. (fixed)
Simple Interest    = (Principal × 12 × TenureDays) / (365 × 100)
Total Repayment    = Principal + Simple Interest
```
Loan amount bounds: **₹50,000 – ₹5,00,000**; tenure bounds: **30 – 365 days**.

---

## 8. Deployment Guide

LoanFlow is monorepo-friendly: deploy the **backend** and **frontend** as two separate services.

### 8.1 Backend — Render (or any Node host)

1. Create a new **Web Service** pointing to the `server/` directory.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Add environment variables (see `server/.env.example`):
   - `MONGODB_URI` — Atlas connection string
   - `JWT_SECRET` — long random string
   - `PORT` — provided by host (e.g. `5000` or Render's `$PORT`)
   - `FRONTEND_URL` — your Vercel frontend URL
   - `NODE_ENV=production`
5. Note the generated backend URL (e.g. `https://loanflow-api.onrender.com`).

> The server auto-creates the `uploads/` directory at startup, and serves files at `/uploads`. For ephemeral filesystems, consider swapping to object storage (see Future Enhancements).

### 8.2 Frontend — Vercel

1. Import the repo and set the **Root Directory** to `client/`.
2. Build command: `npm run build`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://<your-backend>/api`
4. Deploy. Vercel assigns a URL (e.g. `https://loanflow.vercel.app`).

### 8.3 Post-Deployment
- Set `FRONTEND_URL` on the backend to the Vercel URL (and/or `ALLOWED_ORIGINS`).
- Run `npm run seed` once against the production database to populate demo users/products.
- Verify health: `GET https://<backend>/health` → `{ success: true, message: "LMS API running" }`.

---

## 9. Future Enhancements

The current MVP delivers the core loan lifecycle. Planned and candidate extensions:

### 🔁 Loan Renewal / Top-up
- Allow borrowers with a `closed` loan in good standing to apply for a renewal or top-up.
- Track renewal lineage (parent loan → child loan) and adjust eligibility based on repayment history.

### 🪪 eKYC Integration
- Plug in government/KYC providers (e.g. Aadhaar/PAN/VID via DigiLocker or licensed aggregators) to auto-verify identity.
- Replace manual PAN text entry with OCR + official verification, strengthening the BRE.

### 📧 Real-time & Multi-channel Notifications
- Move from DB-backed polling to **WebSocket / Server-Sent Events** for instant in-app alerts.
- Add email/SMS (Twilio, SendGrid) notifications for sanction, disbursement, and due/overdue reminders.

### 💳 Payment Gateway Integration
- Integrate Razorpay / Stripe for online repayments (replacing manual UTR entry) with automated reconciliation.

### 🗂 Persistent File Storage
- Migrate uploads from local `uploads/` to **AWS S3 / Cloudinary** for production durability and CDN delivery.

### 📊 Advanced Reporting & Analytics
- Exportable CSV/PDF reports, cohort and NPA (non-performing asset) analysis, and graphical dashboards.

### 🔐 Hardened Security & Compliance
- Rate limiting & brute-force protection (e.g. `express-rate-limit`), refresh-token rotation, role-permission matrix UI, and encryption-at-rest for sensitive PII.

### 🧪 Testing & CI/CD
- Add unit/integration tests (Jest/Supertest), frontend component tests, and a CI pipeline (GitHub Actions) for lint + build + test on every PR.

### 🌐 Internationalization & Multi-branch
- Multi-currency / locale support and branch/field-agent management for larger lending operations.

---

## License

This project is provided as-is for educational and demonstration purposes.