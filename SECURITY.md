# Security

## Reporting a vulnerability

Please report security issues privately by opening a
[GitHub security advisory](https://github.com/Sandeepsrinivasan-14/trackit/security/advisories/new)
rather than a public issue.

## What this application enforces

**Authentication**

- Passwords are hashed with bcrypt (cost factor 12) and are never returned by
  any endpoint — the `User` model strips the field on serialisation.
- JWTs are signed with `JWT_SECRET`; the server refuses to start if that secret
  is missing or shorter than 32 characters.
- Login responds identically for an unknown account and a wrong password, and
  performs the hash comparison either way, so account existence cannot be probed.
- Login and registration are rate limited independently of the rest of the API.

**Authorization**

- Every route except `/health`, `/auth/register` and `/auth/login` requires a
  valid token.
- Role checks run server-side on each request. The client is never trusted to
  enforce them.
- Inactive accounts are rejected at authentication time.

**Input handling**

- Request bodies are validated and coerced with Zod schemas before reaching any
  controller, which also blocks query-operator injection (`{"$ne": null}`) into
  Mongoose queries.
- User-supplied search terms are escaped before being compiled into a `RegExp`,
  preventing catastrophic-backtracking denial of service.
- Pagination limits are clamped, so a single request cannot ask for the entire
  collection.
- Request bodies are capped at 1 MB.

**Transport and headers**

- `helmet` sets the standard protective headers; `x-powered-by` is disabled.
- CORS is restricted to an explicit origin allowlist, and a wildcard is rejected
  outright in production.

**Operational**

- Internal errors are logged server-side but reported to clients as a generic
  message, with stack traces never included in production responses.
- The dataset sync endpoint requires an admin or manager token. It previously
  had no authentication at all.
- Demo accounts are opt-in, disabled by default in production, and get randomly
  generated passwords unless `SEED_DEMO_PASSWORD` is set.
- Users created by dataset import receive an unguessable random password and
  cannot be logged into until an administrator resets them.

## Deployment checklist

- [ ] `JWT_SECRET` is freshly generated and unique to this deployment.
- [ ] `MONGODB_URI` credentials are unique to this deployment and not shared
      with any other environment.
- [ ] `CORS_ORIGINS` lists only origins you control.
- [ ] `TRUST_PROXY=true` if running behind a load balancer, so rate limiting
      sees real client IPs.
- [ ] `SEED_DEMO_USERS` is unset or `false`.
- [ ] `ADMIN_PASSWORD` is at least 12 characters and stored in a password
      manager, not in the repository.
- [ ] Database network access is restricted to your application's egress IPs
      rather than `0.0.0.0/0`.

## Credential history

Earlier revisions of this repository committed real credentials to source
control while the repository was public:

- A MongoDB Atlas connection string, including its username and password, in a
  root-level test script.
- An external service account identifier and password, both as literals in a
  test script and as fallback defaults inside the sync controller.
- Four demo accounts with passwords hardcoded in the server and published on
  the login page, seeded automatically on every boot.

All of these have been removed from the working tree and replaced with
environment configuration. **They remain readable in the git history**, so every
one of those credentials must be treated as compromised and rotated. Removing a
secret from the latest commit does not remove it from earlier ones; rewriting
history (for example with `git filter-repo`) additionally requires a force push
and invalidates existing clones.
