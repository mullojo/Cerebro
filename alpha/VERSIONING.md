# Versioning

`package.json` is the version source; keep `package-lock.json` in sync.
During the 0.x playground, increment PATCH for fixes and
MINOR for features or incompatible changes. Document any data migration explicitly.
The current version is 0.5.0, an early alpha.

## Prepare the next version

From alpha, use `npm version patch --no-git-tag-version` for a fix or
`npm version minor --no-git-tag-version` for a feature. This updates both package
files. Update the current version in the root README and add a dated entry to
`CHANGELOG.md` describing changes and limitations. Then run:

```sh
npm run build
npm test
npm run check:public
git diff --check
```

Review and commit the public changes. Version changes do not create tags,
publish GitHub releases, upload archives, or publish an npm package.
