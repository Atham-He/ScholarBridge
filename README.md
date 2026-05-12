# ScholarBridge

ScholarBridge is a mentor-student matching platform for research opportunities. The current app is a Next.js + Prisma + SQLite application under `backend/`, with separate student and mentor workflows, application management, resume upload, and AI-assisted resume scoring.

## Current Product Scope

### Student side

- Register, log in, and maintain session state.
- Browse research projects in a project-first discovery page.
- Search and filter by research area.
- View project details in modal cards.
- Apply to projects, withdraw pending applications, and see accepted or rejected outcomes.
- Save projects to favorites.
- Manage profile information:
  - basic info
  - saved projects
  - application history
- Upload a PDF resume, store it in the database, and preview it later.
- See mentor feedback in:
  - the student profile application list
  - the project details modal on `/browse`

### Mentor side

- Edit mentor profile information.
- Create, edit, close, reopen, and delete projects.
- Review all applications for each project.
- Open student detail modals from project applications.
- View the student's uploaded PDF resume for a given application.
- Accept, reject, or revert decisions back to `pending`.
- Add optional mentor feedback for accepted or rejected applications.

### AI resume scoring

- Each mentor has an AI screening agent configuration.
- The mentor can set:
  - whether AI screening is enabled
  - a custom agent prompt
  - a weighting slider between:
    - `Hard background`
    - `Project fit`
- Default weighting is `50 / 50`.
- Student resumes are parsed from uploaded PDF files and stored as text for scoring.
- When a student applies, the system scores the application automatically if resume text exists.
- Mentor application lists are sorted by weighted AI score by default.
- Each application stores:
  - hard background score
  - project fit score
  - weighted score
  - AI summary
  - scoring timestamp
  - scoring error state if the AI request fails

If `OPENAI_API_KEY` is not configured, the app falls back to a local heuristic score. If `OPENAI_BASE_URL` is configured, requests are sent to that OpenAI-compatible endpoint.

## Tech Stack

- Next.js 16
- React 19
- Prisma
- SQLite
- TypeScript
- Jest

## Repository Layout

The active application lives in:

```text
backend/
```

Key areas:

- `backend/app/`: Next.js app router pages and API routes
- `backend/lib/`: auth, db, AI scoring, utilities
- `backend/prisma/`: schema, migrations, seed
- `backend/dev.db`: local SQLite database

## Environment Setup

The backend runtime reads `backend/.env`.

The root `.env` may exist for other tooling, but the web app and API routes should be configured through:

```text
backend/.env
```

Minimum required variables:

```env
DATABASE_URL="file:/absolute/path/to/ScholarBridge/backend/dev.db"
SESSION_SECRET="replace-with-a-random-string"
```

Optional AI scoring variables:

```env
OPENAI_API_KEY="your-key"
OPENAI_BASE_URL="https://your-openai-compatible-endpoint"
OPENAI_MODEL="gpt-4o-mini"
```

Notes:

- If you are using an OpenAI-compatible proxy, the key must belong to that proxy, not necessarily to official OpenAI.
- After changing `backend/.env`, restart the dev server.

## Install and Run

From the repo root:

```bash
cd backend
npm install
```

Initialize Prisma:

```bash
npm run db:generate
npm run db:push
```

Start the app:

```bash
npm run dev
```

Default local URL:

```text
http://localhost:3000
```

## Database Notes

The app uses SQLite and Prisma. Recent schema additions include:

- student resume metadata and PDF blob storage
- extracted resume text
- mentor feedback on applications
- mentor AI agent configuration
- AI scoring fields on applications

If the schema changes, run:

```bash
cd backend
npx prisma generate
npx prisma db push
```

## Useful Commands

Run these from `backend/`:

```bash
npm run dev
npm run build
npm run start
npm run type-check
npm test -- --runInBand
npm run db:generate
npm run db:push
npm run db:studio
```

There is also a small API connectivity check for the configured OpenAI-compatible endpoint:

```bash
npx tsx scripts/test-openai-api.ts
```

This script prints the active `OPENAI_BASE_URL`, `OPENAI_MODEL`, and a masked key prefix/suffix, then sends a minimal chat completion request.

## Testing

The project uses Jest.

Test environment setup now loads env files in this order:

1. `backend/.env.test`
2. `backend/.env`
3. root `.env.test`
4. root `.env`

If `DATABASE_URL` is still missing, Jest falls back to `backend/dev.db`.

Run all tests:

```bash
cd backend
npm test -- --runInBand
```

## Current Behavioral Notes

- Student `/student` redirects to `/student/profile`.
- Student profile sections are collapsible by default.
- Project details on `/browse` open in a floating modal instead of inline expansion.
- Mentor feedback is visible to students only after opening `View details`.
- Resume viewing is permission-gated:
  - students can view their own resume
  - mentors can view the resume only through applications to their own projects

## Common Issues

### AI scoring says authentication failed

The most common cause is a mismatch between:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

Check the actual file being used:

```text
backend/.env
```

Then test it directly:

```bash
cd backend
npx tsx scripts/test-openai-api.ts
```

### Tests fail with missing `DATABASE_URL`

This should now be handled by `backend/jest.setup.ts`. If it still fails, verify that:

- tests are run from `backend/`
- `backend/.env` exists
- Prisma can access the SQLite file path in `DATABASE_URL`

### Prisma schema changed but app still errors

Regenerate Prisma client and sync the local database:

```bash
cd backend
npx prisma generate
npx prisma db push
```
