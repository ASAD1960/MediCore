# MediCore
### Hospital & Clinic Management System | Healthcare Operations Platform

<p align="center">
  <strong>A unified digital platform for managing healthcare facilities, clinical workflows, patient records, laboratory operations, appointments, and financial administration.</strong>
</p>

<p align="center">
  <img alt="Project Status" src="https://img.shields.io/badge/Project-Active%20Development-0f766e">
  <img alt="Backend" src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933">
  <img alt="Frontend" src="https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-3178C6">
  <img alt="Database" src="https://img.shields.io/badge/Database-PostgreSQL-4169E1">
  <img alt="ORM" src="https://img.shields.io/badge/ORM-Prisma-2D3748">
  <img alt="Architecture" src="https://img.shields.io/badge/Architecture-Modular%20Monolith-64748b">
  <img alt="License" src="https://img.shields.io/badge/License-Not%20Yet%20Specified-lightgrey">
</p>

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Vision and Mission](#2-vision-and-mission)
3. [The Problem MediCore Addresses](#3-the-problem-medicore-addresses)
4. [Product Objectives](#4-product-objectives)
5. [Current Implementation Status](#5-current-implementation-status)
6. [Core Features and Modules](#6-core-features-and-modules)
7. [Healthcare Workflows](#7-healthcare-workflows)
8. [User Roles and Permissions](#8-user-roles-and-permissions)
9. [System Architecture](#9-system-architecture)
10. [Technology Stack](#10-technology-stack)
11. [Database Architecture](#11-database-architecture)
12. [Multi-Tenant Architecture](#12-multi-tenant-architecture)
13. [Security Architecture](#13-security-architecture)
14. [API Documentation Overview](#14-api-documentation-overview)
15. [Project Structure](#15-project-structure)
16. [Prerequisites](#16-prerequisites)
17. [Installation and Setup](#17-installation-and-setup)
18. [Environment Configuration](#18-environment-configuration)
19. [Database Setup](#19-database-setup)
20. [Running the Application](#20-running-the-application)
21. [Testing and Quality Assurance](#21-testing-and-quality-assurance)
22. [Deployment Architecture](#22-deployment-architecture)
23. [Production Readiness](#23-production-readiness)
24. [Business Model and Commercial Strategy](#24-business-model-and-commercial-strategy)
25. [Target Market and Customer Segments](#25-target-market-and-customer-segments)
26. [Future Product Scope](#26-future-product-scope)
27. [Product Roadmap](#27-product-roadmap)
28. [Scalability and Technical Evolution](#28-scalability-and-technical-evolution)
29. [Healthcare Compliance and Data Governance](#29-healthcare-compliance-and-data-governance)
30. [Limitations and Current Boundaries](#30-limitations-and-current-boundaries)
31. [Troubleshooting](#31-troubleshooting)
32. [Development Guidelines](#32-development-guidelines)
33. [Contribution Guidelines](#33-contribution-guidelines)
34. [Intellectual Property and Licensing](#34-intellectual-property-and-licensing)
35. [Project Information](#35-project-information)

---

# 1. Product Overview

**MediCore** is a web-based Hospital and Clinic Management System designed to centralize healthcare administration and clinical operations in one integrated software platform.

The system is intended to help healthcare organizations move away from fragmented manual processes, disconnected spreadsheets, paper-based patient records, and inefficient administrative workflows.

MediCore provides a modular foundation for managing:

- Healthcare organizations and their operational structure.
- Patients and patient registration.
- Doctors and healthcare personnel.
- Appointment scheduling and patient visits.
- Clinical consultations.
- Electronic prescription workflows.
- Laboratory test catalogs and laboratory orders.
- Laboratory sample and result processing.
- Billing and financial transactions.
- Operational dashboards.
- User access control and audit logging.

The application is designed around a multi-tenant architecture, allowing multiple healthcare organizations to operate within a shared software platform while maintaining organization-level data separation.

MediCore follows a modular monolithic architecture, separating business domains into independent backend modules while keeping deployment and development manageable.

### Product classification

| Attribute | Description |
|---|---|
| Product | MediCore |
| Category | Healthcare Management Software |
| Product type | Web-based application |
| Primary users | Hospitals, clinics, healthcare administrators |
| Architecture | Multi-tenant modular monolith |
| Backend | Node.js, Express, TypeScript |
| Frontend | React, TypeScript, Vite |
| Database | PostgreSQL |
| ORM | Prisma |
| API style | REST |
| Deployment model | Self-hosted or managed SaaS in future |
| Current stage | Implemented local application with manual verification |

---

# 2. Vision and Mission

## Vision

To build an accessible, reliable, and scalable healthcare management platform that helps healthcare organizations modernize their operations and deliver more organized patient care.

## Mission

To provide a unified digital environment that simplifies clinical administration, improves information accessibility, strengthens operational accountability, and establishes a foundation for data-driven healthcare management.

## Long-term product direction

MediCore aims to evolve from a clinic and hospital management application into a broader healthcare operations platform.

Potential future capabilities include:

- Electronic Health Records (EHR).
- Hospital Information System (HIS).
- Laboratory Information System (LIS).
- Pharmacy and inventory management.
- Inpatient and admission management.
- Patient self-service portals.
- Healthcare analytics.
- Telemedicine integration.
- Interoperability with external healthcare systems.

These are product expansion opportunities, not claims that all capabilities are currently available.

---

# 3. The Problem MediCore Addresses

Healthcare facilities often operate through disconnected administrative and clinical processes.

Common operational challenges include:

| Problem | Operational impact | MediCore direction |
|---|---|---|
| Paper-based patient registration | Repeated data entry and difficult retrieval | Centralized patient records |
| Manual appointment management | Scheduling conflicts and inefficient coordination | Structured appointment workflows |
| Fragmented clinical information | Limited visibility into patient history | Organized clinical records |
| Manual prescriptions | Documentation and communication difficulties | Digital prescription workflow |
| Disconnected laboratory operations | Difficult tracking of test progress | Laboratory order lifecycle |
| Fragmented billing records | Poor financial visibility | Centralized billing workflows |
| Uncontrolled user access | Unauthorized access risk | Role-based permissions |
| Limited operational oversight | Difficult management decisions | Centralized dashboard and audit records |

MediCore addresses these problems by bringing important operational functions into a single application.

---

# 4. Product Objectives

The primary objectives are:

1. Centralize essential healthcare operations.
2. Provide structured patient and doctor management.
3. Improve appointment scheduling and workflow consistency.
4. Support digital consultations and prescription records.
5. Organize laboratory orders, sample processing, and result verification.
6. Support billing and payment-related operations.
7. Apply organization-level data isolation.
8. Enforce permission-based access to sensitive operations.
9. Maintain an auditable operational environment.
10. Establish a foundation for future SaaS commercialization.

---

# 5. Current Implementation Status

MediCore contains ten implemented backend modules and ten corresponding frontend feature areas.

The following table distinguishes the implemented application from planned product expansion.

| Module | Backend | Frontend | Status |
|---|---|---|---|
| Authentication | Implemented | Implemented | Available |
| Dashboard | Implemented | Implemented | Available |
| Patient Management | Implemented | Implemented | Available |
| Doctor Management | Implemented | Implemented | Available |
| Appointment Management | Implemented | Implemented | Available |
| Consultations | Implemented | Implemented | Available |
| Prescriptions | Implemented | Implemented | Available |
| Laboratory | Implemented | Implemented | Available |
| Billing | Implemented | Implemented | Available |
| Audit Logs | Implemented | Implemented | Available |

### Additional database capabilities

The Prisma schema also includes models for additional domains, including:

- Organizations and branches.
- Departments and employees.
- Queue entries.
- Encounters and medical records.
- Diagnoses and allergies.
- Medicines, batches, and stock movements.
- Admissions, wards, and beds.
- Notifications.
- File attachments.

The existence of database models does not mean that corresponding complete application workflows, APIs, or frontend screens have been implemented.

These areas are part of the existing data foundation and potential future expansion.

### Verification status

The development and local verification process has included:

- Backend TypeScript production build.
- Frontend TypeScript and Vite production build.
- Backend automated workflow tests.
- Authentication and application access checks.
- Manual verification of the implemented application workflows.

The last recorded backend automated test run passed **45 tests across 7 test files**.

The user has also completed manual application checks and reported that the implemented functionality is working correctly in the local environment.

This status does not constitute an independent security audit, clinical validation, or production certification.

---

# 6. Core Features and Modules

## 6.1 Authentication and Access Management

Authentication provides the entry point to the MediCore application.

Implemented security-related functionality includes:

- User authentication.
- Login and logout routes.
- Current authenticated-user retrieval.
- Password hashing using Argon2.
- JWT-based session authentication.
- HTTP-only authentication cookies.
- Authentication middleware.
- API rate limiting.
- Permission-based route protection.

Authentication routes are registered separately from the authenticated organization-specific application routes.

## 6.2 Dashboard

The dashboard provides an operational overview of the healthcare organization.

Its backend includes date-range-aware dashboard functionality.

The dashboard is intended to serve as the central entry point for administrative users and authorized staff.

Potential future dashboard enhancements include:

- Revenue summaries.
- Patient registration trends.
- Appointment statistics.
- Laboratory workload.
- Doctor activity.
- Payment summaries.
- Operational performance indicators.

## 6.3 Patient Management

Patient management provides structured patient registration and retrieval.

Implemented capabilities include:

- Patient creation.
- Patient retrieval.
- Patient updates.
- Patient archiving.
- Search and pagination.
- Duplicate patient detection.
- Organization-scoped patient records.
- Generated patient numbers.

Patient identifiers follow an organization-specific sequence, such as:

`PAT-00001`

Patient information can be used by appointment, consultation, laboratory, prescription, and billing workflows.

## 6.4 Doctor Management

The doctor module supports doctor-related organizational records.

The application also includes doctor scheduling functionality.

The scheduling foundation supports:

- Doctor schedule configuration.
- Schedule validation.
- Organization-level scope.
- Schedule conflict checks.
- Protection against invalid schedule changes where active appointments would be affected.

## 6.5 Appointment Management

Appointment management organizes the scheduling of patient visits.

Implemented backend logic includes:

- Appointment creation.
- Appointment retrieval.
- Appointment status management.
- Cancellation-related permissions.
- Check-in permissions.
- Doctor schedule validation.
- Appointment overlap protection.
- Timezone-aware scheduling.
- Transaction-based conflict handling.

Appointment scheduling uses the organization's configured timezone.

The backend includes validation for local date and time conversion, including invalid local-time cases.

Blocking appointment states include:

- SCHEDULED
- CONFIRMED
- CHECKED_IN
- WAITING
- IN_CONSULTATION

Serializable database transactions are used in the appointment conflict-handling workflow.

## 6.6 Consultation Management

Consultation management provides a structured workflow for clinical visits.

The application includes consultation-related backend and frontend modules.

The database supports related clinical concepts such as:

- Encounters.
- Consultations.
- Diagnoses.
- Allergies.
- Medical records.

The actual workflow and data entry capabilities should be understood from the implemented consultation screens and API, rather than assuming every possible EHR capability is already available.

## 6.7 Prescription Management

The prescription module supports digital prescription workflows.

The database includes:

- Prescriptions.
- Prescription items.
- Medicines.
- Medicine batches.
- Stock movements.

The implemented prescription application module provides the current prescription workflow.

Advanced pharmacy inventory operations, dispensing, stock replenishment, supplier management, and purchase orders are future expansion areas unless separately implemented.

## 6.8 Laboratory Management

Laboratory management is one of the core implemented modules.

It supports a structured laboratory workflow involving test catalogs, orders, samples, results, and verification.

### Laboratory test catalog

- View laboratory tests.
- Search tests.
- Create test definitions.
- Update test definitions.
- Maintain test codes.
- Maintain test prices.
- Maintain reference ranges.
- Manage record status.

### Laboratory orders

- Create laboratory orders for patients.
- Select one or more laboratory tests.
- Retrieve laboratory orders.
- View order details.
- Track order status.

### Sample and processing workflow

The supported lifecycle is:

`REQUESTED → SAMPLE_COLLECTED → PROCESSING → RESULT_ENTERED → VERIFIED`

The schema also defines `CANCELLED` as a laboratory order status.

The current laboratory API does not expose an order cancellation endpoint.

### Result management

- Enter a result for an order item.
- Record result values.
- Record optional units.
- Associate results with entering users.
- Verify laboratory results.
- Record verification identity and timestamp.
- Prevent a user from verifying their own entered result.
- Mark the overall order verified after all its results are verified.

### Laboratory permissions

- `lab.tests.view`
- `lab.tests.manage`
- `lab.orders.view`
- `lab.orders.create`
- `lab.samples.collect`
- `lab.orders.process`
- `lab.results.enter`
- `lab.results.verify`

## 6.9 Billing Management

Billing provides a dedicated application module and backend service layer.

The database includes:

- Invoices.
- Invoice items.
- Payments.
- Refunds.

The permission system includes separate billing permissions for viewing, creating, and refund-related operations.

The billing module is intended to centralize financial records associated with healthcare operations.

Advanced accounting, tax reporting, insurance claims, and financial integrations remain potential expansion areas.

## 6.10 Audit Logs

Audit logging provides an important accountability foundation.

The application includes:

- An audit-log backend module.
- An audit-log frontend screen.
- A dedicated audit viewing permission.
- Audit log database records.

The current implementation records selected operational activities, including authentication and important patient-related operations.

A complete production audit program should additionally verify coverage of every sensitive action, retention requirements, access policies, and tamper-resistance controls.

---

# 7. Healthcare Workflows

## 7.1 Patient Registration Workflow

1. An authorized staff member logs into MediCore.
2. The staff member opens patient management.
3. Patient information is entered.
4. The backend validates the request.
5. Duplicate detection is performed.
6. The patient is created within the active organization.
7. A patient number is generated.
8. The patient becomes available to authorized operational workflows.

## 7.2 Appointment Workflow

1. An authorized user selects a patient.
2. A doctor and appointment time are selected.
3. The backend checks doctor schedule availability.
4. The organization timezone is applied.
5. Appointment conflicts are checked.
6. A valid appointment is created.
7. The appointment progresses through its permitted status transitions.

## 7.3 Consultation Workflow

1. The patient arrives for the scheduled visit.
2. Authorized staff manage the visit workflow.
3. A consultation is created.
4. Clinical information is recorded through the consultation module.
5. The consultation follows its supported status transitions.
6. Related prescription workflows can be used by authorized users.

## 7.4 Prescription Workflow

1. An authorized user accesses the prescription module.
2. A prescription is associated with the relevant patient and consultation.
3. Prescription information and items are recorded.
4. The prescription is managed according to the supported workflow.

## 7.5 Laboratory Workflow

1. An authorized user creates a laboratory order.
2. The patient and requested tests are selected.
3. The order enters `REQUESTED`.
4. A laboratory technician collects the sample.
5. The order progresses to `SAMPLE_COLLECTED`.
6. Processing begins.
7. The order progresses to `PROCESSING`.
8. Results are entered for individual order items.
9. Once all results are entered, the order progresses to `RESULT_ENTERED`.
10. Results are verified by an authorized user other than the user who entered them.
11. Once every result has been verified, the order reaches `VERIFIED`.

## 7.6 Billing Workflow

1. An authorized user accesses billing.
2. Billing records are created through the supported billing workflow.
3. Invoice and payment records are maintained.
4. Refund-related operations are permission-controlled.

The exact financial workflow should be evaluated against the implemented billing service and its automated tests.

---

# 8. User Roles and Permissions

MediCore uses permission-based access control.

The current default role definitions include the following roles:

| Role | Intended responsibility |
|---|---|
| Organization Administrator | Overall organization administration |
| Receptionist | Patient registration and appointment coordination |
| Doctor | Clinical consultations and prescriptions |
| Laboratory Technician | Laboratory sample and result operations |
| Accountant | Billing and financial operations |

### Organization Administrator

The default administrator role receives all defined permissions.

### Receptionist

The receptionist role is designed for front-desk activities, including:

- Patient viewing and registration.
- Patient updates.
- Doctor viewing.
- Appointment operations.
- Laboratory test and order viewing.
- Laboratory order creation.

### Doctor

The doctor role includes permissions for:

- Patient viewing.
- Doctor viewing.
- Appointment viewing.
- Consultation operations.
- Prescription operations.
- Laboratory test and order viewing.
- Laboratory order creation.

### Laboratory Technician

The laboratory technician role includes:

- Laboratory test viewing.
- Laboratory order viewing.
- Sample collection.
- Processing.
- Result entry.
- Result verification.

### Accountant

The accountant role includes:

- Patient viewing.
- Billing viewing.
- Billing creation.
- Refund-related permissions.
- Report viewing permission.

### Permission catalogue

The current permission definitions cover:

- `patients.view`
- `patients.create`
- `patients.update`
- `patients.archive`
- `doctors.view`
- `doctors.manage`
- `appointments.view`
- `appointments.create`
- `appointments.cancel`
- `appointments.check_in`
- `consultations.view`
- `consultations.create`
- `consultations.finalize`
- `prescriptions.view`
- `prescriptions.create`
- `billing.view`
- `billing.create`
- `billing.refund`
- `lab.tests.view`
- `lab.tests.manage`
- `lab.orders.view`
- `lab.orders.create`
- `lab.samples.collect`
- `lab.orders.process`
- `lab.results.enter`
- `lab.results.verify`
- `reports.view`
- `users.manage`
- `audit.view`

The presence of a permission does not automatically imply that a complete corresponding application module exists.

---

# 9. System Architecture

MediCore uses a modular monolithic architecture.

The backend is divided into business modules, while the frontend is organized around application features.

This architecture provides clear domain boundaries without introducing unnecessary microservice complexity.

## High-level architecture

```mermaid
flowchart TB
    U[Healthcare Users] --> UI[React Web Application]

    UI --> API[REST API - Express]

    API --> AUTH[Authentication Middleware]
    AUTH --> TENANT[Tenant Context]
    TENANT --> RBAC[Authorization and Permissions]

    RBAC --> MODULES[Business Modules]

    MODULES --> PAT[Patients]
    MODULES --> DOC[Doctors]
    MODULES --> APP[Appointments]
    MODULES --> CON[Consultations]
    MODULES --> PRE[Prescriptions]
    MODULES --> LAB[Laboratory]
    MODULES --> BILL[Billing]
    MODULES --> DASH[Dashboard]
    MODULES --> AUD[Audit Logs]

    PAT --> ORM[Prisma ORM]
    DOC --> ORM
    APP --> ORM
    CON --> ORM
    PRE --> ORM
    LAB --> ORM
    BILL --> ORM
    DASH --> ORM
    AUD --> ORM

    ORM --> DB[(PostgreSQL)]
```

## Architectural principles

### Separation of concerns

The frontend, backend, database, authentication, and authorization responsibilities are separated.

### Domain-oriented modules

Each backend module owns its relevant routes, business logic, and validation rules where applicable.

### Centralized middleware

Shared middleware handles:

- Authentication.
- Tenant context.
- Authorization.
- Validation.
- Error handling.
- Rate limiting.

### Database-backed persistence

Prisma provides typed access to PostgreSQL.

### Versioned API

The REST API is mounted under:

`/api/v1`

### Health monitoring

The backend exposes:

- `/health` — application liveness check.
- `/ready` — database readiness check.

---

# 10. Technology Stack

## Backend

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express 4 | HTTP application framework |
| TypeScript | Static typing |
| Prisma 5 | ORM and database access |
| PostgreSQL | Relational database |
| Argon2 | Password hashing |
| JSON Web Token | Authentication token mechanism |
| Helmet | HTTP security headers |
| CORS | Cross-origin request configuration |
| Cookie Parser | Cookie handling |
| Express Rate Limit | Request rate limiting |
| Zod | Input validation |
| Pino | Structured logging |
| Vitest | Automated testing |
| Supertest | HTTP endpoint testing |
| tsx | TypeScript development execution |

## Frontend

| Technology | Purpose |
|---|---|
| React 18 | User interface |
| TypeScript | Type-safe application code |
| Vite 6 | Development server and build tooling |
| React Router | Application navigation |
| TanStack Query | Server-state management |
| Zustand | Client-state management |
| Axios | HTTP communication |
| React Hook Form | Form management |
| Zod | Validation |
| Tailwind CSS | Utility-first styling |

## Infrastructure

| Component | Technology |
|---|---|
| Database | PostgreSQL |
| Database schema | Prisma |
| API architecture | REST |
| Source control | Git |
| Package management | npm |

---

# 11. Database Architecture

MediCore uses PostgreSQL as its primary relational database.

Prisma provides schema management, migrations, and typed database access.

The database schema is designed to support multiple healthcare organizations and a broad set of healthcare operations.

## Main database domains

### Organization and access management

- Organization
- Branch
- User
- Role
- Permission
- RolePermission
- UserRole

### Human resources and departments

- Department
- Employee
- Doctor
- DoctorSchedule

### Patient and clinical records

- Patient
- Encounter
- Consultation
- Diagnosis
- Allergy
- MedicalRecord

### Appointments and patient flow

- Appointment
- QueueEntry

### Prescription and pharmacy data foundation

- Prescription
- PrescriptionItem
- Medicine
- MedicineBatch
- StockMovement

### Laboratory

- LabTest
- LabOrder
- LabOrderItem
- LabResult

### Hospital infrastructure

- Ward
- Bed
- Admission

### Financial management

- Invoice
- InvoiceItem
- Payment
- Refund

### Platform operations

- Notification
- AuditLog
- FileAttachment

## Database design principles

- Relational data modeling.
- Organization-specific data ownership.
- Foreign-key relationships.
- Unique constraints.
- Indexed query fields.
- Explicit workflow status enums.
- Transactional handling of critical operations.
- Migration-based schema evolution.

### Database migrations

The repository currently includes:

- Initial schema migration.
- Organization timezone migration.

Migrations are stored in:

`medicore-backend/prisma/migrations`

The Prisma schema is located at:

`medicore-backend/prisma/schema.prisma`

---

# 12. Multi-Tenant Architecture

A major architectural feature of MediCore is its multi-tenant design.

The application is structured so that multiple healthcare organizations can use the same application infrastructure while maintaining separate organizational data.

## Tenant resolution

The authenticated user session establishes the user's organization context.

The backend applies the following general request flow:

```text
Incoming Request
      |
      v
Authentication
      |
      v
Tenant Context Resolution
      |
      v
Permission Authorization
      |
      v
Input Validation
      |
      v
Business Logic
      |
      v
Organization-Scoped Database Operations
      |
      v
Response
```

## Tenant isolation principles

- Organization context is derived from the authenticated session.
- Clients should not be trusted to select arbitrary organization IDs.
- Tenant-specific database operations must be scoped to the active organization.
- User permissions are evaluated before protected operations.
- Critical data access must preserve organization boundaries.

## Commercial significance

This architecture provides a foundation for offering MediCore as a SaaS platform.

Instead of deploying a completely separate application for every clinic, a managed deployment could host multiple organizations with controlled tenant separation.

Production SaaS deployment should additionally include systematic tenant-isolation testing and an independent security review.

---

# 13. Security Architecture

Healthcare applications process sensitive personal and clinical information.

Security must therefore be considered a core system requirement.

## Implemented security foundations

### Authentication

- JWT-based authentication.
- HTTP-only cookie-based session transport.
- Argon2 password hashing.
- Authentication middleware.
- Login and logout routes.

### Authorization

- Permission-based route protection.
- Role definitions.
- User-role relationships.
- Role-permission relationships.
- Organization-level access context.

### API protection

- Helmet security headers.
- Configurable CORS.
- Express rate limiting.
- JSON request size limit.
- Request validation.
- Centralized error handling.

### Data protection foundations

- Organization-scoped data access.
- Database relationships and constraints.
- Transaction-based critical workflows.
- Audit log records.

## Additional production security work

The following items should be completed or independently verified before handling real patient information:

- Full CSRF protection for cookie-authenticated operations.
- Secure cookie configuration for production HTTPS.
- Strong secret management and key rotation.
- Password reset and account recovery.
- Session revocation and expiry policy.
- Comprehensive audit coverage.
- PostgreSQL backup and restore testing.
- Encryption-at-rest strategy.
- File upload security.
- Dependency and vulnerability scanning.
- Security testing of tenant boundaries.
- Centralized monitoring and incident response.

Security foundations do not by themselves establish compliance with a healthcare regulation or certification.

---

# 14. API Documentation Overview

MediCore exposes a versioned REST API.

**Base path:**

`/api/v1`

## API resource groups

| Resource | Base path | Purpose |
|---|---|---|
| Authentication | `/auth` | Login, logout, current user |
| Dashboard | `/dashboard` | Operational dashboard |
| Patients | `/patients` | Patient records |
| Doctors | `/doctors` | Doctor records and schedules |
| Appointments | `/appointments` | Appointment workflows |
| Consultations | `/consultations` | Clinical consultations |
| Prescriptions | `/prescriptions` | Prescription workflows |
| Billing | `/billing` | Financial workflows |
| Laboratory | `/laboratory` | Tests, orders, samples, results |
| Audit Logs | `/audit-logs` | Audit record access |

The API routes are registered in:

`medicore-backend/src/routes/index.ts`

## API middleware sequence

Authenticated application routes follow the shared middleware sequence:

1. Authenticate the request.
2. Resolve tenant context.
3. Authorize the required permission.
4. Validate request data.
5. Execute the module operation.
6. Return a structured response.

## Laboratory API reference

The laboratory API currently includes the following operations:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/laboratory/tests` | List/search tests |
| POST | `/laboratory/tests` | Create a test |
| PATCH | `/laboratory/tests/:id` | Update a test |
| GET | `/laboratory/orders` | List orders |
| GET | `/laboratory/orders/:id` | Retrieve order details |
| POST | `/laboratory/orders` | Create an order |
| POST | `/laboratory/orders/:id/collect-sample` | Collect sample |
| POST | `/laboratory/orders/:id/start-processing` | Start processing |
| POST | `/laboratory/orders/:id/items/:itemId/result` | Enter result |
| POST | `/laboratory/results/:resultId/verify` | Verify result |

## Health endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Application liveness |
| GET | `/ready` | Database readiness |

## Example health response

```json
{
  "status": "ok"
}
```

## Example readiness response

```json
{
  "status": "ready",
  "database": "connected"
}
```

The full request and response contracts are maintained in the respective module route, validation, and service files.

---

# 15. Project Structure

The repository is organized as a monorepo containing the backend and frontend applications.

```text
Medicore/
│
├── README.md
│
├── medicore-backend/
│   │
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   └── environment.ts
│   │   │
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   ├── authorize.ts
│   │   │   ├── error-handler.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── tenant-context.ts
│   │   │   └── validate.ts
│   │   │
│   │   ├── modules/
│   │   │   ├── appointments/
│   │   │   ├── audit-logs/
│   │   │   ├── auth/
│   │   │   ├── billing/
│   │   │   ├── consultations/
│   │   │   ├── dashboard/
│   │   │   ├── doctors/
│   │   │   ├── laboratory/
│   │   │   ├── patients/
│   │   │   └── prescriptions/
│   │   │
│   │   ├── routes/
│   │   ├── shared/
│   │   │   ├── constants/
│   │   │   ├── errors/
│   │   │   └── utils/
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── medicore-frontend/
    │
    ├── src/
    │   ├── app/
    │   │   ├── App.tsx
    │   │   └── router.tsx
    │   │
    │   ├── components/
    │   │   └── layout/
    │   │
    │   ├── features/
    │   │   ├── appointments/
    │   │   ├── audit-logs/
    │   │   ├── auth/
    │   │   ├── billing/
    │   │   ├── consultations/
    │   │   ├── dashboard/
    │   │   ├── doctors/
    │   │   ├── laboratory/
    │   │   ├── patients/
    │   │   └── prescriptions/
    │   │
    │   ├── lib/
    │   ├── stores/
    │   ├── main.tsx
    │   └── styles.css
    │
    ├── .env.example
    ├── package.json
    └── vite.config.ts
```

---

# 16. Prerequisites

The following software is required for local development:

| Requirement | Purpose |
|---|---|
| Node.js | Backend and frontend runtime |
| npm | Dependency management |
| PostgreSQL | Relational database |
| Git | Version control |
| VS Code or another IDE | Development environment |

A modern Node.js LTS release compatible with the dependencies is recommended.

PostgreSQL must be installed and running before the backend can connect to the database.

---

# 17. Installation and Setup

## Step 1: Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd Medicore
```

Replace the repository placeholder with the actual Git repository URL.

## Step 2: Install backend dependencies

```bash
cd medicore-backend
npm install
```

## Step 3: Configure backend environment

Copy the example environment file:

```bash
copy .env.example .env
```

Open `.env` and configure the required values.

Do not commit real environment files or credentials.

## Step 4: Configure PostgreSQL

Create a PostgreSQL database:

```sql
CREATE DATABASE medicore_db;
```

Configure the backend database connection string in `.env`.

## Step 5: Generate Prisma Client

```bash
npm run prisma:generate
```

## Step 6: Apply database migrations

For local development:

```bash
npm run prisma:migrate
```

This invokes the repository's Prisma development migration script.

## Step 7: Seed development data

```bash
npm run seed
```

The development seed creates a demo organization and administrator account.

## Step 8: Install frontend dependencies

Open another terminal:

```bash
cd medicore-frontend
npm install
```

## Step 9: Configure frontend environment

```bash
copy .env.example .env
```

Set the frontend API URL to the local backend API.

---

# 18. Environment Configuration

## Backend environment

File:

`medicore-backend/.env`

Example structure:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/medicore_db?schema=public"

JWT_SECRET="REPLACE_WITH_A_LONG_RANDOM_SECRET"
JWT_EXPIRES_IN="1d"

CORS_ORIGIN="http://localhost:5173"

PORT=4000
NODE_ENV="development"
```

These are example development settings. Use secure, environment-specific values in actual deployments.

| Variable | Purpose |
|---|---|
| DATABASE_URL | PostgreSQL connection |
| JWT_SECRET | JWT signing secret |
| JWT_EXPIRES_IN | Token expiration configuration |
| CORS_ORIGIN | Allowed frontend origin |
| PORT | Backend listening port |
| NODE_ENV | Runtime environment |

## Frontend environment

File:

`medicore-frontend/.env`

```env
VITE_API_URL=http://localhost:4000/api/v1
```

The frontend API URL must point to the backend API base path.

### Environment security

- Never commit `.env` files.
- Never expose JWT secrets in frontend variables.
- Do not use production database credentials in local development.
- Use separate credentials for development, staging, and production.
- Rotate secrets if they are accidentally exposed.

---

# 19. Database Setup

MediCore uses Prisma migrations for database schema management.

## Generate Prisma Client

```bash
npm run prisma:generate
```

## Create/apply a development migration

```bash
npm run prisma:migrate
```

## Apply existing migrations in production

```bash
npx prisma migrate deploy
```

Production migrations should be applied through a controlled release process after backup and staging verification.

## Seed development data

```bash
npm run seed
```

The seed script creates a development demonstration environment.

### Development seed credentials

The current development seed uses:

```text
Email:    admin@demo.clinic
Password: Admin@12345
```

**Important:** These are development-only credentials. Change the password and remove or replace predictable demo credentials before any production deployment.

Do not use demo seed data as real patient data.

---

# 20. Running the Application

MediCore consists of two separately executed applications.

## Start backend

From the backend directory:

```bash
cd medicore-backend
npm run dev
```

The default local backend address is:

`http://localhost:4000`

Health checks:

- http://localhost:4000/health
- http://localhost:4000/ready

## Start frontend

From a second terminal:

```bash
cd medicore-frontend
npm run dev
```

The default Vite development address is:

`http://localhost:5173`

Open the frontend URL in a browser.

## Build backend

```bash
cd medicore-backend
npm run build
```

## Build frontend

```bash
cd medicore-frontend
npm run build
```

## Run backend tests

```bash
cd medicore-backend
npm test
```

---

# 21. Testing and Quality Assurance

Testing is an important part of MediCore's development process.

The backend uses Vitest and Supertest for automated verification.

## Verified backend test areas

The recorded test suite includes:

| Test area | Coverage focus |
|---|---|
| Appointment overlap | Conflicting appointments |
| Appointment timezone | Local time and scheduling rules |
| Billing workflow | Financial workflow rules |
| Consultation workflow | Consultation transitions |
| Dashboard range | Date-range calculations |
| Laboratory workflow | Laboratory lifecycle and result verification |
| Prescription workflow | Prescription workflow rules |

### Last recorded backend test result

| Metric | Result |
|---|---:|
| Test files | 7 |
| Tests passed | 45 |
| Tests failed | 0 |

These figures refer to the last recorded test execution, not a guarantee that every future code revision has the same result.

## Build verification

The project has successfully completed:

- Backend TypeScript production build.
- Frontend TypeScript compilation.
- Vite production build.
- Manual local application verification.

## Recommended additional quality assurance

Before a commercial release, expand testing to include:

- Authentication failure cases.
- Permission boundary tests.
- Cross-tenant access attempts.
- Patient data validation.
- Appointment concurrency tests.
- Laboratory result integrity.
- Billing transaction integrity.
- API security testing.
- Frontend end-to-end testing.
- Backup and restoration testing.
- Load and performance testing.

---

# 22. Deployment Architecture

MediCore is structured to support deployment as a web application.

A possible deployment architecture is:

```mermaid
flowchart TB
    CLIENT[Browser / Healthcare Staff]

    CLIENT --> HTTPS[HTTPS / Reverse Proxy]

    HTTPS --> FRONTEND[React Frontend]
    HTTPS --> API[Node.js API]

    API --> DB[(Managed PostgreSQL)]

    API --> LOGS[Centralized Logs]
    API --> MONITOR[Monitoring]

    DB --> BACKUP[Encrypted Backups]
```

## Suggested deployment components

| Layer | Potential deployment |
|---|---|
| Frontend | Static hosting or managed frontend platform |
| Backend | Node.js application hosting |
| Database | Managed PostgreSQL |
| Domain | Custom healthcare organization domain |
| HTTPS | Managed TLS certificate |
| Monitoring | Application and infrastructure monitoring |
| Backups | Automated database backup service |
| File storage | Private object storage when implemented |

## Deployment environments

A mature deployment process should separate:

1. Local development.
2. Testing.
3. Staging.
4. Production.

## Production deployment considerations

- Configure production environment variables.
- Configure secure cookies and HTTPS.
- Restrict CORS to approved domains.
- Use a managed PostgreSQL service or hardened database host.
- Apply migrations through a release process.
- Configure database backups.
- Implement backup restoration procedures.
- Configure structured logs and monitoring.
- Disable development seed credentials.
- Review user permissions.
- Perform security testing before onboarding real organizations.

---

# 23. Production Readiness

The local application being functional is an important milestone, but commercial healthcare deployment requires additional preparation.

| Area | Required action |
|---|---|
| Authentication | Verify session expiry and revocation |
| CSRF | Implement and test complete protection |
| Cookies | Enforce secure production cookie settings |
| Tenant isolation | Perform cross-organization security tests |
| Database | Configure automated backups |
| Recovery | Test database restoration |
| Encryption | Review data encryption at rest and in transit |
| Audit | Verify sensitive action coverage |
| File handling | Implement private, secure attachment handling |
| Monitoring | Configure error and availability monitoring |
| Deployment | Establish staging and production environments |
| Compliance | Obtain appropriate legal and regulatory review |
| Clinical safety | Validate workflows with qualified healthcare professionals |

MediCore should be treated as a development-stage healthcare software product until these requirements have been appropriately addressed.

---

# 24. Business Model and Commercial Strategy

MediCore has the potential to evolve into a commercial healthcare SaaS product.

The proposed business model is based on providing healthcare organizations with access to a centralized management platform through recurring subscriptions.

This section describes a proposed business strategy, not existing revenue, customers, or validated market demand.

## 24.1 Proposed business model

**Software as a Service (SaaS)**

Healthcare organizations subscribe to MediCore and receive access to the platform according to their selected service plan.

Potential subscription dimensions include:

- Number of branches.
- Number of staff accounts.
- Number of doctors.
- Available application modules.
- Storage allocation.
- Support level.
- Reporting capabilities.

## 24.2 Target customer segments

### Small clinics

Independent clinics that need:

- Patient registration.
- Doctor schedules.
- Appointment management.
- Consultation records.
- Prescriptions.
- Basic billing.

### Multi-doctor clinics

Clinics with several doctors and administrative employees that need:

- Shared patient records.
- Staff access management.
- Scheduling coordination.
- Laboratory workflows.
- Financial visibility.

### Diagnostic laboratories

Laboratories that need:

- Test catalog management.
- Order tracking.
- Sample collection workflows.
- Result entry.
- Result verification.

### Medium-sized hospitals

Hospitals that need a broader system for:

- Multiple departments.
- Doctors and staff.
- Patient administration.
- Laboratory operations.
- Billing.
- Future inpatient management.

### Healthcare groups

Organizations operating multiple branches that could benefit from centralized administration and organization-level data separation.

## 24.3 Proposed subscription plans

The following prices are illustrative planning assumptions in Pakistani rupees. They are not current market quotations or validated willingness-to-pay figures.

| Plan | Illustrative monthly price | Intended customer |
|---|---:|---|
| Starter | PKR 4,999 | Small independent clinic |
| Professional | PKR 9,999 | Multi-doctor clinic |
| Business | PKR 19,999 | Larger clinic or diagnostic facility |
| Enterprise | Custom quotation | Hospital groups and multi-branch organizations |

Actual prices should be determined after customer interviews, cost modeling, competitor research, and pilot deployments.

## 24.4 Proposed plan differentiation

| Capability | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Patient management | Yes | Yes | Yes | Yes |
| Doctor management | Yes | Yes | Yes | Yes |
| Appointments | Yes | Yes | Yes | Yes |
| Consultations | Yes | Yes | Yes | Yes |
| Prescriptions | Yes | Yes | Yes | Yes |
| Laboratory | Optional | Yes | Yes | Yes |
| Billing | Basic | Yes | Yes | Yes |
| Audit capabilities | Basic | Yes | Yes | Advanced |
| Multiple branches | No | Limited | Yes | Yes |
| Advanced reporting | No | Optional | Yes | Yes |
| Dedicated support | No | Optional | Optional | Yes |
| Custom integrations | No | No | Optional | Yes |

This is a proposed commercial packaging model. The current application does not automatically enforce these subscription limits.

## 24.5 Revenue streams

Potential sources of revenue include:

### Recurring subscriptions

Monthly or annual software access fees.

### Organization onboarding

One-time setup, configuration, and onboarding services.

### Data migration

Paid migration from spreadsheets or legacy healthcare systems.

### Premium support

Priority technical support and service agreements.

### Customization

Organization-specific workflows, forms, and integrations.

### Additional branches

Subscription upgrades for organizations operating multiple facilities.

### Integrations

Paid integration services for external laboratory, accounting, payment, or healthcare systems.

## 24.6 Customer acquisition strategy

A practical initial strategy would be:

1. Identify independent clinics and small diagnostic facilities.
2. Interview administrators and healthcare professionals.
3. Understand their current administrative challenges.
4. Demonstrate MediCore using synthetic demonstration data.
5. Offer a limited pilot to selected organizations.
6. Collect feedback on usability and operational value.
7. Improve onboarding and workflow reliability.
8. Convert successful pilots into paid subscriptions.
9. Expand through referrals and partnerships.

## 24.7 Competitive positioning

MediCore could position itself around:

- A unified healthcare operations environment.
- Modular feature expansion.
- Organization-level data isolation.
- Structured clinical and administrative workflows.
- A browser-based user experience.
- A potentially affordable subscription model for smaller facilities.

Its actual competitive position must be established through market research and customer validation.

## 24.8 Key business performance indicators

Future commercial operations should monitor:

| KPI | Why it matters |
|---|---|
| Monthly Recurring Revenue | Recurring subscription income |
| Annual Recurring Revenue | Long-term revenue scale |
| Customer Acquisition Cost | Cost of acquiring an organization |
| Customer Lifetime Value | Long-term customer value |
| Monthly Churn | Customer retention |
| Trial-to-Paid Conversion | Sales effectiveness |
| Active Organizations | Product adoption |
| Support Resolution Time | Service quality |
| Gross Margin | Commercial sustainability |
| Infrastructure Cost per Tenant | SaaS efficiency |

---

# 25. Target Market and Customer Segments

## Initial market opportunity

A practical starting market is small and medium-sized healthcare facilities that need digital operational tools but may not require a large enterprise hospital information system.

Potential geographic expansion:

### Phase 1: Pakistan

- Independent clinics.
- Multi-doctor practices.
- Diagnostic laboratories.
- Small healthcare centers.

### Phase 2: Regional markets

Potential markets could include other South Asian and nearby regional countries, subject to local regulatory, language, infrastructure, and market requirements.

### Phase 3: International expansion

Expansion into other markets would require localization, applicable privacy and healthcare compliance work, and integration with local healthcare ecosystems.

## Important market considerations

Healthcare software adoption requires more than technical capability.

Successful commercialization depends on:

- Trust.
- Data protection.
- Reliability.
- Staff training.
- Local workflows.
- Customer support.
- Regulatory requirements.
- Integration with existing operations.
- Sustainable pricing.

---

# 26. Future Product Scope

The following capabilities represent the longer-term product vision.

They should not be confused with the currently implemented modules.

## 26.1 Hospital Admissions Management

Potential functionality:

- Inpatient registration.
- Admission records.
- Admission and discharge workflows.
- Bed assignment.
- Ward management.
- Patient transfer.
- Discharge summaries.

The current database schema contains admission, ward, and bed models.

## 26.2 Queue Management

Potential functionality:

- Patient check-in queues.
- Token generation.
- Doctor-specific queues.
- Waiting-time visibility.
- Queue prioritization.
- Queue display screens.

A queue entry model already exists in the database schema.

## 26.3 Advanced Electronic Health Records

Potential functionality:

- Longitudinal patient records.
- Clinical history.
- Diagnosis coding.
- Allergy management.
- Vital signs.
- Clinical notes.
- Attachments.
- Clinical document generation.

The database includes related clinical models, but a complete advanced EHR is a future product milestone.

## 26.4 Pharmacy and Inventory Management

Potential functionality:

- Medicine catalog.
- Stock management.
- Batch tracking.
- Expiry monitoring.
- Purchase orders.
- Supplier management.
- Dispensing.
- Stock movement history.
- Low-stock alerts.

The database already includes medicine, medicine batch, and stock movement models.

## 26.5 Advanced Laboratory Information System

Potential functionality:

- Expanded test catalog.
- Laboratory departments.
- Equipment management.
- Sample labeling.
- Barcode support.
- Quality control.
- Reference range configuration.
- Printable reports.
- External laboratory integrations.

## 26.6 Advanced Billing and Financial Management

Potential functionality:

- Payment gateway integration.
- Insurance workflows.
- Tax configuration.
- Financial statements.
- Revenue analytics.
- Automated receipts.
- Financial exports.
- Accounting integrations.

## 26.7 Patient Portal

Potential functionality:

- Patient registration and authentication.
- Appointment booking.
- Appointment history.
- Prescription access.
- Laboratory result access.
- Billing statements.
- Notifications.
- Profile management.

## 26.8 Doctor Portal

Potential functionality:

- Personal doctor dashboard.
- Schedule management.
- Patient visit history.
- Consultation records.
- Prescription history.
- Laboratory result access.

## 26.9 Notification System

Potential functionality:

- Appointment reminders.
- Appointment confirmations.
- Laboratory status notifications.
- Payment reminders.
- Internal staff notifications.
- Email and SMS integration.

The database already contains a notification model, but the complete notification delivery infrastructure remains future work.

## 26.10 Reporting and Analytics

Potential functionality:

- Daily patient statistics.
- Appointment utilization.
- Revenue trends.
- Laboratory workload.
- Doctor productivity.
- Department-level performance.
- Financial summaries.
- Exportable reports.

## 26.11 Telemedicine

Potential functionality:

- Online consultations.
- Video conferencing integration.
- Remote patient follow-up.
- Digital appointment booking.
- Remote prescription workflows.

## 26.12 AI-Assisted Healthcare Operations

Potential future applications include:

- Administrative document extraction.
- Appointment demand forecasting.
- Operational workload prediction.
- Medical record search assistance.
- Duplicate record detection improvements.
- Non-diagnostic clinical documentation assistance.

Any AI feature involving clinical decisions must undergo appropriate clinical validation, human oversight, privacy assessment, and regulatory review.

MediCore should not present unvalidated AI outputs as medical diagnoses or treatment recommendations.

---

# 27. Product Roadmap

A suggested development roadmap is:

| Phase | Focus | Expected outcome |
|---|---|---|
| Phase 1 | Core management platform | Existing core workflows |
| Phase 2 | Production security and reliability | Secure deployment foundation |
| Phase 3 | Queue and inpatient management | Broader hospital workflows |
| Phase 4 | Pharmacy and inventory | Medication operations |
| Phase 5 | Advanced EHR and reporting | Richer clinical information |
| Phase 6 | Patient and doctor portals | External user access |
| Phase 7 | Notifications and integrations | Connected healthcare operations |
| Phase 8 | SaaS subscriptions | Commercial platform |
| Phase 9 | Advanced analytics and AI | Data-assisted operations |
| Phase 10 | International expansion | Localized product editions |

Roadmap phases are strategic proposals, not committed release dates.

---

# 28. Scalability and Technical Evolution

The current modular monolithic architecture is a deliberate starting point.

It provides domain separation while avoiding the operational overhead of distributed services.

## Current scalability foundations

- Modular backend domains.
- PostgreSQL relational database.
- Prisma data access.
- Indexed relational data.
- Organization-level data scoping.
- Paginated data retrieval in relevant workflows.
- Transaction-based critical operations.
- Independent frontend and backend builds.

## Future technical improvements

### Performance

- Query optimization.
- Database connection pooling.
- Caching.
- Background jobs.
- Pagination standardization.
- Performance monitoring.

### Infrastructure

- Containerization with Docker.
- CI/CD pipelines.
- Managed PostgreSQL.
- Automated backups.
- Centralized observability.
- Horizontal application scaling.

### Storage

- Private object storage.
- Secure file access.
- Document retention.
- Backup and recovery policies.

### Integration architecture

- External API integrations.
- Webhooks.
- Interoperability standards such as HL7 and FHIR, where appropriate.
- Payment providers.
- SMS and email providers.

### Service decomposition

If scale and operational requirements justify it, individual domains could eventually be extracted into separate services.

This should be driven by real scaling and team needs rather than introducing microservices prematurely.

---

# 29. Healthcare Compliance and Data Governance

Healthcare information is sensitive and requires appropriate technical, organizational, and legal safeguards.

MediCore is a software development project. Its current implementation should not be interpreted as certified or compliant with a specific healthcare regulation.

Before commercial deployment, the operating organization must determine the legal and regulatory requirements applicable to its jurisdiction.

Potential areas of review include:

- Pakistan's applicable data protection and healthcare requirements.
- Patient consent and data access.
- Data retention.
- Medical record integrity.
- Data residency.
- Breach notification.
- User accountability.
- Audit trail retention.
- Third-party processor agreements.
- Secure data disposal.

For international markets, requirements may include:

- GDPR, where applicable.
- HIPAA, where applicable to covered entities and business associates.
- Local health information regulations.
- Local medical software requirements.

## Data governance principles

The long-term platform should adopt:

1. Minimum necessary access.
2. Role-based access control.
3. Clear organizational data ownership.
4. Data retention policies.
5. Documented access and correction procedures.
6. Encryption in transit and at rest.
7. Regular backup testing.
8. Incident response procedures.
9. Security assessments.
10. Responsible handling of patient information.

---

# 30. Limitations and Current Boundaries

The following boundaries should be considered when evaluating the current version.

- MediCore is currently a locally implemented and manually verified application, not an established commercial SaaS service.
- A complete hospital inpatient workflow is not yet implemented.
- Pharmacy inventory operations are not yet a complete application module.
- Patient and doctor self-service portals are future capabilities.
- Advanced analytics and reporting require further development.
- External payment, SMS, and email integrations are not established as completed integrations.
- AI-assisted clinical features are future possibilities, not current medical capabilities.
- Production security hardening and compliance assessments remain necessary.
- Subscription billing and SaaS plan enforcement have not been implemented.
- The current laboratory API does not expose a cancellation endpoint.
- A permission definition or database model alone does not mean that a complete user-facing workflow exists.

These boundaries are important for accurate technical evaluation and responsible product positioning.

---

# 31. Troubleshooting

## Backend cannot connect to PostgreSQL

Check:

- PostgreSQL service is running.
- Database `medicore_db` exists.
- Database credentials are correct.
- `DATABASE_URL` is configured correctly.
- PostgreSQL is listening on the expected port.

## Prisma client errors

Run:

```bash
npm run prisma:generate
```

Then rebuild the backend.

## Migration errors

Check:

- Database connection.
- Migration history.
- PostgreSQL permissions.
- Schema compatibility.

Do not delete migration history as a routine troubleshooting step.

## Frontend cannot reach backend

Check:

- Backend is running.
- `VITE_API_URL` points to the correct API base URL.
- CORS origin matches the frontend URL.
- The browser console and backend logs for request errors.

## Login problems

Check:

- The development seed has been executed.
- The correct development account is being used.
- The backend is connected to the expected database.
- Browser cookies are enabled.
- Frontend and backend origins match the configured CORS and cookie settings.

## Port conflicts

If ports 4000 or 5173 are already in use, identify the process and adjust the development configuration appropriately.

---

# 32. Development Guidelines

MediCore follows a modular domain-oriented structure.

When extending the backend:

1. Identify the relevant business domain.
2. Inspect the existing schema and service conventions.
3. Create or update the appropriate module.
4. Add input validation.
5. Apply authorization to protected routes.
6. Preserve tenant isolation.
7. Use database transactions for critical multi-step operations.
8. Add automated tests.
9. Run the backend build.
10. Verify the integration with the frontend.

## Important implementation rules

### Tenant isolation

Every organization-owned data query must be scoped to the active organization.

### Authorization

Do not rely only on frontend visibility controls. Protected operations must be authorized on the backend.

### Validation

Validate incoming data before executing business logic.

### Database integrity

Use appropriate constraints, relationships, and transactions.

### Workflow consistency

Use explicit status transitions rather than arbitrary status updates.

### Error handling

Return consistent API errors and avoid exposing secrets or sensitive internal details.

### Timezone handling

Use the organization's configured timezone for organization-specific scheduling behavior.

---

# 33. Contribution Guidelines

Contributions should preserve the architecture and security principles of the project.

A contribution should ideally include:

- A clear description of the problem.
- A focused implementation.
- Appropriate validation.
- Relevant tests.
- Updated documentation.
- No committed secrets.
- No unnecessary changes to unrelated modules.

## Suggested contribution workflow

1. Fork or branch the repository.
2. Create a focused feature branch.
3. Implement the change.
4. Run backend tests where relevant.
5. Run backend and frontend production builds.
6. Review security and tenant-isolation implications.
7. Submit a pull request with a clear description.

---

# 34. Intellectual Property and Licensing

No open-source license is currently declared in the repository.

Until a formal license is added, users should not assume that the source code is available for unrestricted redistribution, modification, or commercial use.

Before public distribution or commercial licensing, the project owner should define:

- Copyright ownership.
- Software license.
- Third-party dependency obligations.
- Commercial usage terms.
- Trademark and product branding.
- Data ownership and customer agreements.

Third-party libraries remain subject to their respective licenses.

---

# 35. Project Information

| Attribute | Information |
|---|---|
| Project name | MediCore |
| Product category | Hospital and Clinic Management |
| Repository structure | Backend and frontend monorepo |
| Backend language | TypeScript |
| Frontend language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| API | REST |
| Architecture | Modular monolith |
| Development status | Core modules implemented |
| Commercial status | Proposed future SaaS product |

## Project mission

MediCore is being developed with the objective of making healthcare operations more organized, accessible, and digitally manageable through a unified software platform.

The project brings together software engineering principles, healthcare workflow modeling, database architecture, access control, and practical application development.

Its long-term ambition is to become a scalable healthcare management product capable of supporting clinics, diagnostic facilities, and larger healthcare organizations.

---

<p align="center">
  <strong>MediCore</strong>
  <br>
  <em>One Platform. Connected Healthcare Operations.</em>
</p>

<p align="center">
  Built with a focus on modular architecture, operational reliability, data integrity, and responsible healthcare technology.
</p>