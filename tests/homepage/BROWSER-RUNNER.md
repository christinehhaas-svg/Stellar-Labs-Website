# Browser validation

## Replit preview

Use the existing Stellar review and Canvas workflows and `pnpm test:homepage`.
This environment's installed Firefox/WebKit archives lack matching native
libraries; downloading the archives alone does not fix that. Do not skip an
engine, substitute Chromium, or disable host/TLS validation.

The full local command first checks that all three engines can create a page.
An unsupported host fails immediately instead of spending half an hour on a
suite that cannot finish. This preflight does not count as app verification;
the actual regression suite still has to pass on the compatible runner.

## Compatible runner

`.github/workflows/browser-tests.yml` uses Ubuntu 24.04, Node 24, locked pnpm
dependencies and `playwright install --with-deps`. Each engine runs as a separate
job, retaining its existing test scope. Failures remain failures; all engine jobs
continue so their reports are available.

The standalone CI preview starts the actual review and Canvas Vite configs with
their existing `/` and `/__mockup/` mounts. A local HTTP gateway reproduces the
preview routing, including WebSockets, without Replit's proxy, external preview
certificates, a database, or secrets. Asset preparation runs serially. The normal
managed preview configuration and snapshot sandbox permissions are unchanged.

To use this on a supported standalone Ubuntu host:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium firefox webkit
CI=true HOMEPAGE_TEST_STANDALONE=1 \
  HOMEPAGE_TEST_BASE_URL=http://127.0.0.1:18080 pnpm test:homepage
```

Once this project is pushed to a GitHub repository, the workflow runs on pull
requests and pushes to main/master, or manually from Actions → Website browser
checks. No GitHub repository is connected to the current workspace yet; adding
this workflow does not itself upload the project or run GitHub Actions.

Reports, screenshots and traces appear as per-engine workflow artifacts.
Check all three jobs before calling cross-browser validation complete.
