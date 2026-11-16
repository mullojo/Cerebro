# Local browser tools

Copy `starter/` to a new lowercase directory, for example `projects/idea-board/`.
Edit its `view.html` Vue template and `app.js` native ES module. A project with an `index.html` appears
in Cerebro's Tools view automatically; open it at `/projects/idea-board/`.
No build is needed to open the included starter. After changing a Vue template or
theme, run `npm run build` (or `./node scripts/build-ui.js`) from alpha, then refresh. Generated `view.js` and
`index.html` belong alongside each project's source. The build discovers project
directories using `view.html`/`shell.html` automatically; plain HTML projects still work.

Use relative asset paths (`./app.js`, `./view.js`) so copies work independently.
Keep app logic browser-compatible. Place reusable pure modules under `src/` if
needed and add explicit asset routes in `server.js` for those modules. Node APIs
belong in server/storage adapters. This starter does not persist its demo state.
For state shared with chats, add a server endpoint backed by project files rather
than assuming localStorage is shared disk storage.

Only run local code you trust: projects share the workspace's local origin and
can access its API. Keep secrets and non-project files outside these served folders.

## Optional packages through esm.sh

Use explicit pinned URLs in external JS modules, for example:

```js
import confetti from 'https://esm.sh/canvas-confetti@1.9.3';
```

The server's script policy allows https://esm.sh. No import-map tag, bundler, npm,
or Node runtime is required for direct URL imports. Packages must support browser
APIs; a package needing Node filesystem APIs will not become browser-compatible
just by using esm.sh. Avoid unversioned `latest` imports. Keep shared dependency
versions consistent across projects. Remote imports require internet access on a
fresh load. The app and starter intentionally load Vue **3.5.45** from esm.sh and
Tailwind **4.3.5** from the official browser package on jsDelivr, by design.
Keep new projects on this stack and use the shared theme in `web/theme.css`.
Read `DESIGN.md` before changing design conventions. The build compiles templates
ahead of time, so no unsafe-eval script policy is needed. Tailwind injects styles
at runtime; the browser compiler is intended for this local alpha.
Node-side packages use package.json/package-lock.json; URL imports are for browser
modules. See https://esm.sh/ for browser URL options. Pure self-contained HTML
experiments can be server-free, but the starter's local ES modules and shared
workspace API use Cerebro's localhost bridge.
