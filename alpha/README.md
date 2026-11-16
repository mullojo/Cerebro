# Cerebro alpha

Local collaboration for people and their assistants. Node.js 22+ serves a
Vue 3.5.45 / Tailwind CSS 4.3.5 browser UI. Frameworks load from pinned CDNs;
no account, hosted backend, database, or model API key is needed.

## Start and develop

```sh
npm start                 # http://127.0.0.1:4310
npm run demo              # disposable fictional data at port 4311
npm ci                    # install build-only template compiler
npm run build             # compile templates and embed shared theme
npm test                  # tests use temporary workspaces
npm run check:public      # audit the intended publication files
```

macOS users can double-click `start.command`. `./node` uses Node on PATH, or the
coding environment's bundled Node when available. Included generated files let
people start without building. Edit `web/views/`, `web/app.js`, and `web/theme.css`,
then rebuild; do not hand-edit `web/generated/` or generated index/view files.
Restart after backend/configuration changes. Refresh after browser changes.

## Your people

A fresh clone uses fictional Alex and Sam. To personalize a local installation,
copy `workspace.example.json` to **`workspace.local.json`** and edit the people.
The local file is ignored and excluded from public exports. Keep IDs stable once
they appear in records. Configure at least two people with unique lowercase IDs,
display names, and either `forest` or `magenta` themes. Optional aliases preserve
existing attribution names. Restart after changes. The browser remembers the
selected person in IndexedDB for this app origin and browser profile.

Names identify contributions; they are not authentication. Everyone with access
to this local workspace can read its records. Regular windows in one browser
profile share the remembered preference. Private browsing or clearing site data
can remove it. Unsaved editor drafts stay per-tab in session storage.

## Knowledge, tasks, and tools

- **Knowledge:** Markdown notes under `knowledge/`; folders represent projects
  and topics. Folder selection includes descendants. Tags intersect folder/search
  filters. Add a metadata line such as `Tags: research, emails`, or use the form.
- **Tasks:** An owner, a concrete outcome, and open/doing/blocked/done status.
- **Handoffs:** Recipient-addressed context. Acknowledgment means received, not
  agreement or completion.
- **Decisions:** Actual human choices and their rationale; keep proposals distinct.
- **Inbox:** Unacknowledged handoffs and unfinished assigned tasks.
- **Tools:** Runnable browser apps under `projects/`. The directory name is retained
  for compatibility. A starter and generic outreach tool ship in the public repo.

Fresh workspaces contain no private notes or contacts. Folders and event storage
are created as needed. The demo's fictional data is temporary and opt-in.

## Use with a coding assistant

Start the server, then tell your chat which configured person you are and ask it
to read `AGENTS.md`. Chats do not wake automatically or read each other's history.
They use this CLI or API to exchange explicit context. From alpha:

```sh
./node bin/cerebro.js status
./node bin/cerebro.js inbox alex
./node bin/cerebro.js notes --folder 'Example Project' --tag research --json
./node bin/cerebro.js task --actor alex --to sam --title 'Review the idea' --body 'Context and what done means.'
./node bin/cerebro.js message --actor alex --to sam --title 'A handoff' --body 'Evidence and one next action.'
./node bin/cerebro.js note --actor sam --title 'Findings' --folder 'Example Project/Research' --tags research --body 'Findings and sources.'
./node bin/cerebro.js show RECORD_ID
./node bin/cerebro.js update RECORD_ID --actor sam --expect 1 --status done --reason 'Reviewed and completed.'
./node bin/cerebro.js --help
```

Substitute your configured IDs. Use returned IDs and current revisions; on a
conflict, read the latest record and reconcile. Longer details support
`--body-file`. See [the collaboration exercise](examples/first-collaboration.md).

## Storage and boundaries

Knowledge lives in `knowledge/`. Immutable structured events live in
`data/events/`; outreach snapshots in `data/outreach/`. These directories are
private runtime data, not repository assets. Only the server writes structured
state. It queues writes and checks revisions while owning `data/.writer-lock`.
Never edit journal events or remove a live server's lock.

After a crash, read `data/.writer-lock/owner.json`, verify its PID is no longer a
Cerebro server, and recover only that stale lock. Back up your workspace while
writers are idle. Markdown edits have no automatic version history. Reread before
editing others' notes. This is a single-computer protocol; file synchronization
software does not provide cross-computer locking.

By default the server binds to 127.0.0.1:4310. Set `CEREBRO_ROOT` and `PORT` for
an alternate workspace; local configuration and data are read from that root.
Pass `--url http://127.0.0.1:PORT` to the CLI for a different port. Browser tools
are discovered in that workspace's `projects/` folder.

Tools share the local API origin: run trusted code only. Keep secrets out of
served files. Stored Markdown is sanitized before rendering. Local storage is
not encryption, and content given to an external assistant follows that service's
policies. API responses are not an authenticated private multi-user service.

## Publication

Use the repository root as your GitHub Desktop repository, and read
[PUBLICATION.md](../PUBLICATION.md). `public-files.json` and generated ignore rules
make publication opt-in for each file. Adding data under an ignored directory
never deliberately publishes it. Force-add can override Git ignore rules, so run
the publication audit and inspect GitHub Desktop's changes before committing.
Never use a ZIP of the working directory as a public release.
