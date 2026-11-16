# Versioning and releases

`package.json` is the version source; keep `package-lock.json` in sync. Git tags
use `vMAJOR.MINOR.PATCH`. During the 0.x playground, increment PATCH for fixes and
MINOR for features or incompatible changes. Document any data migration explicitly.
All releases remain GitHub prereleases until the project is ready for stable use.

## Prepare the next version

From alpha, use `npm version patch --no-git-tag-version` for a fix or
`npm version minor --no-git-tag-version` for a feature. This updates both package
files. Add `releases/vVERSION.md` with changes, setup instructions, and limitations.
Add its exact path to the root `public-files.json`, then run:

```sh
node scripts/public-release.js sync
npm run build
npm test
npm run check:public
git diff --check
```

Review and commit the public changes. From the repository root, replace VERSION
with the package version, then:

```sh
git tag -a vVERSION -m "Cerebro vVERSION"
git push --atomic origin main vVERSION
```

The tag starts the release workflow. It checks the tag against both package files,
requires release notes, audits the public files, rebuilds the UI, and runs tests.
Only after these pass does it create a GitHub prerelease with a ZIP generated from
the tagged Git tree and a SHA-256 checksum. It never archives the working folder.

Check the Actions run and release page before sharing a release. Published tags
are immutable by convention: fix errors in a new version rather than moving tags.
If publication fails, rerun the failed workflow after resolving its cause; do not
replace a published asset silently. No npm package is published.
