# Cerebro

A local collaboration workspace for people and their AI assistants. Keep shared
knowledge, handoffs, tasks, decisions, and small browser tools in readable files.

This is an early playground, not a hosted service or autonomous agent platform.
The application does not call a model or send email. A coding assistant can use
its local CLI to read context and save work when the human asks.

## Try it

Install Node.js 22 or newer. From this repository:

```sh
cd alpha
npm start
```

Open http://127.0.0.1:4310. A fresh checkout starts with an empty workspace and
fictional example participants **Alex** and **Sam**. Vue, Tailwind, and Markdown
libraries load from pinned CDNs, so a fresh browser load needs internet access.
Starting the server requires no dependency installation or build step.

For a disposable demonstration with fictional notes and tasks:

```sh
cd alpha
npm run demo
```

Open the address printed by the command (port 4311). Ctrl+C stops the demo and
removes its temporary workspace. It does not touch your real workspace.

See [the application guide](alpha/README.md), [development guide](alpha/DESIGN.md),
and [publication/privacy guide](PUBLICATION.md).

## What you can try

- Browse Markdown knowledge by project folders and tags.
- Assign tasks and pass context to another participant's inbox.
- Record human decisions and inspect the structured change history.
- Use a browser tool starter and a generic outreach drafting tool.
- Work through the same local API from the browser and assistant-facing CLI.
- Remember the selected participant in IndexedDB, with forest or magenta themes.

## Publication boundary

This repository deliberately includes only the files listed in `public-files.json`.
Real knowledge, event history, contacts, drafts, local configuration, research,
private tools, and browser captures are excluded by default. The publication
checker compares Git's candidate files with that list and scans public text for
common secret formats and machine paths. It cannot prove arbitrary prose is safe:
review each intentional addition before publishing.

No grant application, private correspondence, or participant dataset is included.

## License

MIT. See [LICENSE](LICENSE). This describes the released software; dependencies
retain their respective licenses. Private local workspace content is not a public
sample dataset.
