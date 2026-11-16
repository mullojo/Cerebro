# Cerebro UI design guide

The interface should make two-person collaboration feel calm and concrete. Keep
the person-specific palette, clear ownership, visible next actions, and honest state.
Frameworks provide consistency; they do not guarantee perfect UX.

## Stack and editing

- Vue **3.5.45** via `https://esm.sh/vue@3.5.45` in native ES modules.
- Tailwind CSS **4.3.5** via the pinned official browser package on jsDelivr.
- Vue components: App, RecordCard, EmptyState, AppIcon. Templates live in
  `web/views/`; reactive behavior lives in `web/app.js`.
- Theme tokens and common controls live in `web/theme.css`; all layout and
  components use Tailwind utilities or `@apply` utilities. Avoid a competing
  stylesheet, per-screen spacing systems, or raw inline presentation styles.
- `npm run build` (or `./node scripts/build-ui.js`) precompiles Vue templates and embeds theme CSS in shells.
  The compiler is build-only and lockfile-pinned. Runtime Vue/Tailwind remain CDNs.

## Design decisions

| Area | Rule |
| --- | --- |
| Palette | The forest theme: forest/ivory/moss. The magenta theme: plum/magenta/blush. Shared layout and semantic status colors. |
| Type | System sans for controls/body; local serif for page headings and counts; no font CDN |
| Body text | 14px+ with generous line height; metadata 10–12px, secondary but readable |
| Spacing | Tailwind's 4px scale; 16/20/24px panels, 28–48px page padding |
| Surfaces | Thin borders, subtle shadows, 8px controls, 16px panels/dialogs |
| Icons | Consistent 24px SVG viewBox, 1.6px strokes; never emoji for action meaning |
| Targets | Primary controls and navigation at least 44px; no information hidden only on hover |
| Focus | Visible 2px forest outline with offset; native dialog containment and Escape |
| Motion | Small color/position transitions; respect prefers-reduced-motion |
| Status | Explicit words plus color; distinguish open/doing/blocked/done |

## Responsive behavior

At desktop widths (1024px+) use the fixed sidebar. It scrolls if the viewport is
short; decorative content hides below 850px in height so identity stays reachable.
Below 1024px use a complete native-dialog drawer, not a clipped horizontal menu.
At small widths use stacked headings, full-width search, wrapped filters, and
single-column cards. Summary counts use two columns, expanding to four at 1280px.
Dialogs fit viewport height and scroll internally. While a native modal is open,
lock page scrolling and contain scroll within the dialog. Backdrop clicks do not
dismiss dialogs; use Close or Escape. The reader expands to 56rem on desktop;
use a near-opaque theme-colored backdrop to quiet the surrounding workspace;
leave spacing between its view controls and the content divider. No horizontal page overflow.

## Interaction rules

- Ask for identity before writing; browsing shared context is allowed first.
- Use contextual actions: New task, New note, Send a handoff, Record a decision.
- Keep incomplete drafts per person/kind in the current tab. Save clears that draft.
- Disable duplicate submissions and show saving/error/success feedback.
- Filter completed tasks and superseded decisions explicitly; keep them discoverable.
- On revision conflict preserve the reason, show current status/revision, and
  require Review current version. Never silently retry with a newer revision.
- Pause automatic refresh while a dialog is open. Refresh after a successful save.
- Render Markdown only through `web/markdown.js`: Marked 17.0.6, then DOMPurify 3.4.17 with a restricted tag/attribute allowlist. The MarkdownContent component is the only HTML sink. Source view stays escaped; never insert unsanitized user HTML.
- Open dialogs without blur or animation. Warm static Tailwind classes at startup. Buffer draft storage writes and flush on close/pagehide.
- Every view needs an honest loading, empty, filtered-empty, and disconnected state.
- Keyboard shortcut `/` focuses search outside forms. Navigation URLs use hashes.

## Verification

`npm test` (or `./node --test tests/*.test.js`) covers persistence, concurrency, revision checks, API assets,
and view filtering. `npm run preview` (or `./node scripts/preview.js`) provides disposable data for browser QA.
Check actual dimensions (including 320px/390px and desktop), drawer/dialog focus,
drafts, saves, cross-tab conflict recovery, and the starter's interaction. Save
screenshots of the real workspace for the handoff. Keep real inboxes free of tests.

CDN browser compilation is a deliberate local-alpha choice. For a public release,
compile Tailwind to static CSS and review dependency delivery and accessibility
with dedicated tooling; the current checks are not a formal accessibility audit.

## Knowledge browser

Tools names the runnable browser shelf (existing projects/ paths remain stable).
Knowledge contains project folders with expandable topic folders, breadcrumbs,
and tag filters. Top-level knowledge folders are projects; root notes stay shared.
Show folders beside notes at wide desktop widths and stack them on narrow screens.
Folder filtering includes descendants; tags intersect the chosen folder and search.
Use existing files as the source of truth; retain empty folders and ignore symlinks.

## Person themes

The remembered IndexedDB person selects the theme on startup. Changing the person
switches it immediately. `data-theme="magenta"` overrides the shared Tailwind color
tokens in `web/theme.css`; The forest theme and unselected browsing use the forest defaults.
Canvas, paper, text, borders, actions, selection, dropdown arrows, focus, and dialog
backdrops all follow the palette. Status/error colors retain their meaning.
Tools restore the profile theme through `/identity.js`; the outreach tool also
updates it when its editing person changes. New tools can call restorePersonTheme.
