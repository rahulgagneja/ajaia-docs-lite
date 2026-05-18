# Submission Contents

## Included

- Source code for Ajaia Docs Lite
- `README.md` with setup, run, seeded users, upload support, and deployment notes
- `docs/ARCHITECTURE.md`
- `docs/AI_WORKFLOW.md`
- `SUBMISSION.md`
- `walkthrough-video-url.txt`
- `live-product-url.txt`
- Automated tests in `test/app.test.mjs`

## Live Product URL

See `live-product-url.txt`.

## Walkthrough Video URL

See `walkthrough-video-url.txt`.

## Test Accounts

- Ava Product: `ava@ajaia.local`
- Ben Design: `ben@ajaia.local`
- Cy Engineering: `cy@ajaia.local`

Use the in-app "Working as" switcher. No password is required.

## Feature Status

Working:

- Create, rename, edit, save, and reopen documents
- Rich text controls for bold, italic, underline, headings, bullets, and numbered lists
- Import `.txt` and `.md` files into new documents
- Owner and shared document distinction
- Owner-only sharing to another seeded user
- JSON-backed persistence
- Backend automated tests

Incomplete:

- External live deployment link has not been filled in from this environment
- Walkthrough video URL has not been recorded from this environment
- No real authentication, real-time collaboration, comments, or version history

Next with another 2-4 hours:

- Deploy to Render/Railway with a mounted disk or SQLite/Postgres
- Record the 3-5 minute walkthrough
- Add autosave and document version history
- Add Playwright coverage for the browser workflow
