## Run with Docker

From the repository root:

```sh
docker compose up --build
```

Open http://localhost:8080. This starts the frontend, backend, and Postgres with the mock AI provider. The backend applies Prisma migrations on startup. Nginx forwards `/api` requests to the backend.

The work queue requests 10 items at a time. Its current page and status filter are sent to the backend and included in the TanStack Query key.

Local `.env` files are excluded from the images; Compose supplies the database URL. Run `docker compose down` to stop the containers. Database data stays in the named volume.
