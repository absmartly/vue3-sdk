# Contributing to the A/B Smartly JavaScript SDK

The A/B Smartly JavaScript SDK is an open source project and we welcome your feedback and contributions.
The information below describes how to build and test the project, and how to submit a pull request.

## Development

### Development process

1. Fork the repository and create a topic branch from `main` branch. Please use a descriptive name for your branch.
2. While developing, use descriptive messages in your commits. Avoid short or meaningless sentences like: "fix bug".
3. Make sure to add tests for both positive and negative cases.
4. Run the linter script of the project and fix any issues you find.
5. Run the build script and make sure it runs with no errors.
6. Run all tests and make sure there are no failures.
7. `git push` your changes to GitHub within your topic branch.
8. Open a Pull Request from your forked repo and into the `main` branch of the original repository.
9. When creating your PR, please fill out all the fields of the PR template, as applicable, for the project.
10. Check for conflicts once the pull request is created to make sure your PR can be merged cleanly into `main`.
11. Keep an eye out for any feedback or comments from A/B Smartly's SDK team.

### Building the SDK

For widespread use of the SDK with different environments and module formats, we have these different builds:
* A bundled **UMD** file for browsers (IE 10+).
* A **CommonJS** modules compatible build.

The different builds can be generated all at once with the command `npm run build`. Refer to [package.json](package.json) for more insight on the build scripts.

### Running tests

The project includes unit tests for both browser and Node.js environments.

All tests can be run at once with the command `npm run test`.

For additional testing scripts or to get more insight on how these work, please refer to our [package.json](package.json) file.

### Linting and other useful checks

Consider running the linter script (`npm run lint`) and fixing any issues before pushing your changes.

If you want to debug your changes consuming it from a test application, you could:
- For browsers, import the **UMD** bundle from an HTML document. To debug you can use the browser dev tools.
- For Node, you could use symlinks via [npm link command](https://docs.npmjs.com/cli/link.html) and then import the package as usual. To debug you could use the [Node inspector](https://nodejs.org/en/docs/guides/debugging-getting-started/).

### Releasing

Releases are published to npm by the [Publish workflow](.github/workflows/publish.yml) using npm Trusted Publishing (OIDC, with provenance); no npm token is needed locally.

1. Bump `version` in `package.json` (and `package-lock.json`) on `main` through a pull request.
2. Tag the merged commit on `main`, not your local `HEAD`, with a tag that matches the version exactly: `git fetch origin main && git show origin/main:package.json | grep '"version"'`, then `git tag v1.2.3 origin/main && git push origin v1.2.3`.
3. The workflow lints, tests and builds, then fails unless the tag equals `v` + the `package.json` version. Only plain `MAJOR.MINOR.PATCH` versions are published; prereleases (e.g. `1.2.3-beta.1`) are refused.
4. A version below the highest version on npm (the current `latest`, any other dist-tag, or any stable non-deprecated version, which is what `npm publish` itself checks) never becomes `latest`, and no dist-tag is ever moved to an older version. An older major is published under `latest-<major>` (e.g. `1.4.1` after `2.0.0` gets `latest-1`); if `latest-<major>` already points to a newer version, or the version is an older minor or patch line of the latest major (e.g. `1.1.1` after `1.2.0`), it is published under `latest-<major>.<minor>` (e.g. `latest-1.1`). If that tag also points to a newer version, the release fails. (npm rejects `v1`-style tag names because they are valid semver ranges.) Releases run one at a time, in the order they were queued.

To rehearse a release, run the Publish workflow manually from the Actions tab; `dry_run` defaults to `true` and runs every step except the publish.

# Contact

If you have any other questions or need to contact us directly we can be reached at sdk@absmartly.com
