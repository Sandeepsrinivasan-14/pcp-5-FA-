# TrackIt

An issue and bug tracking system built on the MERN stack. Teams organise work
into projects, file issues against them, move those issues through a review
workflow, and discuss them in comments — with permissions enforced per role.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [User roles](#user-roles)
- [API reference](#api-reference)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)

---

## Features

- **Role-based access control** — four roles with distinct permissions, enforced
  server-side on every route.
- **Issue workflow** — `open → in-progress → testing → resolved → closed`, with
  transition rules (a closed issue must be reopened before it can move again;
  only the assigned developer can send an issue to testing).
- **Projects** — group issues, assign an owner and members.
- **Comments** — discussion threads on issues; testers can comment even where
  they cannot edit.
- **Analytics** — issue counts by status and priority, per-project breakdowns,
  developer resolution leaderboards, average resolution time, activity feed.
- **Activity log** — an audit trail of registrations, logins, and every issue
  create/update/status change/assignment.
- **Dataset sync** — optional bulk import from an external coursework API.

## Architecture

```
├── backend/                 Express + Mongoose REST API
│   ├── server.js            entrypoint: config check, DB connect, graceful shutdown
│   ├── scripts/             seed and post-deploy smoke test
│   ├── tests/               Jest + Supertest suite
│   └── src/
│       ├── app.js           Express wiring only — no DB, so tests can import it
│       ├── config/          validated environment configuration
│       ├── controllers/     request handling per resource
│       ├── middleware/       auth, validation, rate limiting, error handling
│       ├── models/          Mongoose schemas
│       ├── routes/          route tables
│       ├── services/        seeding
│       ├── utils/           logger, errors, shared query helpers
│       └── validators/      Zod request schemas
├── frontend/                React SPA (Create React App)
├── Dockerfile               multi-stage build: SPA + API in one image
├── docker-compose.yml       local stack including MongoDB
└── railway.json             Railway deployment config
```

The API is mounted at **`/api`**. It is *also* mounted at the bare root
(`/issues`, `/projects`, …) for backwards compatibility, but only when this
process is not serving the SPA — those paths belong to the frontend's own
client-side router when it is. See `ENABLE_LEGACY_ROOT_ROUTES`.

## Quick start

### Option 1 — Docker (everything, including the database)

```bash
cp .env.example .env
# Set JWT_SECRET in .env:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

docker compose up --build
```

The app is on <http://localhost:5000>. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`
in `.env` before the first boot to create your login.

### Option 2 — Run locally

You need Node.js 20+ and a MongoDB instance (local or Atlas).

```bash
cp .env.example .env          # then fill in MONGODB_URI and JWT_SECRET

npm run install:all           # installs backend and frontend dependencies
npm run seed -- --sample      # optional: demo accounts + sample data

npm run dev                   # API on http://localhost:5000
npm run dev:frontend          # SPA on http://localhost:3000
```

The seeder prints the generated demo passwords once. To choose them yourself,
set `SEED_DEMO_PASSWORD` before running it.

## Configuration

Every setting is an environment variable; see [`.env.example`](.env.example) for
the annotated list. The server validates its configuration at startup and
refuses to boot with a clear message if something essential is missing or weak —
it will not start without a `JWT_SECRET` of at least 32 characters.

The variables that matter most:

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Token signing secret, 32+ characters |
| `PORT` | no | Listen port (default `5000`) |
| `CORS_ORIGINS` | no | Comma-separated allowed browser origins |
| `SERVE_FRONTEND` | no | Serve the built SPA from this process |
| `TRUST_PROXY` | no | Enable behind a load balancer for correct client IPs |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | no | Bootstrap an administrator on boot |
| `SEED_DEMO_USERS` | no | Create the four demo accounts (default: dev only) |

## User roles

| Capability | Admin | Manager | Developer | Tester |
| --- | :-: | :-: | :-: | :-: |
| View projects, issues, comments, analytics | ● | ● | ● | ● |
| Create / edit / delete projects | ● | ● | | |
| Create / delete issues | ● | ● | | |
| Assign issues | ● | ● | | |
| Edit issues | ● | ● | assigned only | |
| Move an issue to `testing` | ● | ● | assigned only | |
| Resolve or close an issue | ● | ● | ● | |
| Add comments | ● | ● | ● | ● |
| Delete any comment | ● | own | own | own |
| Trigger dataset sync | ● | ● | | |

## API reference

All routes below are relative to `/api`. Every route except `/health`,
`/auth/register` and `/auth/login` requires an `Authorization: Bearer <token>`
header. Responses share the shape `{ success, message?, data? }`.

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Exchange credentials for a JWT |
| `GET` | `/auth/me` | The authenticated user |

### Projects

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/projects` | all — filters: `status`, `owner` |
| `GET` | `/projects/:id` | all — accepts `_id` or `projectId` |
| `POST` | `/projects` | admin, manager |
| `PATCH` | `/projects/:id` | admin, manager |
| `DELETE` | `/projects/:id` | admin, manager |

### Issues

| Method | Path | Roles |
| --- | --- | --- |
| `GET` | `/issues` | all — filters: `project`, `status`, `priority`, `severity`, `assignedTo`, `search`, `page`, `limit` |
| `GET` | `/issues/:id` | all — includes comments |
| `POST` | `/issues` | admin, manager |
| `PATCH` | `/issues/:id` | admin, manager, assigned developer |
| `PATCH` | `/issues/:id/assign` | admin, manager |
| `PATCH` | `/issues/:id/status` | all, subject to workflow rules |
| `DELETE` | `/issues/:id` | admin, manager |
| `POST` | `/issues/:id/comments` | all |

### Comments, users, analytics

| Method | Path | Description |
| --- | --- | --- |
| `GET` `POST` | `/comments` | List or create a comment |
| `GET` `DELETE` | `/comments/:id` | Fetch or delete (author or admin) |
| `GET` | `/users`, `/users/:id` | Team directory |
| `GET` | `/analytics/issues` | Counts by status |
| `GET` | `/analytics/projects` | Per-project issue counts |
| `GET` | `/analytics/developers` | Resolution leaderboard, average time |
| `GET` | `/analytics/dashboard` | Everything above plus the activity feed |
| `POST` | `/sync` | Bulk import from the dataset API (admin, manager) |
| `GET` | `/health` | Liveness and database status |

## Testing

```bash
npm test                        # from the repository root
cd backend && npm run test:coverage
```

The suite covers authentication, role permissions, the issue workflow,
comments, analytics, configuration validation, and security properties. It runs
against an in-memory MongoDB by default; set `MONGODB_TEST_URI` to point it at a
real instance instead (CI does this with a service container).

After deploying, verify the live instance:

```bash
BASE_URL=https://your-app.up.railway.app npm run smoke
```

## Deployment

### Railway (single service)

1. Create a project from this repository. Railway reads `railway.json` and
   builds the `Dockerfile`, which compiles the SPA and serves it from the API —
   one service, one URL.
2. Add a **MongoDB** database to the project.
3. Set these variables on the app service:

   | Variable | Value |
   | --- | --- |
   | `MONGODB_URI` | `${{MongoDB.MONGO_URL}}` (Railway reference variable) |
   | `JWT_SECRET` | a fresh 48-byte random hex string |
   | `CORS_ORIGINS` | your Railway URL, e.g. `https://trackit.up.railway.app` |
   | `ADMIN_EMAIL` | your login email |
   | `ADMIN_PASSWORD` | a strong password, 12+ characters |

   `NODE_ENV`, `SERVE_FRONTEND`, `TRUST_PROXY` and `PORT` are already set by the
   Dockerfile.
4. Deploy, then confirm `/health` returns `"database": "connected"`.

### Any Docker host

```bash
docker build -t trackit .
docker run -p 5000:5000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="$(openssl rand -hex 48)" \
  -e CORS_ORIGINS="https://yourdomain.com" \
  -e ADMIN_EMAIL="you@yourdomain.com" \
  -e ADMIN_PASSWORD="a-strong-password" \
  trackit
```

### Split deployment (static SPA + separate API)

Host the API anywhere Node runs with `SERVE_FRONTEND=false`, then build the
frontend against it:

```bash
cd frontend
REACT_APP_API_URL=https://your-api.example.com/api npm run build
```

Deploy `frontend/build` to any static host and add that host's origin to
`CORS_ORIGINS` on the API.

## Security

See [SECURITY.md](SECURITY.md) for the security posture, what is enforced, and
how to report a vulnerability.

## License

MIT
