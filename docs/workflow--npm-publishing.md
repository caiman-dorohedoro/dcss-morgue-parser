# npm Publishing Workflow

This repository publishes the `dcss-morgue-parser` package from
`packages/parser`. The root workspace package stays `private: true` so the
workspace itself cannot be published to npm by accident.

## One-Time Setup

The npm package should use Trusted Publishing with GitHub Actions:

- Provider: `GitHub Actions`
- Organization/User: `caiman-dorohedoro`
- Repository: `dcss-morgue-parser`
- Workflow filename: `publish.yml`
- Environment name: leave empty unless GitHub environment approvals are needed

The workflow lives at `.github/workflows/publish.yml` and runs only when a tag
matching `v*` is pushed.

## Release Commands

Start from a clean working tree, apart from unrelated local files such as
`.vscode/` if they are intentionally untracked.

```bash
git status --short
npm version patch -w packages/parser --no-git-tag-version
git diff packages/parser/package.json package-lock.json
git add packages/parser/package.json package-lock.json
git commit -m "Release dcss-morgue-parser 0.6.7"
git tag v0.6.7
git push origin main
git push origin v0.6.7
```

Replace `0.6.7` with the version being released.

The important part is the final tag push. The publish workflow is triggered by
the tag push event, not by the release commit on `main`.

## Why Not Only `git push --follow-tags`

`git tag v0.6.7` creates a lightweight tag. `git push --follow-tags` only pushes
annotated tags that are missing from the remote, so it can leave the lightweight
release tag local. In that case GitHub never receives a tag push event, and the
npm publishing workflow does not run.

Use one of these instead:

```bash
git push origin v0.6.7
```

Or create an annotated tag and then use `--follow-tags`:

```bash
git tag -a v0.6.7 -m "Release v0.6.7"
git push --follow-tags
```

The explicit `git push origin v0.6.7` form is the least surprising release
command for this repository.

## Verification

After pushing the tag, check GitHub Actions for the `Publish npm` workflow.
If it does not appear, confirm the tag exists on the remote:

```bash
git ls-remote --tags origin v0.6.7
```

After the workflow succeeds, confirm npm shows the released version:

```bash
npm view dcss-morgue-parser version
```

## Local App Dependencies

The private workspace apps should depend on the local parser package with:

```json
"dcss-morgue-parser": "file:../../packages/parser"
```

Do not pin those app dependencies to the release version being published. During
a tag-triggered publish, the new package version is not available on npm yet.
If an app asks for that exact unpublished version, `npm ci` can try the npm
registry instead of the local workspace package and fail before publish runs.
