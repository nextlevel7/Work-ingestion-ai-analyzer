# AI Work Intake System

## Setup

### Prerequisites
- Docker & Docker Compose
- Node.js (if you wish to run locally outside Docker)

### How to Install and Run
From the repository root, run:
```sh
docker compose up --build
```

This command will start:
- **Postgres Database** (with a persistent volume)
- **Backend API** (NestJS) at `http://localhost:3000/api`
- **Frontend SPA** (React/Vite) at `http://localhost:8000`

The backend container will automatically apply Prisma migrations to the database and generate the client on startup. By default, the application runs using the mock AI provider. 

If you want to use the OpenAI API, you must update the `docker-compose.yml` to change `AI_PROVIDER: mock` to `AI_PROVIDER: openai` and provide your `OPENAI_API_KEY` in the environment.

### Architecture

I wanted to keep the architecture clean and modular, focusing on a great developer experience without over-engineering for scale we don't need yet. The application is split into a React frontend and a NestJS backend.

### Frontend (`/frontend`)
For the frontend, I went with React 19 and Vite and feature based architecture.

- **Feature-Based Structure**: Instead of dumping all my components into one folder and hooks into another, I organized everything by feature (you can see this in `src/features/work-items`). I find that grouping the API calls, types, components, and hooks together by domain makes the codebase way easier to navigate. If I need to change how a work item is handled, I don't have to jump across five different root folders; everything I need is right there in the `work-items` directory.
- **Why TanStack Query?**: I used TanStack Query (React Query) for data fetching instead of writing messy `useEffect` hooks or bringing in something heavy like Redux. Honestly, managing server state on the client side is a headache, and TanStack Query just handles the hard parts—like caching, loading states, and deduplicating requests—out of the box. Since this is an AI app where a work item's status is updating (moving from `RECEIVED` to `ANALYSING` to `READY_FOR_REVIEW`), having a reliable way to invalidate the cache and refetch data keeps the UI accurate without writing a ton of boilerplate.

### Backend (`/backend-api`)
On the backend, I used NestJS and PostgreSQL as database and prisma orm. 

- **Keeping Things Organized with NestJS**: I chose NestJS because I really like the structure it forces on you. The built-in Dependency Injection and module system mean the routing logic stays strictly in the Controllers, and the heavy lifting stays in the Services. It prevents the codebase from turning into a massive file of tangled functions as the business logic grows.And as we use AI for pair programming these days we exactly know where the AI changes were supposed to happen , files and folder are organized efficiently.
- **The AI Provider Pattern**:,I set up an abstract `AiProvider`. The core business logic doesn't actually know or care if it's talking to OpenAI or a mock service; it just asks the provider to analyze the text. 

## Assumptions
- **Work Item Size**: It is assumed that incoming work item descriptions and titles fit well within the context window limits of modern LLMs.
- **Traffic and Concurrency**: It is assumed that for this MVP, the volume of `analyse` requests is manageable through synchronous HTTP calls. 
- **Data Model Strategy**: Idempotent creation uses the `externalId` to prevent duplicating the same work item if the client retries the creation process.

## Technical Decisions

1. **Handling Duplicates Gracefully (Idempotency)**: I knew that whatever system is submitting these work items might retry requests if there's a network blip. To handle this, I made the `POST /api/work-items` endpoint idempotent using the `externalId`. If the exact same ID is submitted twice, the database throws a unique constraint error. Instead of crashing with a 500 error, my catch block intercepts it and just returns the existing item. It's a simple, bulletproof way to prevent duplicate records without having to do extra database lookups first.
2. **Keeping AI Processing Synchronous**: I debated setting up a background queue (like BullMQ or Redis) for the AI analysis since LLM calls can take a few seconds. But looking at the requirements—specifically the note about not needing "enterprise-scale infrastructure"—I decided a queue would just be unnecessary overhead for this MVP. Instead, the analysis is triggered synchronously via `POST /api/work-items/:id/analyse`. To ensure we don't accidentally run the analysis twice on the same item, I added a quick optimistic concurrency check (`startAnalysisIfStatusMatches`) that safely locks the status to `ANALYSING` before actually calling the AI. It keeps the stack lean while still being safe.
3. **Abstracting the AI Integration**: I didn't want the core `AiService` hardcoded to OpenAI's SDK. By putting an abstract `AiProvider` in the middle, the main application logic is completely shielded from the actual LLM implementation. This decision paid off immediately because it allowed me to plug in the `MockAiProvider`. I was able to test the entire frontend, database flow, and state transitions locally without waiting for real LLM responses or worrying about rate limits.

## Production Considerations

If we were actually taking this to a live production environment tomorrow, there are a few corners I cut for the sake of the MVP that I'd immediately want to fill in:

- **Auth & Access Control**: Right now, the API is wide open. I'd want to drop in an identity provider like Auth0 or AWS Cognito to lock down the endpoints. We'd also need some basic Role-Based Access Control (RBAC) so we can actually control who is allowed to review, accept, or retry the AI's analysis.
- **Real Background Queues**: I kept the AI analysis synchronous to keep the stack simple for this assessment, but in production, holding HTTP requests open while waiting for OpenAI is a bad idea. I would spin up a Redis instance and use something like BullMQ to offload the AI calls to a background worker. This would give us robust retry logic and protect us if the LLM provider starts rate-limiting us.
- **Observability & Logging**: When an AI app breaks, it can be really hard to figure out *why* if you don't have good logs. I'd add structured logging (like Winston) to trace requests.

- **Tightening Security**: Using a local `.env` file is fine for testing, but in production, I'd want those API keys and database credentials pulled dynamically from a secure vault like AWS Secrets Manager or HashiCorp Vault. I'd also throw a rate limiter (like Nest's `ThrottlerModule`) on the public routes to prevent anyone from spamming the ingestion endpoint.

## AI Usage

I definitely took advantage of modern AI tooling to move faster on the boilerplate so I could focus my time on the architecture and business logic.

- **Tools of Choice**: I mostly used Codex and Antigravity CLI.
- **How I Used Them**: They were a massive help for scaffolding the initial NestJS modules and getting the React components styled quickly with TailwindCSS. I also used them to bounce ideas around when translating the raw requirements into the initial Prisma schema.
- **Trust, but Verify**: AI writes code fast, but it's not always right. I made sure to verify everything by relying on the automated tests (Jest on the backend, Vitest on the frontend). I also manually inspected every SQL migration that was generated to ensure the database constraints (like the `externalId` uniqueness) were actually doing what I expected before running them.
- **Where I Pushed Back**: AI tools have a bad habit of over-engineering things if you aren't careful. At one point, the AI tried to suggest setting up a full Redis queue with long-polling for the analysis endpoint. I explicitly rejected that and went with the simpler synchronous API approach, because building enterprise-scale infrastructure for an MVP just didn't align with the assessment's goals.

## Submission
- **Name**: Sujan
- **GitHub Repository**: (Link to be provided upon push)
- **Backend Language**: TypeScript (Node.js/NestJS)
- **LLM Provider / Mock Used**: OpenAI (and Mock Provider for local dev)
- **Approximate Time Spent**: ~3.5 hours
