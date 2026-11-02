# MediCare Appointment Management System

A healthcare appointment platform that connects patients with doctors. It covers doctor and specialization
management, patient registration, hospital/clinic management, appointment scheduling, consultations with
prescriptions, and payment processing, backed by an Oracle database with PL/SQL business logic and reports.

Advanced Database Management Systems – Special Coursework (HDSE, NIBM)

## Tech stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Database | Oracle Database 19c, PL/SQL         |
| Backend  | Java, Spring Boot 3 (REST API)      |
| Frontend | React + Vite                        |

## Project structure

```
medicare-system/
├── docs/          ER diagram and screenshots
├── database/      SQL scripts: schema, sample data, views, PL/SQL packages, triggers, jobs, tests
├── backend/       Spring Boot REST API
└── frontend/      React web application
```

## Database

The ER diagram is in [`docs/er-diagram`](docs/er-diagram).

| Script                  | Contents                                                              |
|-------------------------|-----------------------------------------------------------------------|
| `00_create_user.sql`    | Creates the `MEDICARE` schema user (run as SYS)                       |
| `01_schema.sql`         | Tables, primary/foreign keys, unique and check constraints, indexes   |
| `02_sample_data.sql`    | Sample data: 15 doctors, 25 patients, 110 appointments (Jul–Nov 2026) |
| `03_views.sql`          | Views and the `MV_MONTHLY_REVENUE` materialized view                  |
| `04_medicare_pkg.sql`   | `MEDICARE_PKG` – booking, payment and consultation procedures/functions |
| `05_triggers.sql`       | Validation, status-flow, audit and default-value triggers             |
| `06_reports_pkg.sql`    | `MEDICARE_REPORTS` – 7 business reports                               |
| `07_jobs.sql`           | `DBMS_SCHEDULER` jobs (MV refresh, no-show marking)                   |
| `08_test_plsql.sql`     | Test cases for the PL/SQL and printed reports                         |
| `run_all.sql`           | Runs scripts 01–07 in order                                           |

### Business reports

1. Monthly revenue by hospital
2. Doctor performance (appointments, completion rate, revenue rank)
3. Specialization demand
4. Session occupancy for upcoming sessions
5. Patient medical history
6. Outstanding payments
7. Follow-ups due

## Setup

### 1. Database

```bash
# as SYS, connected to the pluggable database
sqlplus sys@localhost:1521/orclpdb as sysdba @database/00_create_user.sql

# as MEDICARE, from the database folder
cd database
sqlplus medicare@localhost:1521/orclpdb @run_all.sql
sqlplus medicare@localhost:1521/orclpdb @08_test_plsql.sql
```

### 2. Backend

Requires Java 17+ and Maven. Copy `.env.example` to `.env` (project root) and set your database password.

```bash
cd backend
mvn spring-boot:run
```

The API runs on `http://localhost:8080`. Run the unit tests with `mvn test`.

#### Backend structure

```
backend/src/main/java/lk/medicare/
├── controller/   REST endpoints
├── service/      transactions and business flow
├── repository/   JDBC access; procedures and report cursors are called with SimpleJdbcCall / CallableStatement
├── dto/          request and response records with validation rules
├── exception/    maps Oracle errors (ORA-20001 … ORA-20012, constraint errors) to HTTP responses
└── config/       CORS
```

Business rules are enforced in the database (`MEDICARE_PKG` and triggers); the backend calls those
procedures and returns their error messages to the client. The optional `X-User` request header is stored
as the session client identifier, so `APPOINTMENT_AUDIT` records who changed each appointment.

#### API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/specializations` | List / create specializations |
| GET/PUT/DELETE | `/api/specializations/{id}` | Get / update / delete |
| GET/POST | `/api/hospitals` | List (`?city=`) / create hospitals |
| GET/PUT/DELETE | `/api/hospitals/{id}` | Get / update / delete |
| GET/POST | `/api/doctors` | List (`?specializationId=&status=&q=`) / create doctors |
| GET/PUT/DELETE | `/api/doctors/{id}` | Get / update / delete |
| PATCH | `/api/doctors/{id}/status` | Change status (ACTIVE, ON_LEAVE, INACTIVE) |
| GET | `/api/doctors/{id}/schedules` | Weekly sessions of a doctor |
| GET/POST | `/api/schedules` | List (`?doctorId=&hospitalId=&specializationId=&day=`) / create sessions |
| GET/PUT/DELETE | `/api/schedules/{id}` | Get / update / delete |
| GET | `/api/schedules/{id}/sessions?weeks=4` | Upcoming dates with free slots |
| GET/POST | `/api/patients` | List (`?q=` name, NIC or phone) / register (`PR_REGISTER_PATIENT`) |
| GET/PUT/DELETE | `/api/patients/{id}` | Get / update / delete |
| GET | `/api/patients/{id}/appointments` | Appointments of a patient |
| GET | `/api/patients/{id}/history` | Medical history |
| GET/POST | `/api/appointments` | List (`?date=&from=&to=&status=&patientId=&doctorId=&hospitalId=&q=`) / book (`PR_BOOK_APPOINTMENT`) |
| GET | `/api/appointments/{id}` | Appointment details |
| POST | `/api/appointments/{id}/confirm` | Confirm a booking |
| POST | `/api/appointments/{id}/cancel` | Cancel (refunds a paid booking) |
| POST | `/api/appointments/{id}/payment` | Take payment (`{"paymentMethod": "CARD"}`) |
| POST | `/api/appointments/{id}/consultation` | Record consultation and prescription; completes the appointment |
| GET | `/api/appointments/{id}/audit` | Status history |
| POST | `/api/appointments/mark-no-shows` | Mark past unattended appointments as NO_SHOW |
| GET | `/api/consultations` | List (`?patientId=&doctorId=&q=`) |
| GET | `/api/consultations/{id}` | Consultation with prescription items |
| POST | `/api/consultations/{id}/items` | Add a prescription item |
| DELETE | `/api/consultations/{id}/items/{itemId}` | Remove a prescription item |
| GET | `/api/payments` | List (`?status=&method=&from=&to=`) |
| GET | `/api/dashboard` | Summary figures, status breakdown, revenue trend |
| GET | `/api/reports/monthly-revenue?year=` | Report 1 |
| GET | `/api/reports/doctor-performance?from=&to=` | Report 2 |
| GET | `/api/reports/specialization-demand?from=&to=` | Report 3 |
| GET | `/api/reports/session-occupancy?from=&to=` | Report 4 (default: next 7 days) |
| GET | `/api/reports/patient-history/{patientId}` | Report 5 |
| GET | `/api/reports/outstanding-payments` | Report 6 |
| GET | `/api/reports/followups-due?days=14` | Report 7 |

Errors are returned as JSON, for example:

```json
{ "status": 409, "error": "Conflict", "message": "Session is fully booked (10 patients)", "oracleCode": 20006 }
```

### 3. Frontend

Requires Node.js 18+. Start the backend first, then:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server forwards `/api` requests to the backend on port 8080.
For a production build run `npm run build` (output in `frontend/dist`).

#### Screens

| Screen | Features |
|--------|----------|
| Dashboard | Today's figures, revenue trend, appointments by status, today's queue, follow-ups due |
| Appointments | Filter by period, status, doctor or patient; mark past no-shows |
| Book appointment | Pick patient → specialization → doctor → session → date with live free-slot counts |
| Appointment details | Confirm, take payment, cancel (with refund), record consultation and prescription, audit trail |
| Patients | Search, register, edit; patient page with medical history and appointments |
| Consultations | Diagnoses and prescriptions, filter by doctor |
| Payments | Totals by status, filter by status, method and date |
| Doctors / Specializations / Hospitals | Add, edit, delete; change doctor status |
| Doctor Schedules | Weekly sessions, availability for the coming weeks, book from a session |
| Reports | The 7 PL/SQL business reports with parameters, totals and print view |

The "Signed in as" selector in the top bar is sent with each request (`X-User` header) and appears in the
appointment status history.

#### Frontend structure

```
frontend/src/
├── api/          fetch wrappers for each backend resource
├── components/   layout, tables, modals, forms, consultation editor
├── hooks/        useApi data-loading hook
├── pages/        one component per screen
├── utils/        formatting helpers and form field definitions
└── styles/       app.css
```
