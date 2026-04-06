# Teacher Administration API

## Overview of the API

This project is a TypeScript/Node.js REST API for a teacher administration domain. It exposes endpoints to:

- check service and database health
- register one or more students to a teacher
- retrieve the students common to one or more teachers
- suspend a student
- retrieve notification recipients based on teacher registrations and `@email` mentions in a notification body

The API is implemented with Express, persists data in MySQL through Prisma, and returns consistent JSON error payloads through centralized middleware.

Find the deployed API application here: https://rahman-govtech-assess-app.victoriousbay-c4edd894.southeastasia.azurecontainerapps.io/

Healthcheck: https://rahman-govtech-assess-app.victoriousbay-c4edd894.southeastasia.azurecontainerapps.io/api/health
Register: https://rahman-govtech-assess-app.victoriousbay-c4edd894.southeastasia.azurecontainerapps.io/api/register
Common Students: https://rahman-govtech-assess-app.victoriousbay-c4edd894.southeastasia.azurecontainerapps.io/api/commonstudents
Suspend: https://rahman-govtech-assess-app.victoriousbay-c4edd894.southeastasia.azurecontainerapps.io/api/suspend
Retrieve for Notification: https://rahman-govtech-assess-app.victoriousbay-c4edd894.southeastasia.azurecontainerapps.io/api/retrievefornotifications

## Overview of the Architecture

The codebase uses a feature-based layered structure.

- `src/app` bootstraps Express, composes routes, and starts the HTTP server
- `src/features` contains feature modules with route, controller, schema, service, and repository responsibilities separated
- `src/middleware` contains request context, schema validation, not-found, and centralized error handling
- `src/database` contains the shared Prisma client
- `src/shared` contains reusable errors, logging helpers, and utilities
- `tests` mirrors the application structure with unit and end-to-end coverage

Request handling flow:

1. The request enters Express through shared middleware.
2. A request ID is resolved from `x-request-id` or generated server-side.
3. Logging, security headers, CORS, and JSON parsing are applied.
4. Route-level Zod schemas validate request bodies and query strings.
5. Controllers delegate business logic to services.
6. Services use repositories and Prisma to read or mutate MySQL data.
7. Errors are translated into consistent HTTP responses by the centralized error handler.

### Libraries and Technologies Used

- TypeScript: strong typing across controllers, services, repositories, and tests
- Node.js 20: current LTS runtime for the API and container image
- Express 5: minimal HTTP framework with a clear middleware pipeline and predictable routing model
- Zod: runtime schema validation with explicit, story-driven error messages
- Prisma: typed database access, transaction support, and migration management for MySQL
- MySQL 8.4: relational store that fits the teacher-student registration model and composite key join table
- Pino and `pino-http`: structured application and request logging with low overhead
- `AsyncLocalStorage`: lightweight request-scoped context so logs can consistently include the resolved request ID
- Helmet: secure default HTTP headers with minimal application code
- CORS: explicit cross-origin support for API consumers during development and integration
- Jest: unit and integration test runner used across the project
- Supertest: HTTP-level test coverage without needing a separately started server process
- Docker and Docker Compose: reproducible local MySQL setup and a containerized runtime path
- `tsx`: fast TypeScript execution in development without a separate compile step
- ESLint and Prettier: code quality and formatting consistency

## Architectural Decisions

The main implementation choices reflected in the codebase are:

- Feature-based layering instead of one large MVC directory. This keeps each feature isolated and makes new stories easier to add without creating a shared-controller/shared-service dumping ground.
- Centralized validation through Zod middleware. This keeps controllers thin and ensures validation responses are consistent.
- Request tracing through `x-request-id` and `AsyncLocalStorage` instead of a larger observability stack. It gives enough correlation for debugging while keeping the service lightweight.
- Prisma plus MySQL instead of handwritten SQL repositories. The domain is relational, the schema is small, and Prisma gives typed queries plus transaction boundaries with less boilerplate.
- Explicit join table for teacher-student registrations. This enforces uniqueness at the database layer and leaves room for future relationship metadata if the domain grows.
- Graceful shutdown on `SIGINT` and `SIGTERM`. The server stops cleanly, closes the HTTP listener, disconnects Prisma, and avoids repeated shutdown work.
- Consistent JSON error payloads from shared middleware. This keeps client behavior predictable across validation, not-found, dependency, and domain errors.

## Folder Structure

```text
.
├── docs/                         # Architecture notes, API contract, stories, plans
├── postman/                      # Postman collection and local environment
├── prisma/                       # Prisma schema and SQL migrations
├── src/
│   ├── app/                      # Express app composition and server startup
│   ├── config/                   # Environment parsing and validation
│   ├── database/                 # Shared Prisma client
│   ├── features/
│   │   ├── health/               # Health endpoint
│   │   └── teacher-student/      # Teacher/student domain endpoints
│   ├── middleware/               # Cross-cutting HTTP middleware
│   ├── shared/                   # Shared errors, logging, utilities
│   └── types/                    # Express type augmentation
├── tests/
│   ├── e2e/                      # HTTP-level tests
│   ├── setup.ts                  # Shared test setup
│   └── unit/                     # Unit tests mirroring src/
├── docker-compose.yml            # Local containers for app + MySQL
├── Dockerfile                    # Multi-stage production image build
└── package.json                  # Scripts and dependencies
```

## How to Run the App

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker or Podman with Compose support

### Local Development

Start with MySQL:

```bash
docker compose up -d mysql
```

Install dependencies:

```bash
pnpm install
```

Create your local environment file if needed:

```bash
cp .env.example .env
```

Apply the Prisma migration so the teacher/student tables exist:

```bash
pnpm prisma migrate deploy
```

Start the API in watch mode:

```bash
pnpm dev
```

Notes:

- The checked-in `.env.example` uses `PORT=80`, but the current local `.env` in this repo uses `PORT=3000`.
- If you want the default developer experience shown below, set `PORT=3000` in `.env`.
- The local MySQL connection string expected by the app is `mysql://app:app@localhost:3306/teacher_admin`.

Quick verification:

```bash
curl http://localhost:3000/api/health
```

Expected response shape:

```json
{
  "status": "ok",
  "database": "up",
  "timestamp": "2026-04-06T12:00:00.000Z"
}
```

## How to Run the Containers and Test the Containers

The compose file exposes the API container on host port `3000` and maps it to container port `80`.

Before starting the full stack, make sure port `3000` is free:

```bash
ss -ltn '( sport = :3000 )'
```

If something is already using `3000`, do one of the following:

- stop the existing process or container using that port
- change the host port mapping in `docker-compose.yml` from `3000:80` to something else such as `3001:80`

Start the full container stack:

```bash
docker compose up -d --build
```

Apply the Prisma migration inside the app container:

```bash
docker compose exec app ./node_modules/.bin/prisma migrate deploy
```

Check that both containers are healthy:

```bash
docker compose ps
```

Test the API container:

```bash
curl http://localhost:3000/api/health
```

You can also test a business endpoint:

```bash
curl -X POST http://localhost:3000/api/register \
  -H 'content-type: application/json' \
  -d '{"teacher":"teacher@example.com","students":["student1@example.com","student2@example.com"]}'
```

Useful container troubleshooting commands:

```bash
docker compose logs app
docker compose logs mysql
docker compose down
```

## API Contracts

Base path: `/api`

All responses include `x-request-id` in the response headers. If the client sends `x-request-id`, the same value is echoed back. Otherwise, the server generates one.

### `GET /api/health`

Checks API responsiveness and verifies database connectivity using a lightweight SQL query.

Response `200`:

```json
{
  "status": "ok",
  "database": "up",
  "timestamp": "2026-04-06T12:00:00.000Z"
}
```

### `POST /api/register`

Registers one teacher with one or more students.

Request body:

```json
{
  "teacher": "teacher@example.com",
  "students": ["student1@example.com", "student2@example.com"]
}
```

Response:

- `204 No Content` on success
- `400 Bad Request` for validation failures

Validation behavior:

- teacher email is required and must be valid
- at least one student is required
- every student value must be a valid email
- duplicate student emails are deduplicated in the service layer before persistence

### `GET /api/commonstudents`

Returns students common to one or more teachers.

Examples:

- `/api/commonstudents?teacher=teacher1@example.com`
- `/api/commonstudents?teacher=teacher1@example.com&teacher=teacher2@example.com`

Response `200`:

```json
{
  "students": ["student1@example.com", "student2@example.com"]
}
```

Behavior notes:

- if no `teacher` query parameter is provided, the API returns `{"students":[]}`
- suspended students are still included in the common-student lookup

### `POST /api/suspend`

Suspends a student.

Request body:

```json
{
  "student": "student@example.com"
}
```

Response:

- `204 No Content` on success
- `404 Not Found` if the student does not exist
- `400 Bad Request` for validation failures

### `POST /api/retrievefornotifications`

Returns recipients for a notification.

Recipients are the union of:

- active students registered to the teacher
- active students mentioned with `@email` in the notification, if those students exist

Request body:

```json
{
  "teacher": "teacher@example.com",
  "notification": "Hello students @student1@example.com @student2@example.com"
}
```

Response `200`:

```json
{
  "recipients": [
    "student1@example.com",
    "student2@example.com",
    "student3@example.com"
  ]
}
```

Behavior notes:

- suspended students are excluded from notification recipients
- mentioned emails are deduplicated
- returned recipients are sorted alphabetically

### Error Payload Shape

Validation and application errors are normalized to JSON.

Example validation error:

```json
{
  "message": "Validation errors",
  "status": 400,
  "errors": {
    "teacher": ["Teacher is missing"]
  }
}
```

Example not-found error:

```json
{
  "message": "Student not found",
  "status": 404
}
```

## Things Not Included

This service is intentionally narrow. The following concerns are not implemented in the current codebase:

- Rate limiting: better enforced at the API gateway or ingress layer, where limits can be applied consistently across services without duplicating middleware in every app.
- API key protection or broader authentication: also better handled at the edge or by a dedicated identity layer. This service currently assumes it sits behind trusted infrastructure.
- Authorization: there is no tenant, role, or permission model yet because the current stories only cover the teacher-student domain operations themselves.
- Distributed tracing: not added yet to keep the service lightweight. The current compromise is request correlation through `x-request-id` and structured logs.
- Telemetry and metrics export: omitted for now to avoid adding operational weight before there is a clearer observability requirement.
- Retries, circuit breaking, and resilience policies: not necessary yet because the only external dependency is the primary database, and the app currently fails fast on dependency issues.
- Pagination, filtering, and sorting controls beyond the current contracts: not needed for the limited result sizes in the implemented stories.
- Background jobs or asynchronous workflows: all current operations are synchronous request/response flows.
- OpenAPI or Swagger generation: the contract is documented in `docs/contract.md` and the Postman collection for now.
- Automated containerized migration-on-start: migrations must currently be run explicitly when bringing up the stack.

## Useful Project Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:coverage
```

## Supporting Docs

- `docs/architecture.md` for architecture notes and decisions
- `docs/contract.md` for the original API contract summary
- `postman/teacher-administration-api.postman_collection.json` for ready-to-run API requests
- `postman/local.postman_environment.json` for the local Postman environment
