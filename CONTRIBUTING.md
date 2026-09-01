# Contributing to TrackIt

Thanks for taking an interest. This guide covers everything you need to get a
change merged.

## Getting set up

You need Node.js 20 or newer and a MongoDB instance. Docker is optional but
gives you both without installing anything else.

```bash
git clone https://github.com/Sandeepsrinivasan-14/trackit.git
cd trackit

cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# paste that into JWT_SECRET

npm run install:all
npm run seed -- --sample
```

Then run the two halves in separate terminals:

```bash
npm run dev            # API on :5000
npm run dev:frontend   # SPA on :3000
```

Or bring the whole stack up with Docker, database included:

```bash
docker compose up --build
```

## Before you open a pull request

Run what CI runs:

```bash
npm test                       # backend suite
cd backend && npm run lint     # ESLint
cd frontend && npm run build   # confirms the SPA still compiles
```

All three must pass. CI will run them again on your branch.

## How the code is organised

The backend follows a conventional layered structure. When adding a feature,
put each piece where its neighbours already live:

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes | `backend/src/routes/` | URL shape, middleware order, nothing else |
| Validators | `backend/src/validators/` | Zod schemas describing accepted input |
| Controllers | `backend/src/controllers/` | Request handling and business rules |
| Models | `backend/src/models/` | Mongoose schemas and indexes |
| Middleware | `backend/src/middleware/` | Auth, validation, rate limiting, errors |
| Utils | `backend/src/utils/` | Shared helpers with no request awareness |

A few conventions worth knowing:

- **Controllers never use `try`/`catch`.** Wrap the handler in `asyncHandler`
  and throw an `ApiError`; the central error handler formats the response.
- **Validate at the route, not in the controller.** Add a Zod schema and attach
  it with `validateBody`. Controllers should be able to trust `req.body`.
- **Resolve references with `resolveRef` / `findByAnyId`.** Every endpoint
  accepts either a Mongo `_id` or a business id (`PRJ-…`, `ISS-…`, `usr-…`), and
  those helpers are what make that uniform.
- **Never interpolate user input into a `RegExp`.** Use `caseInsensitive()`
  from `utils/query`, which escapes it first.

## Tests

Every behavioural change needs a test. The suite lives in `backend/tests/` and
uses Jest with Supertest against an in-memory MongoDB.

`tests/helpers.js` gives you `createUser({ role })`, which returns a user and a
ready-to-use bearer token, plus `createProject()` and an `auth()` header helper.
Use them rather than registering through the API.

```js
const { app, request, createUser, auth } = require('./helpers');

it('forbids a tester from deleting an issue', async () => {
    const { token } = await createUser({ role: 'tester' });
    const res = await request(app).delete('/api/issues/ISS-1').set(auth(token));
    expect(res.status).toBe(403);
});
```

Name tests by the behaviour they pin down, not the function they call.

## Commit messages

Write a short imperative subject line, then explain *why* in the body if the
reason is not obvious from the diff. Reference an issue number when one exists.

```
Reject issue reassignment on closed issues

Reassigning without reopening left the audit trail claiming an owner
for work nobody could act on.
```

## Security

Do not open a public issue for a vulnerability. Follow the process in
[SECURITY.md](SECURITY.md) instead.

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
