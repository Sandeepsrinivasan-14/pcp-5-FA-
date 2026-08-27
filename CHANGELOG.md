# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-08-27

First release considered fit to deploy. The application logic largely existed
before this point; this release is what made it operable, testable and safe to
put on the public internet.

### Security

- **Removed committed credentials.** A MongoDB Atlas connection string with its
  password, and an external service account login, were present as literals in
  repository scripts and as fallback defaults in the sync controller. All are
  gone. They remain in git history and must be treated as compromised.
- **Authenticated the dataset sync endpoint.** `POST /sync` performs bulk writes
  across every collection and previously required no credentials at all. It now
  requires an admin or manager token.
- **Replaced the hardcoded demo accounts.** Four accounts with passwords written
  into the source were seeded on every boot and advertised on the login page.
  Seeding is now opt-in, disabled by default in production, and generates random
  passwords unless `SEED_DEMO_PASSWORD` is supplied.
- **Added request validation** with Zod on every mutating route, which also
  prevents query-operator injection (`{"$ne": null}`) reaching Mongoose.
- **Escaped user input before regex compilation**, closing a denial-of-service
  vector in issue search and project owner filtering.
- **Added** `helmet`, an explicit CORS allowlist, a 1 MB body limit, and rate
  limiting with a stricter budget for authentication routes.
- **Hardened authentication**: bcrypt cost raised to 12; login now takes the same
  path and returns the same message for an unknown account as for a wrong
  password; inactive accounts are rejected.
- **Users created by dataset import** receive an unguessable random password
  instead of a shared literal.

### Added

- Test suite of 99 cases covering authentication, role permissions, the issue
  workflow, comments, analytics, configuration validation and security
  properties.
- Continuous integration running lint, the test suite against a MongoDB service
  container, the frontend build, and a Docker image build.
- Multi-stage `Dockerfile` producing a single image that serves the API and the
  compiled SPA, plus a `docker-compose.yml` including MongoDB.
- `railway.json` for one-click Railway deployment.
- Configuration validation that refuses to start on a missing or weak
  `JWT_SECRET`, an absent `MONGODB_URI`, or wildcard CORS in production.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` bootstrap for provisioning the first
  administrator without demo data.
- Seed script (`npm run seed`) and post-deployment smoke test (`npm run smoke`).
- Graceful shutdown allowing in-flight requests to complete.
- Structured logging, JSON-formatted in production.
- Database indexes backing the common queries and the unique-title-per-project
  rule.

### Changed

- **Split the backend into layers.** A single 1,100-line `app.js` became
  `config/`, `middleware/`, `routes/`, `controllers/`, `services/`, `validators/`
  and `utils/`. The Express app no longer opens its own database connection,
  which is what allows the test suite to import it.
- **Mounted the API under `/api`.** The bare-root mounts are retained for
  existing clients, but are disabled when this process also serves the SPA,
  because `/issues` and `/projects` are the frontend's own routes.
- Replaced per-handler `try`/`catch` with an async wrapper and a central error
  handler that never returns internal details or stack traces to clients.
- Extracted the id-or-business-id lookup that had been repeated across roughly
  fifteen handlers.
- Generated identifiers now carry a random suffix; `Date.now()` alone collided
  when two records were created in the same millisecond.

### Fixed

- `ActivityLog` never declared `details`, so Mongoose silently discarded that
  field on every write — the audit trail recorded actions with no description.
- Email addresses were not normalised, so differing capitalisation could create
  two accounts for one person and cause login lookups to miss.
- Deleting an issue orphaned its comments.
- Filtering issues by a project that matched nothing returned every issue rather
  than none.
- `/health` hung until the Mongoose buffer timed out when the database was
  unreachable; it now returns 503 immediately.
- The frontend redirected away from the login page on a failed sign-in,
  discarding the error message it had just received.
- Removed a duplicate `server.js` and `package.json` at the repository root that
  required a path which did not exist there, so `npm start` failed from a fresh
  clone.

[1.0.0]: https://github.com/Sandeepsrinivasan-14/trackit/releases/tag/v1.0.0
