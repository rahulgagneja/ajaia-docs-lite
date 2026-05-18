# Architecture Note

## Product Slice

I prioritized the smallest coherent "collaborative docs" loop:

1. A user can create or import a document.
2. They can edit rich text and save it.
3. The document survives refresh and reopen.
4. The owner can share it with another seeded user.
5. The recipient sees a clear shared document state and can edit it.

This gives reviewers a complete end-to-end workflow without spending the timebox on infrastructure-heavy pieces like full auth, operational databases, or real-time sync.

## Stack

- `server.mjs`: dependency-free Node HTTP server serving static assets and JSON API routes.
- `lib/store.mjs`: JSON-backed data store with users, documents, and shares.
- `public/index.html`, `public/styles.css`, `public/app.js`: browser UI with a contenteditable editor.
- `test/app.test.mjs`: Node test runner coverage for the most important backend behaviors.

## Data Model

- `users`: seeded demo accounts.
- `documents`: `id`, `title`, `ownerId`, saved HTML `content`, timestamps.
- `shares`: `documentId`, `userId`, `role`.

The editor stores sanitized HTML. That preserves formatting from browser editing while staying lightweight. The sanitizer strips script tags and inline event handlers; in a production build I would replace this with a mature allowlist sanitizer.

## API Surface

- `GET /api/session`
- `GET /api/documents?userId=...`
- `POST /api/documents`
- `GET /api/documents/:id?userId=...`
- `PUT /api/documents/:id?userId=...`
- `POST /api/documents/:id/share?userId=...`
- `POST /api/import`

The server enforces access checks for reads, updates, and sharing. Only owners can share. Shared users can edit in this assignment version because the minimum requirement is clear access logic rather than role granularity.

## What I Would Build Next

With another 2-4 hours, I would add autosave with visible save history, Markdown parsing for imports, viewer/editor roles, and Playwright browser coverage for the main reviewer flow. For a larger production pass, I would move persistence to SQLite/Postgres, add real auth, introduce document versioning, and use a purpose-built editor framework such as ProseMirror, TipTap, or Lexical.
