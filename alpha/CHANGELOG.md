# Changelog

## 0.5.0 — 2026-11-15

A local playground for shared knowledge and collaboration between people and
their AI assistants. This version establishes the public, MIT-licensed baseline.

## Included

- Markdown knowledge organized by nested project folders and tags.
- Tasks, handoffs with recipient acknowledgments, and human decision records.
- Shared file storage, revision checks, and a CLI using the same local API as the UI.
- Formatted Markdown, focused dialogs, remembered participants, and two themes.
- A browser tool starter, generic outreach drafting tool, and disposable demo.
- Explicit public-file allowlist and publication checks that exclude private data.

## Try it

Install Node.js 22 or newer, download or clone the repository, and run:

```sh
cd alpha
npm start
```

Open http://127.0.0.1:4310. No dependency installation or build is needed to start.
Use `npm run demo` for fictional sample content on port 4311. New workspaces start
with fictional participants Alex and Sam and contain no private notes or contacts.

## Alpha limitations

This is a trusted local workspace without production multi-user authentication
or encrypted storage. Fresh browser loads require internet for pinned CDN assets.
The app does not run an AI model, relay chats automatically, or send email.
Back up local files before experimenting. See README.md and PUBLICATION.md.
