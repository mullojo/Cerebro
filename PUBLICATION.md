# Public repository and private workspace

Create the GitHub Desktop repository at the **Cerebro root**, the directory that
contains this file and alpha/. Do not publish a ZIP of this working folder.
The maintained public code uses fictional example people and generic templates.

## What is excluded

The ignore rules deny every file unless explicitly listed in public-files.json.
They protect current and future unlisted files, including:

- alpha/knowledge/: private project notes and shared knowledge.
- alpha/data/: events, contacts, templates, email drafts, snapshots, and locks.
- alpha/workspace.local.json: real participant IDs, names, aliases, and themes.
- alpha/research/ and alpha/people/: internal analysis and personal chat setup.
- Existing private tools and any newly created tool that has not been reviewed.
- Screenshots, recordings, exports, archives, node_modules, runtime caches, editor
  settings, logs, environment files, tokens, and credentials.

The root and alpha ignore files are generated from one manifest. Nested Git repos
inside private directories are not a publication mechanism. Do not force-add files.
A local service still reads private files on this computer; Git ignore does not
hide them from the locally running app or from someone who can access your disk.

## Before the first commit

From alpha:

```sh
npm run build
npm run check:public
```

Inspect GitHub Desktop's Changes list. It should contain only the reviewed public
files. No history, notes, contacts, local config, screenshots, or private tools
should appear. The checker also rejects tracked-but-ignored files if someone
force-added them. There is no repository initialized by the preparation tooling.

For the strongest boundary, export a clean directory and initialize GitHub Desktop
**there** instead of in your daily private workspace:

```sh
npm run export:public -- /absolute/path/to/an/empty/cerebro-public
```

Only reviewed files are copied, with executable launchers preserved. Private data
is not copied. Later changes must be re-exported into a fresh empty directory or
reviewed deliberately; the exporter does not overwrite an existing checkout.

## Intentional additions

Review a new source/example file for personal material, then add its exact path
to public-files.json. Regenerate rules and audit:

```sh
node scripts/public-release.js sync
npm run check:public
```

The scan catches common credential formats, non-example emails, local machine
paths, private conversation links, and names drawn from local configuration and
project folders when available. It prints paths and issue categories, not matched
secrets. It is not a substitute for reading your own new content. Generic prose
can still contain confidential facts without triggering a pattern.

CI audits tracked files and runs the tests. An external CI check runs after push,
so it cannot undo a leak: run the checker locally before the first commit/push.
Once sensitive data is published, removing it from the latest revision is not
enough to remove it from Git history; rotate affected credentials and address the
history. The current preparation creates no commits or remote repository.

## What a new visitor gets

An empty local workspace, fictional participants, the browser starter, and a
generic outreach tool with example templates. The synthetic demo is opt-in and
uses a temporary directory. There are no imported private notes or contacts.
Application data is created locally and stays ignored. CDN dependencies require
internet for fresh browser loads. This is a trusted local alpha, not production
multi-user authentication or an encrypted storage system.

The public software is MIT licensed. Keep private workspace content out of public
artifacts and do not imply the MIT release includes permission to reuse real
correspondence or contact data.
