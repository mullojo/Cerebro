# Generic community outreach tool

Open `/projects/outreach/` from the Tools shelf. This public example contains
fictional, general-purpose templates and no contacts or saved correspondence.
Add your own contacts, edit templates, prepare personalized drafts, and copy text
to your mail service. This tool never sends email or calls a language model.

Saved contacts/templates/drafts use `/api/outreach` and local `data/outreach/`
snapshots. Attribution follows configured people; writes require the current
revision. Read shared changes before reconciling conflicts. Unsaved forms stay in
session storage. All of this runtime content is ignored by Git.

Use `npm run preview:outreach` for disposable testing. Edit view.html/app.js/model.js
and rebuild the Vue templates with `npm run build`. Only run trusted tools: they
share the local workspace API origin.
