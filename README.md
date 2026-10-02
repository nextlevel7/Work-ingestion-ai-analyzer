# AI Work Intake System

The stack is **NestJS, PostgreSQL, Prisma, and React**, with TypeScript on both sides. It runs with a mock AI provider by default, so it runs without API key.

## Setup

### Run with Docker

The easiest way to run it is with Docker Compose. You’ll need Docker installed and ports `8000`, `3000`, and `5432` available.

```sh
git clone https://github.com/nextlevel7/Work-ingestion-ai-analyzer.git
cd Work-ingestion-ai-analyzer
cp .env.example .env
docker compose up --build
```

Once the services are ready:

- **Application:** http://localhost:8000
- **API base:** http://localhost:3000/api
- **Swagger UI:** http://localhost:3000/api/docs
- **OpenAPI JSON:** http://localhost:3000/api/docs-json
- **Database health check:** http://localhost:3000/api/health

This starts PostgreSQL 16, the backend, and the frontend. Prisma client generation and database migrations are handled automatically. Nginx serves the frontend and forwards `/api` requests to the backend.

To try the flow, ingest an item, select it, click **Analyse item**, and review the result before completing it. The mock returns a fixed category and priority with a shortened version of your description as the summary.

```sh
# Stop the application; database data remains in the named volume.
docker compose down
```

### Run locally 

 Use **Node.js 24** and npm. From the repository root, start just the database:

```sh
cp .env.example .env
docker compose up -d postgres
```

In a backend terminal:

```sh
cd backend-api
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run start:dev
```


In another terminal, starting from the repository root:

```sh
cd frontend
npm ci
npm run dev
```


### Optional: use OpenAI

For local development, update `backend-api/.env` and restart the API:

```dotenv
AI_PROVIDER=openai
OPENAI_API_KEY=replace-with-your-own-key
OPENAI_MODEL=gpt-5-mini
OPENAI_TIMEOUT_MS=15000
```

The default model is `gpt-5-mini`, with a 15-second SDK request timeout. Retries can make the overall request take longer.

For Docker, there’s one extra step: Compose currently passes only `DATABASE_URL` to the backend. Add the following under `services.backend.environment`, alongside `DATABASE_URL`. Then set the values in the root `.env` and run `docker compose up --build` again:

```yaml
AI_PROVIDER: ${AI_PROVIDER:-mock}
OPENAI_API_KEY: ${OPENAI_API_KEY:-}
OPENAI_MODEL: ${OPENAI_MODEL:-gpt-5-mini}
OPENAI_TIMEOUT_MS: ${OPENAI_TIMEOUT_MS:-15000}
```
Use those on the root .env so that the credentials dont leak, directly adding to compose and pushing the code will expose the key.

## Architecture

I split the app into a React frontend and a NestJS backend. I wanted the structure to be easy to follow, with a clear place for the UI, business rules, and AI integration.

### Frontend

I used React 19, Vite, and Tailwind CSS. Most of the frontend lives in `frontend/src/features/work-items`, which contains the components, hooks, API calls, and types for the work queue. I preferrebly chose the feature based architecture so that the feature related code stays in folder  keeping related code together so a change to one feature doesn’t mean searching across the whole project.

TanStack Query handles fetching and caching. After creating, analysing, or completing an item, the app updates the cache and refreshes the list. Pagination and status filters are handled by the backend. There’s also a manual refresh button; I haven’t added polling.

### Backend

The backend uses NestJS modules for work items, AI, database access, and health checks. Controllers handle requests, while `WorkItemsService` handles the workflow rules. DTOs validate incoming data before it reaches the service.

PostgreSQL stores the work items, and Prisma handles database access and migrations. I kept the data model to one table for this version: it holds the original request, current status, latest AI result, error details, and attempt count.

### AI integration

The AI code sits behind an `AiProvider` interface. The work-item service uses the same flow whether the selected provider is OpenAI or the mock. OpenAI returns structured output, and Zod checks the result before it’s saved.

An item starts as `RECEIVED`. Analysis moves it to `ANALYSING`, then either `READY_FOR_REVIEW` or `FAILED`. A failed item can be retried. Only an item ready for review can be marked `COMPLETED`.

### API

All routes below start with `/api`. You can try them in [Swagger](http://localhost:3000/api/docs).

- `POST /work-items` — submit an external ID, title, and description. Returns `201` for a new item or `200` if the external ID already exists.
- `GET /work-items` — list items, newest first. Supports `page`, `pageSize`, and an optional `status` filter. Page size defaults to 10 and is capped at 50.
- `GET /work-items/:id` — get one item.
- `POST /work-items/:id/analyse` — analyse a received item.
- `POST /work-items/:id/retry` — retry a failed analysis.
- `PATCH /work-items/:id/status` — mark a reviewed item complete with `{ "status": "COMPLETED" }`.
- `GET /health` — check that the API can reach the database.

Invalid input returns `400`, missing items return `404`, and invalid status transitions return `409`. If AI processing fails, the API returns the item with status `FAILED` and an error message, so clients need to check the returned status too.

## Assumptions

- I treated this as a shared internal work queue. I haven’t added user accounts or roles for the assessment.
- The system submitting work provides a stable `externalId`. Submitting the same ID again returns the original item, even if the title or description has changed.
- Work items contain text only. The limits are 100 characters for the external ID, 200 for the title, and 5,000 for the description.
- Analysis starts when a user requests it, rather than automatically on ingestion. I assumed the request volume would be low enough for synchronous processing.
- Someone reviews the AI result and carries out any required action before marking the item complete. The app doesn’t execute the recommendation itself.
- Keeping the latest analysis and error is enough for this version. There’s an attempt count, but no full history of previous results.

## Technical Decisions

### 1. Let the database handle duplicate submissions

I made `externalId` unique in PostgreSQL. If an insert hits that constraint, the service returns the existing item. This handles retries and simultaneous submissions without a separate check before inserting. The trade-off is that resubmitting an item won’t correct its content; that would need a separate update flow.

### 2. Keep AI analysis synchronous for now

I considered a background queue, but it felt like extra infrastructure for the size of this assessment. The analysis endpoint waits for the provider and returns the updated item.

Before calling AI, the service updates the status only if it still matches the expected starting state. That prevents two requests from analysing the same item at once. The limitation is recovery: if the backend crashes during analysis, the item can remain stuck in `ANALYSING`. A worker with recoverable jobs would be my next step for production.

### 3. Keep the provider replaceable and check its output

The provider interface lets me run the app with a mock during development and switch to OpenAI through configuration. Both go through the same Zod validation for categories, priorities, and text lengths.

This catches invalid responses, but a correctly formatted answer can still be wrong. That’s why the workflow keeps a human review step.

## Tests

After installing dependencies and setting up the backend `.env`, run these from the repository root:

```sh
npm --prefix backend-api test
npm --prefix backend-api run build
npm --prefix frontend run build
npm --prefix frontend run lint
```

The backend tests cover duplicate ingestion, pagination and filtering, competing analysis requests, invalid status changes, retries, and failed or invalid AI responses. They use mocked database and AI dependencies, so they don’t need a running database or an API key.
## Production Considerations

The main things I’d address before putting this into production are:

- **Authentication and permissions:** Add login and roles so we can control who submits, analyses, and completes work. I’d also record who made each change.
- **Background processing:** Move AI calls to a queue with retries, backoff, and a way to recover stuck jobs. The frontend would then need polling or server events for progress updates.
- **Logging and monitoring:** Add structured logs with request IDs, plus metrics for analysis failures, response times, and stuck items. The current error logs and database health check are a starting point.
- **Database and scale:** Add indexes based on actual query patterns, move to cursor pagination if the queue grows, and keep a separate history of analysis attempts and review actions. Backups and tested restores would also be necessary.
- **Security:** Use managed secrets, HTTPS, rate limits, and restricted database access. I’d also review what data can be sent to the LLM and redact sensitive fields where needed.
- **LLM quality and cost:** Test the prompt against representative work items, track token usage and cost, and set explicit retry and output limits. Schema validation alone won’t catch a misleading recommendation.
