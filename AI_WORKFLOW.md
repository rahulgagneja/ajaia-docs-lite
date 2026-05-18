# AI Workflow Note

## Tools Used

- OpenAI Codex in the desktop coding environment for implementation planning, code generation, editing, and test iteration.
- Local shell and Node test runner for verification.

## Where AI Sped Up the Work

AI helped turn the ambiguous assignment into a scoped product slice quickly: dependency-free Node server, JSON persistence, seeded-user sharing, contenteditable rich text, and reviewer-facing documentation. It also accelerated boilerplate creation across the API, UI, tests, and Markdown deliverables.

## Output Changed or Rejected

I kept the stack simpler than a typical AI-generated Next.js or React scaffold because this environment had restricted package access and the assignment benefits from easy local review. I also avoided overbuilding real-time collaboration, full authentication, or a database migration layer. Those are valuable product directions, but not the strongest use of a 4-6 hour assignment window.

## Verification

- Ran the automated test suite with Node's built-in test runner.
- Covered document create/edit/reopen persistence.
- Covered unshared access denial and owner-granted sharing.
- Covered `.md`/text import creating an editable document.
- Reviewed the UI flow for clear owner/shared distinction, visible seeded users, supported upload types, and save/share status feedback.

Known limitation: I did not complete an external deployment or video recording from this local coding environment. The repository includes deployment instructions and placeholder submission files for those links.
