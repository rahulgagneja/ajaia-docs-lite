# Ajaia Docs Lite

A small full stack collaborative document editor inspired by Google Docs. It focuses on a practical reviewable slice: create and rename documents, edit rich text in the browser, import text files, share with seeded users, and persist everything locally.

## Features

- Create, rename, save, close, and reopen documents
- Rich text editing with bold, italic, underline, headings, bulleted lists, and numbered lists
- Import `.txt` and `.md` files as new editable documents
- Seeded users with a lightweight session switcher
- Owner/shared document distinction in the sidebar
- Owner-only sharing flow that grants another seeded user editor access
- JSON file persistence in `data/store.json`
- Automated tests for persistence, sharing, and import behavior

## Seeded Users

Use the "Working as" switcher in the app.

- Ava Product: `ava@ajaia.local`
- Ben Design: `ben@ajaia.local`
- Cy Engineering: `cy@ajaia.local`

The seeded "Launch plan draft" document is owned by Ava and already shared with Ben.

## Run Locally

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

This app has no external runtime dependencies, so `npm install` is effectively a lockfile/package metadata step if you choose to generate one. Open:

```text
http://localhost:3000
```

Run tests:

```bash
npm test
```

## File Upload Support

The UI supports `.txt` and `.md` imports. The browser reads the selected file and sends its text content to the server, which creates a new editable document owned by the current user. Markdown is imported as text rather than rendered Markdown; this keeps the editing model simple and predictable for the timebox.

## Deployment

The server is a plain Node HTTP app and can run on Render, Railway, Fly.io, or any Node host.

Example start command:

```bash
npm start
```

Set `PORT` if your host requires a specific port. For a production deployment with durable data, replace `data/store.json` with a mounted disk or managed database. The current implementation is intentionally local-file backed for a small assignment demo.

## Known Scope Cuts

- No real authentication; users are simulated through a reviewer-friendly switcher.
- No concurrent editing or conflict resolution.
- Imported `.md` files are not parsed into rich Markdown structure.
- Sharing grants editor access only; there are no viewer/commenter roles.
- Local JSON persistence is not intended for multi-instance production deployment.
